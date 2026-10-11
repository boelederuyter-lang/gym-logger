import Dexie, { type EntityTable } from 'dexie';
import { SEED_EXERCISES } from './seed';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

export interface Exercise {
  id: number;
  name: string;
  muscle: string;
  equipment: Equipment;
  custom?: boolean;
}

export interface TemplateItem {
  exerciseId: number;
  sets: number;
  reps: string; // free text, e.g. "8" or "8-12"
}

export interface Template {
  id: number;
  name: string;
  items: TemplateItem[];
  createdAt: number;
}

export interface Workout {
  id: number;
  name: string;
  templateId?: number;
  startedAt: number;
  endedAt?: number; // undefined while the workout is in progress
  exerciseIds: number[]; // display order within the workout
  note?: string;
}

export interface WorkoutSet {
  id: number;
  workoutId: number;
  exerciseId: number;
  order: number;
  weight: number | null;
  reps: number | null;
  done: boolean;
  doneAt?: number;
}

export const db = new Dexie('gym-logger') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  templates: EntityTable<Template, 'id'>;
  workouts: EntityTable<Workout, 'id'>;
  sets: EntityTable<WorkoutSet, 'id'>;
};

db.version(1).stores({
  exercises: '++id, name, muscle',
  templates: '++id, name',
  workouts: '++id, startedAt, endedAt',
  sets: '++id, workoutId, exerciseId, [workoutId+exerciseId]',
});

db.on('populate', (tx) => {
  tx.table('exercises').bulkAdd(SEED_EXERCISES);
});

/** Sets of the most recent finished workout that contained this exercise. */
export async function previousSets(exerciseId: number, beforeWorkoutId?: number): Promise<WorkoutSet[]> {
  const all = await db.sets.where('exerciseId').equals(exerciseId).filter((s) => s.done).toArray();
  const byWorkout = new Map<number, WorkoutSet[]>();
  for (const s of all) {
    if (s.workoutId === beforeWorkoutId) continue;
    (byWorkout.get(s.workoutId) ?? byWorkout.set(s.workoutId, []).get(s.workoutId)!).push(s);
  }
  if (byWorkout.size === 0) return [];
  const workouts = await db.workouts.bulkGet([...byWorkout.keys()]);
  const latest = workouts
    .filter((w): w is Workout => !!w && !!w.endedAt)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!latest) return [];
  return byWorkout.get(latest.id)!.sort((a, b) => a.order - b.order);
}

export async function startWorkout(template?: Template): Promise<number> {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const exerciseIds = template ? template.items.map((i) => i.exerciseId) : [];
    const workoutId = await db.workouts.add({
      name: template?.name ?? 'Losse workout',
      templateId: template?.id,
      startedAt: Date.now(),
      exerciseIds,
    } as Workout);
    if (template) {
      for (const item of template.items) {
        await addPlannedSets(workoutId, item.exerciseId, item.sets, parseInt(item.reps, 10) || null);
      }
    }
    return workoutId;
  });
}

/** Adds sets for an exercise, prefilled with what you did last time. */
export async function addPlannedSets(workoutId: number, exerciseId: number, count: number, targetReps: number | null) {
  const prev = await previousSets(exerciseId, workoutId);
  const existing = await db.sets.where({ workoutId, exerciseId }).count();
  const rows = Array.from({ length: count }, (_, i) => {
    const p = prev[existing + i] ?? prev[prev.length - 1];
    return {
      workoutId,
      exerciseId,
      order: existing + i,
      weight: p?.weight ?? null,
      reps: p?.reps ?? targetReps,
      done: false,
    } as WorkoutSet;
  });
  await db.sets.bulkAdd(rows);
}

export async function addExerciseToWorkout(workout: Workout, exerciseId: number) {
  if (workout.exerciseIds.includes(exerciseId)) return;
  await db.workouts.update(workout.id, { exerciseIds: [...workout.exerciseIds, exerciseId] });
  await addPlannedSets(workout.id, exerciseId, 3, null);
}

export async function removeExerciseFromWorkout(workout: Workout, exerciseId: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.workouts.update(workout.id, { exerciseIds: workout.exerciseIds.filter((id) => id !== exerciseId) });
    await db.sets.where({ workoutId: workout.id, exerciseId }).delete();
  });
}

/** Ends the workout; sets that were never ticked off are discarded. */
export async function finishWorkout(workoutId: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(workoutId).filter((s) => !s.done).delete();
    const w = await db.workouts.get(workoutId);
    if (!w) return;
    const remaining = await db.sets.where('workoutId').equals(workoutId).toArray();
    const used = new Set(remaining.map((s) => s.exerciseId));
    await db.workouts.update(workoutId, {
      endedAt: Date.now(),
      exerciseIds: w.exerciseIds.filter((id) => used.has(id)),
    });
  });
}

export async function deleteWorkout(workoutId: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(workoutId).delete();
    await db.workouts.delete(workoutId);
  });
}

export async function exportData(): Promise<string> {
  const [exercises, templates, workouts, sets] = await Promise.all([
    db.exercises.toArray(),
    db.templates.toArray(),
    db.workouts.toArray(),
    db.sets.toArray(),
  ]);
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), exercises, templates, workouts, sets });
}

export async function importData(json: string) {
  const data = JSON.parse(json);
  if (data.version !== 1) throw new Error('Onbekend bestandsformaat');
  await db.transaction('rw', [db.exercises, db.templates, db.workouts, db.sets], async () => {
    await Promise.all([db.exercises.clear(), db.templates.clear(), db.workouts.clear(), db.sets.clear()]);
    await db.exercises.bulkAdd(data.exercises);
    await db.templates.bulkAdd(data.templates);
    await db.workouts.bulkAdd(data.workouts);
    await db.sets.bulkAdd(data.sets);
  });
}
