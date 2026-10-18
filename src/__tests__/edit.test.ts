import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { db, deleteWorkout, finishEdit, recomputePrs, type WorkoutSet } from '../db';

async function workout(day: number, weight: number) {
  const startedAt = Date.UTC(2026, 9, day, 18);
  const id = await db.workouts.add({ name: 'Push', startedAt, endedAt: startedAt + 3600_000, exerciseIds: [1] });
  await db.sets.add({ workoutId: id, exerciseId: 1, order: 0, weight, reps: 5, done: true } as WorkoutSet);
  await recomputePrs(id, 1);
  return id;
}
const prOf = async (id: number) => (await db.sets.where('workoutId').equals(id).first())?.pr;

describe('editing finished workouts', () => {
  it('only compares with earlier workouts and updates later records', async () => {
    const w1 = await workout(1, 60);
    const w2 = await workout(8, 62.5);
    const w3 = await workout(15, 65);
    expect(await prOf(w2)).toEqual({ type: 'weight', prev: 60 });
    expect(await prOf(w3)).toEqual({ type: 'weight', prev: 62.5 });

    // A typo in the first workout: 600 instead of 60
    await db.sets.where('workoutId').equals(w1).modify({ weight: 600 });
    await finishEdit(w1);
    expect(await prOf(w2)).toBeUndefined();
    expect(await prOf(w3)).toBeUndefined();

    // Fixing it restores the records
    await db.sets.where('workoutId').equals(w1).modify({ weight: 60 });
    await finishEdit(w1);
    expect(await prOf(w2)).toEqual({ type: 'weight', prev: 60 });

    // Deleting the middle workout makes the last one compare with the first
    await deleteWorkout(w2);
    expect(await prOf(w3)).toEqual({ type: 'weight', prev: 60 });
  });

  it('drops sets that were not ticked while editing', async () => {
    const id = await workout(20, 70);
    await db.sets.add({ workoutId: id, exerciseId: 1, order: 1, weight: 70, reps: 5, done: false } as WorkoutSet);
    await finishEdit(id);
    expect(await db.sets.where('workoutId').equals(id).count()).toBe(1);
  });
});
