import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import {
  addExercisesToWorkout,
  db,
  previousSets,
  recomputePrs,
  restFor,
  type Exercise,
  type Workout,
  type WorkoutSet,
} from '../db';
import { fmtRest, fmtSet, fmtWeight } from '../format';
import { showPrBanner } from '../prBanner';
import { describePr } from '../prs';
import { startRest, stopRest } from '../restTimer';
import { useSettings } from '../settings';
import { showToast } from '../toast';
import { parseAlternatives, type Command, type ParsedSet } from './parse';
import { errorMessage, Handsfree, listenOnce, speak, speechSupported, spokenRest } from './speech';

type Undo = () => Promise<void>;

export interface VoiceState {
  supported: boolean;
  activeExerciseId?: number;
  activeLabel: string;
  interim: string;
  lastResult: string;
  listening: boolean;
  handsfree: boolean;
  error: string;
}

/** Voice control for one workout: recognition, command execution and undo. */
export function useVoice(workout: Workout) {
  const settings = useSettings();
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id).toArray(), [workout.id]);
  const [chosen, setChosen] = useState<number | undefined>();
  const [interim, setInterim] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [listening, setListening] = useState(false);
  const [handsfree, setHandsfree] = useState(false);
  const [error, setError] = useState('');
  const undo = useRef<Undo[]>([]);
  const hf = useRef<Handsfree | null>(null);
  const stopOnce = useRef<(() => void) | null>(null);

  // Default target: the first exercise that still has open sets.
  const openFirst = workout.exerciseIds.find((id) => sets?.some((s) => s.exerciseId === id && !s.done));
  const activeExerciseId =
    chosen != null && workout.exerciseIds.includes(chosen) ? chosen : (openFirst ?? workout.exerciseIds[0]);
  const activeEx = exercises?.find((e) => e.id === activeExerciseId);
  const doneWork = sets?.filter((s) => s.exerciseId === activeExerciseId && s.done && !s.warmup).length ?? 0;
  const activeLabel = activeEx ? `${activeEx.name}, set ${doneWork + 1}` : 'Geen oefening';

  // Recognition callbacks outlive renders; always read the latest values through a ref.
  const latest = useRef({ workout, exercises, sets, activeExerciseId, settings });
  latest.current = { workout, exercises, sets, activeExerciseId, settings };

  useEffect(() => () => hf.current?.stop(), []);

  function confirm(text: string, spoken?: string) {
    setLastResult(text);
    setInterim('');
    if (spoken && latest.current.settings.voiceSpeak) {
      hf.current?.pause();
      speak(spoken, () => hf.current?.resume());
    }
  }

  async function logSets(exercise: Exercise, parsed: ParsedSet[]) {
    let w = (await db.workouts.get(latest.current.workout.id))!;
    if (!w.exerciseIds.includes(exercise.id)) {
      await addExercisesToWorkout(w, [exercise]);
      w = (await db.workouts.get(w.id))!;
    }
    setChosen(exercise.id);
    const originals: WorkoutSet[] = [];
    const created: number[] = [];
    const prev = await previousSets(exercise.id, w.id);
    let last: WorkoutSet | undefined;

    for (const p of parsed) {
      const all = (await db.sets.where({ workoutId: w.id, exerciseId: exercise.id }).toArray()).sort(
        (a, b) => a.order - b.order,
      );
      const open = all.filter((s) => !s.done);
      let target = open.find((s) => !!s.warmup === !!p.warmup) ?? (p.warmup ? undefined : open[0]);
      if (!target) {
        const id = await db.sets.add({
          workoutId: w.id,
          exerciseId: exercise.id,
          order: Math.max(-1, ...all.map((s) => s.order)) + 1,
          weight: null,
          reps: null,
          done: false,
          warmup: p.warmup,
        } as WorkoutSet);
        created.push(id);
        target = (await db.sets.get(id))!;
      } else {
        originals.push(target);
      }
      const workIndex = all.filter((s) => !s.warmup && s.order < target!.order).length;
      const before = prev[workIndex] ?? prev[prev.length - 1];
      const patch: Partial<WorkoutSet> = {
        weight: p.weight ?? target.weight ?? last?.weight ?? before?.weight ?? null,
        reps: p.reps ?? target.reps ?? before?.reps ?? null,
        done: true,
        doneAt: Date.now(),
        warmup: p.warmup || target.warmup,
        failure: p.failure,
        rir: p.rir,
        rpe: p.rpe,
      };
      await db.sets.update(target.id, patch);
      last = { ...target, ...patch } as WorkoutSet;
    }
    if (!last) return;

    undo.current.push(async () => {
      await db.sets.bulkDelete(created);
      await db.sets.bulkPut(originals);
      await recomputePrs(w.id, exercise.id);
    });

    const rest = restFor(w, exercise);
    const restSeconds = last.warmup ? Math.min(60, rest) : rest;
    startRest(restSeconds);
    const fresh = await recomputePrs(w.id, exercise.id);
    const pr = fresh[fresh.length - 1];
    if (pr?.pr) showPrBanner({ exercise: exercise.name, ...describePr(pr, pr.pr) });

    const after = await db.sets.where({ workoutId: w.id, exerciseId: exercise.id }).toArray();
    const number = after.filter((s) => s.done && !s.warmup).length;
    const label = last.warmup ? `${exercise.name}, warming-up` : `${exercise.name}, set ${number}`;
    const text = `${label}: ${fmtSet(last)}`;
    showToast(parsed.length > 1 ? `${parsed.length} sets ingevuld (${exercise.name})` : text, undoLast);
    const spokenSet = `${last.weight ? `${fmtWeight(last.weight)} kilo, ` : ''}${last.reps} reps`;
    confirm(text, `${label}: ${spokenSet}. Rust ${spokenRest(restSeconds)}.`);
  }

  async function undoLast() {
    const fn = undo.current.pop();
    if (!fn) {
      confirm('Niets om ongedaan te maken');
      return;
    }
    await fn();
    confirm('Ongedaan gemaakt');
  }

  async function run(cmd: Command, transcript: string) {
    const { workout: w, exercises: list = [], activeExerciseId: active } = latest.current;
    const byId = (id?: number) => list.find((e) => e.id === id);
    switch (cmd.type) {
      case 'sets': {
        const ex = byId(cmd.exerciseId ?? active);
        if (!ex) return confirm('Voeg eerst een oefening toe');
        return logSets(ex, cmd.sets);
      }
      case 'rest':
        startRest(cmd.seconds);
        return confirm(`Rust ${fmtRest(cmd.seconds)}`);
      case 'stopTimer':
        stopRest();
        return confirm('Timer gestopt');
      case 'nextExercise':
      case 'prevExercise': {
        const ids = w.exerciseIds;
        const i = Math.max(0, ids.indexOf(active ?? ids[0]));
        const next = ids[Math.min(ids.length - 1, Math.max(0, i + (cmd.type === 'nextExercise' ? 1 : -1)))];
        setChosen(next);
        return confirm(byId(next)?.name ?? '');
      }
      case 'selectExercise':
      case 'addExercise': {
        const ex = byId(cmd.exerciseId);
        if (!ex) return confirm(`Oefening “${cmd.type === 'addExercise' ? cmd.query : transcript}” niet gevonden`);
        if (!w.exerciseIds.includes(ex.id)) {
          await addExercisesToWorkout(w, [ex]);
          undo.current.push(async () => {
            const cur = (await db.workouts.get(w.id))!;
            await db.workouts.update(w.id, { exerciseIds: cur.exerciseIds.filter((id) => id !== ex.id) });
            await db.sets.where({ workoutId: w.id, exerciseId: ex.id }).delete();
          });
          showToast(`${ex.name} toegevoegd`, undoLast);
        }
        setChosen(ex.id);
        return confirm(ex.name);
      }
      case 'undo':
        return undoLast();
      case 'stopListening':
        hf.current?.stop();
        return confirm('Gestopt met luisteren');
      case 'unknown':
        return confirm(`Niet begrepen: “${transcript}”`);
    }
  }

  function context() {
    const { sets: all = [], activeExerciseId: active, exercises: list = [] } = latest.current;
    const done = all.filter((s) => s.done && !s.warmup).sort((a, b) => (a.doneAt ?? 0) - (b.doneAt ?? 0));
    const lastSet = [...done].reverse().find((s) => s.exerciseId === active) ?? done[done.length - 1];
    return { exercises: list, lastSet: lastSet ? { weight: lastSet.weight, reps: lastSet.reps } : undefined };
  }

  async function handle(alternatives: string[]) {
    if (!alternatives.length) return;
    const { command, transcript } = parseAlternatives(alternatives, context());
    await run(command, transcript);
  }

  function talkOnce() {
    if (!speechSupported()) return setError('Spraakherkenning wordt hier niet ondersteund. Typ je set hieronder.');
    hf.current?.stop();
    stopOnce.current?.();
    setError('');
    setInterim('');
    setListening(true);
    stopOnce.current = listenOnce({
      onInterim: setInterim,
      onFinal: (alts) => {
        setListening(false);
        void handle(alts);
      },
      onError: (code) => {
        setListening(false);
        setError(errorMessage(code));
      },
      onEnd: () => setListening(false),
    });
  }

  function startHandsfree() {
    if (!speechSupported()) return setError('Spraakherkenning wordt hier niet ondersteund. Typ je set hieronder.');
    stopOnce.current?.();
    setError('');
    hf.current = new Handsfree({
      onInterim: setInterim,
      onFinal: (alts) => void handle(alts),
      onStop: (reason) => {
        setHandsfree(false);
        setInterim('');
        if (reason) setError(reason);
      },
    });
    hf.current.start();
    setHandsfree(true);
  }

  function stopHandsfree() {
    hf.current?.stop();
  }

  const state: VoiceState = {
    supported: speechSupported(),
    activeExerciseId,
    activeLabel,
    interim,
    lastResult,
    listening,
    handsfree,
    error,
  };

  return {
    state,
    choose: setChosen,
    talkOnce,
    startHandsfree,
    stopHandsfree,
    undoLast,
    submitText: (text: string) => handle([text]),
  };
}

export type VoiceControl = ReturnType<typeof useVoice>;
