import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { db, fitWorkoutToTime, replaceExerciseInWorkout, syncLibrary, type WorkoutSet } from '../db';

async function setup() {
  await syncLibrary();
  const bench = (await db.exercises.where('slug').equals('bankdrukken').first())!;
  const row = (await db.exercises.where('slug').equals('barbell-row').first())!;
  const curl = (await db.exercises.where('slug').equals('dumbbell-curl').first())!;
  const id = await db.workouts.add({
    name: 'Test',
    startedAt: Date.now(),
    exerciseIds: [bench.id, row.id, curl.id],
    rest: { [bench.id]: 180, [row.id]: 150, [curl.id]: 90 },
  });
  const add = (exerciseId: number, order: number, done = false) =>
    db.sets.add({ workoutId: id, exerciseId, order, weight: 50, reps: 8, done } as WorkoutSet);
  for (let i = 0; i < 4; i++) await add(bench.id, i, i === 0);
  for (let i = 0; i < 3; i++) await add(row.id, i);
  for (let i = 0; i < 3; i++) await add(curl.id, i);
  return { id, bench, row, curl };
}

describe('replace an exercise (machine taken)', () => {
  it('moves open sets to the replacement and keeps done sets', async () => {
    const { id, bench } = await setup();
    const db2 = (await db.exercises.where('slug').equals('dumbbell-bankdrukken').first())!;
    const undo = await replaceExerciseInWorkout(id, bench.id, db2);
    const w = (await db.workouts.get(id))!;
    expect(w.exerciseIds.slice(0, 2)).toEqual([bench.id, db2.id]);
    expect(await db.sets.where({ workoutId: id, exerciseId: bench.id }).count()).toBe(1);
    expect(await db.sets.where({ workoutId: id, exerciseId: db2.id }).count()).toBe(3);
    expect(w.rest?.[db2.id]).toBe(180);

    await undo();
    expect((await db.workouts.get(id))!.exerciseIds[1]).not.toBe(db2.id);
    expect(await db.sets.where({ workoutId: id, exerciseId: bench.id }).count()).toBe(4);
    expect(await db.sets.where({ workoutId: id, exerciseId: db2.id }).count()).toBe(0);
  });
});

describe('fit the workout to the time you have', () => {
  it('drops the last exercise and can be undone', async () => {
    const { id, curl } = await setup();
    const result = await fitWorkoutToTime(id, 12);
    expect(result.minutes).toBeLessThanOrEqual(12);
    expect((await db.workouts.get(id))!.exerciseIds).not.toContain(curl.id);
    await result.undo();
    expect((await db.workouts.get(id))!.exerciseIds).toContain(curl.id);
    expect(await db.sets.where({ workoutId: id, exerciseId: curl.id }).count()).toBe(3);
  });
});
