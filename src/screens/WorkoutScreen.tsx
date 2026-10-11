import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import {
  addExerciseToWorkout,
  db,
  deleteWorkout,
  finishWorkout,
  previousSets,
  removeExerciseFromWorkout,
  type Workout,
  type WorkoutSet,
} from '../db';
import { ExercisePicker } from '../components/ExercisePicker';
import { RestBar } from '../components/RestBar';
import { fmtDuration, fmtSet, fmtWeight, parseNum } from '../format';
import { startRest, stopRest } from '../restTimer';
import { useSettings } from '../settings';
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
        {workout.exerciseIds.length === 0 && (
          <p className="empty">Voeg je eerste oefening toe om te beginnen.</p>
        )}
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
          onPick={async (ex) => {
            setPicking(false);
            await addExerciseToWorkout(workout, ex.id);
          }}
        />
      )}
    </div>
  );
}

function ExerciseCard({ workout, exerciseId, sets }: { workout: Workout; exerciseId: number; sets: WorkoutSet[] }) {
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const prev = useLiveQuery(() => previousSets(exerciseId, workout.id), [exerciseId, workout.id]) ?? [];
  const settings = useSettings();

  async function addSet() {
    const last = sets[sets.length - 1] ?? prev[sets.length];
    await db.sets.add({
      workoutId: workout.id,
      exerciseId,
      order: (sets[sets.length - 1]?.order ?? -1) + 1,
      weight: last?.weight ?? null,
      reps: last?.reps ?? null,
      done: false,
    } as WorkoutSet);
  }

  async function removeLastSet() {
    const last = sets[sets.length - 1];
    if (last) await db.sets.delete(last.id);
  }

  async function toggle(set: WorkoutSet, index: number) {
    if (set.done) {
      await db.sets.update(set.id, { done: false, doneAt: undefined });
      return;
    }
    // Empty fields fall back to what you did last time (shown as placeholder).
    const p = prev[index];
    const weight = set.weight ?? p?.weight ?? null;
    const reps = set.reps ?? p?.reps ?? null;
    if (reps == null) return;
    await db.sets.update(set.id, { weight, reps, done: true, doneAt: Date.now() });
    // Carry the weight down to the following sets you haven't filled in yet.
    const later = sets.slice(index + 1).filter((s) => !s.done && s.weight == null);
    await Promise.all(later.map((s) => db.sets.update(s.id, { weight })));
    startRest(settings.restSeconds);
  }

  async function remove() {
    if (confirm(`${exercise?.name ?? 'Oefening'} uit deze workout verwijderen?`)) {
      await removeExerciseFromWorkout(workout, exerciseId);
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <h3>{exercise?.name ?? '…'}</h3>
        <button className="icon-btn" onClick={remove} aria-label="Oefening verwijderen">
          ✕
        </button>
      </div>
      <div className="set-grid set-head">
        <span>Set</span>
        <span>Vorige</span>
        <span>kg</span>
        <span>Reps</span>
        <span>✓</span>
      </div>
      {sets.map((s, i) => (
        <SetRow key={s.id} set={s} index={i} prev={prev[i]} onToggle={() => toggle(s, i)} />
      ))}
      <div className="row-buttons">
        <button className="btn ghost" onClick={removeLastSet} disabled={sets.length === 0}>
          − Set
        </button>
        <button className="btn ghost" onClick={addSet}>
          + Set
        </button>
      </div>
    </section>
  );
}

function SetRow({
  set,
  index,
  prev,
  onToggle,
}: {
  set: WorkoutSet;
  index: number;
  prev?: WorkoutSet;
  onToggle: () => void;
}) {
  const [weight, setWeight] = useNumberField(set.weight);
  const [reps, setReps] = useNumberField(set.reps);

  function fillFromPrev() {
    if (prev) db.sets.update(set.id, { weight: prev.weight, reps: prev.reps });
  }

  return (
    <div className={`set-grid set-row ${set.done ? 'done' : ''}`}>
      <span className="set-num">{index + 1}</span>
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
  for (const s of done) (byExercise.get(s.exerciseId) ?? byExercise.set(s.exerciseId, []).get(s.exerciseId)!).push(s);
  for (const [exId, list] of byExercise) {
    const history = await db.sets
      .where('exerciseId')
      .equals(exId)
      .filter((s) => s.done && s.workoutId !== workoutId)
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
