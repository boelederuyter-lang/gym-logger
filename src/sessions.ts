import { db, type WorkoutSet } from './db';
import type { Session } from './progress';

/** Finished work sets per exercise, grouped per workout and sorted from old to new. */
export async function loadSessions(exerciseId?: number): Promise<Map<number, Session[]>> {
  const sets: WorkoutSet[] =
    exerciseId == null
      ? await db.sets.filter((s) => s.done && !s.warmup).toArray()
      : await db.sets
          .where('exerciseId')
          .equals(exerciseId)
          .filter((s) => s.done && !s.warmup)
          .toArray();
  const workouts = new Map(
    (await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))]))
      .filter((w) => w?.endedAt)
      .map((w) => [w!.id, w!]),
  );
  const byExercise = new Map<number, Map<number, Session>>();
  for (const s of sets.sort((a, b) => a.order - b.order)) {
    const w = workouts.get(s.workoutId);
    if (!w) continue;
    const perWorkout = byExercise.get(s.exerciseId) ?? byExercise.set(s.exerciseId, new Map()).get(s.exerciseId)!;
    const session =
      perWorkout.get(w.id) ??
      perWorkout.set(w.id, { workoutId: w.id, date: w.startedAt, name: w.name, sets: [] }).get(w.id)!;
    session.sets.push(s);
  }
  return new Map([...byExercise].map(([id, m]) => [id, [...m.values()].sort((a, b) => a.date - b.date)]));
}
