import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import {
  addExercisesToWorkout,
  db,
  deleteSet,
  deleteWorkout,
  duplicateSet,
  finishWorkout,
  previousSets,
  removeExerciseFromWorkout,
  restFor,
  type Exercise,
  type Workout,
  type WorkoutSet,
} from '../db';
import { ActionSheet, type Action } from '../components/ActionSheet';
import { ExerciseInfo } from '../components/ExerciseInfo';
import { ExercisePicker } from '../components/ExercisePicker';
import { NoteBlock, NoteSheet } from '../components/NoteSheet';
import { ProgressSheet } from '../components/ProgressSheet';
import { RestBar } from '../components/RestBar';
import { RestSheet } from '../components/RestSheet';
import { Thumb } from '../components/Thumb';
import { fmtDuration, fmtRest, fmtSet, fmtWeight, parseNum } from '../format';
import { startRest, stopRest } from '../restTimer';
import { showToast } from '../toast';
import { useNow } from '../useNow';

export interface Pr {
  exercise: string;
  weight: number;
  reps: number;
}

interface Props {
  workout: Workout;
  onMinimize: () => void;
  onFinished: (workoutId: number, prs: Pr[]) => void;
}

export function WorkoutScreen({ workout, onMinimize, onFinished }: Props) {
  const now = useNow();
  const [picking, setPicking] = useState(false);
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id).toArray(), [workout.id]);

  async function finish() {
    const all = sets ?? [];
    const done = all.filter((s) => s.done);
    if (done.length === 0) {
      if (confirm('Je hebt nog geen sets afgevinkt. Workout verwijderen?')) {
        await deleteWorkout(workout.id);
        stopRest();
      }
      return;
    }
    const open = all.length - done.length;
    if (open > 0 && !confirm(`${open} set(s) zijn niet afgevinkt en worden niet opgeslagen. Afronden?`)) return;
    const prs = await findPrs(workout.id, done);
    await finishWorkout(workout.id);
    stopRest();
    onFinished(workout.id, prs);
  }

  async function cancel() {
    if (!confirm('Workout annuleren? Alles van deze training wordt verwijderd.')) return;
    await deleteWorkout(workout.id);
    stopRest();
  }

  return (
    <div className="screen workout">
      <header className="topbar">
        <button className="link" onClick={onMinimize} aria-label="Minimaliseren">
          ⌄
        </button>
        <div className="topbar-title">
          <input
            className="title-input"
            value={workout.name}
            onChange={(e) => db.workouts.update(workout.id, { name: e.target.value })}
          />
          <span className="small muted">{fmtDuration(now - workout.startedAt)}</span>
        </div>
        <button className="btn primary small-btn" onClick={finish}>
          Klaar
        </button>
      </header>

      <main className="content">
        {workout.exerciseIds.length === 0 && <p className="empty">Voeg je eerste oefening toe om te beginnen.</p>}
        {workout.exerciseIds.map((exId) => (
          <ExerciseCard
            key={exId}
            workout={workout}
            exerciseId={exId}
            sets={(sets ?? []).filter((s) => s.exerciseId === exId).sort((a, b) => a.order - b.order)}
          />
        ))}
        <button className="btn secondary block" onClick={() => setPicking(true)}>
          + Oefening toevoegen
        </button>
        <button className="btn danger-text block" onClick={cancel}>
          Workout annuleren
        </button>
      </main>

      <RestBar />

      {picking && (
        <ExercisePicker
          exclude={workout.exerciseIds}
          onClose={() => setPicking(false)}
          onConfirm={async (list) => {
            setPicking(false);
            await addExercisesToWorkout(workout, list);
          }}
        />
      )}
    </div>
  );
}

type Overlay = 'menu' | 'info' | 'note' | 'rest' | 'progress' | null;

function ExerciseCard({ workout, exerciseId, sets }: { workout: Workout; exerciseId: number; sets: WorkoutSet[] }) {
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const prev = useLiveQuery(() => previousSets(exerciseId, workout.id), [exerciseId, workout.id]) ?? [];
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [setMenu, setSetMenu] = useState<WorkoutSet | null>(null);
  const rest = restFor(workout, exercise);

  // Work sets are numbered 1, 2, 3; warm-ups show "W" and don't count.
  const labels: string[] = [];
  const workIndex: number[] = [];
  let n = 0;
  for (const s of sets) {
    if (s.warmup) {
      labels.push('W');
      workIndex.push(-1);
    } else {
      labels.push(String(++n));
      workIndex.push(n - 1);
    }
  }

  async function addSet() {
    const last = sets[sets.length - 1];
    const p = prev[n];
    await db.sets.add({
      workoutId: workout.id,
      exerciseId,
      order: (last?.order ?? -1) + 1,
      weight: last && !last.warmup ? last.weight : (p?.weight ?? last?.weight ?? null),
      reps: last && !last.warmup ? last.reps : (p?.reps ?? last?.reps ?? null),
      done: false,
    } as WorkoutSet);
  }

  async function toggle(set: WorkoutSet, index: number) {
    if (set.done) {
      await db.sets.update(set.id, { done: false, doneAt: undefined });
      return;
    }
    // Empty fields fall back to what you did last time (shown as placeholder).
    const p = workIndex[index] >= 0 ? prev[workIndex[index]] : undefined;
    const weight = set.weight ?? p?.weight ?? null;
    const reps = set.reps ?? p?.reps ?? null;
    if (reps == null) return;
    await db.sets.update(set.id, { weight, reps, done: true, doneAt: Date.now() });
    if (!set.warmup) {
      // Carry the weight down to the following work sets you haven't filled in yet.
      const later = sets.slice(index + 1).filter((s) => !s.done && !s.warmup && s.weight == null);
      await Promise.all(later.map((s) => db.sets.update(s.id, { weight })));
    }
    startRest(set.warmup ? Math.min(60, rest) : rest);
  }

  async function removeExercise() {
    if (confirm(`${exercise?.name ?? 'Oefening'} uit deze workout verwijderen?`)) {
      await removeExerciseFromWorkout(workout, exerciseId);
    }
  }

  const menu: Action[] = [
    { label: 'Uitvoering bekijken', onClick: () => setOverlay('info') },
    { label: exercise?.note ? 'Notitie bewerken' : 'Notitie toevoegen', onClick: () => setOverlay('note') },
    { label: `Rusttijd: ${fmtRest(rest)}`, onClick: () => setOverlay('rest') },
    { label: 'Voortgang bekijken', onClick: () => setOverlay('progress') },
    { label: 'Oefening verwijderen', onClick: removeExercise, danger: true },
  ];

  return (
    <section className="card exercise-card">
      <div className="card-header">
        <Thumb exercise={exercise} onClick={() => setOverlay('info')} />
        <div className="grow">
          <h3>{exercise?.name ?? '…'}</h3>
          <span className="small muted">Rust {fmtRest(rest)}</span>
        </div>
        <button className="icon-btn" onClick={() => setOverlay('menu')} aria-label="Menu van oefening">
          ⋯
        </button>
      </div>
      <NoteBlock note={exercise?.note} />
      <div className="set-grid set-head">
        <span>Set</span>
        <span>Vorige</span>
        <span>kg</span>
        <span>Reps</span>
        <span>✓</span>
      </div>
      {sets.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          label={labels[i]}
          prev={workIndex[i] >= 0 ? prev[workIndex[i]] : undefined}
          onToggle={() => toggle(s, i)}
          onMenu={() => setSetMenu(s)}
        />
      ))}
      <button className="btn ghost block" onClick={addSet}>
        + Set
      </button>

      {overlay === 'menu' && <ActionSheet title={exercise?.name} actions={menu} onClose={() => setOverlay(null)} />}
      {overlay === 'info' && <ExerciseInfo exerciseId={exerciseId} onClose={() => setOverlay(null)} primary={{ label: 'Terug naar je workout', onClick: () => setOverlay(null) }} />}
      {overlay === 'note' && exercise && <NoteSheet exercise={exercise} onClose={() => setOverlay(null)} />}
      {overlay === 'progress' && <ProgressSheet exerciseId={exerciseId} onClose={() => setOverlay(null)} />}
      {overlay === 'rest' && (
        <RestSheet
          value={rest}
          onClose={() => setOverlay(null)}
          onPick={(s) => db.workouts.update(workout.id, { rest: { ...workout.rest, [exerciseId]: s } })}
        />
      )}
      {setMenu && (
        <ActionSheet
          title={`Set ${labels[sets.findIndex((s) => s.id === setMenu.id)] ?? ''}`}
          onClose={() => setSetMenu(null)}
          actions={setActions(setMenu, exercise)}
        />
      )}
    </section>
  );
}

function setActions(set: WorkoutSet, exercise?: Exercise): Action[] {
  return [
    { label: 'Set dupliceren', onClick: () => duplicateSet(set) },
    {
      label: set.warmup ? 'Markeren als werkset' : 'Markeren als warming-up',
      onClick: () => db.sets.update(set.id, { warmup: !set.warmup }),
    },
    {
      label: 'Set verwijderen',
      danger: true,
      onClick: async () => {
        const restore = await deleteSet(set);
        showToast(`Set verwijderd${exercise ? ` (${exercise.name})` : ''}`, restore);
      },
    },
  ];
}

function SetRow({
  set,
  label,
  prev,
  onToggle,
  onMenu,
}: {
  set: WorkoutSet;
  label: string;
  prev?: WorkoutSet;
  onToggle: () => void;
  onMenu: () => void;
}) {
  const [weight, setWeight] = useNumberField(set.weight);
  const [reps, setReps] = useNumberField(set.reps);

  function fillFromPrev() {
    if (prev) db.sets.update(set.id, { weight: prev.weight, reps: prev.reps });
  }

  return (
    <div className={`set-grid set-row ${set.done ? 'done' : ''} ${set.warmup ? 'warmup' : ''}`}>
      <button className="set-num" onClick={onMenu} aria-label={`Set ${label}, menu`}>
        {label}
      </button>
      <button className="prev" onClick={fillFromPrev} disabled={!prev}>
        {prev ? fmtSet(prev) : '–'}
      </button>
      <input
        inputMode="decimal"
        value={weight}
        placeholder={prev ? fmtWeight(prev.weight) : '0'}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setWeight(e.target.value);
          db.sets.update(set.id, { weight: parseNum(e.target.value) });
        }}
      />
      <input
        inputMode="numeric"
        value={reps}
        placeholder={prev?.reps != null ? String(prev.reps) : '0'}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setReps(e.target.value);
          const n = parseNum(e.target.value);
          db.sets.update(set.id, { reps: n == null ? null : Math.round(n) });
        }}
      />
      <button className={`check ${set.done ? 'on' : ''}`} onClick={onToggle} aria-label="Set afvinken">
        ✓
      </button>
    </div>
  );
}

/** Text state for a numeric input that follows outside changes (e.g. "copy previous"). */
function useNumberField(value: number | null): [string, (v: string) => void] {
  const [text, setText] = useState(value == null ? '' : fmtWeight(value));
  useEffect(() => {
    setText((t) => (parseNum(t) === value ? t : value == null ? '' : fmtWeight(value)));
  }, [value]);
  return [text, setText];
}

async function findPrs(workoutId: number, done: WorkoutSet[]): Promise<Pr[]> {
  const prs: Pr[] = [];
  const byExercise = new Map<number, WorkoutSet[]>();
  for (const s of done.filter((s) => !s.warmup)) (byExercise.get(s.exerciseId) ?? byExercise.set(s.exerciseId, []).get(s.exerciseId)!).push(s);
  for (const [exId, list] of byExercise) {
    const history = await db.sets
      .where('exerciseId')
      .equals(exId)
      .filter((s) => s.done && !s.warmup && s.workoutId !== workoutId)
      .toArray();
    if (history.length === 0) continue; // first time doing it isn't a PR
    const bestBefore = Math.max(...history.map((s) => s.weight ?? 0));
    const best = list.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a));
    if ((best.weight ?? 0) > bestBefore) {
      const ex = await db.exercises.get(exId);
      prs.push({ exercise: ex?.name ?? '?', weight: best.weight!, reps: best.reps ?? 0 });
    }
  }
  return prs;
}
