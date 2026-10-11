import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';

describe('migration from version 1', () => {
  beforeEach(async () => {
    await Dexie.delete('gym-logger');
  });

  it('keeps ids and history while linking old exercises to the library', async () => {
    const old = new Dexie('gym-logger');
    old.version(1).stores({
      exercises: '++id, name, muscle',
      templates: '++id, name',
      workouts: '++id, startedAt, endedAt',
      sets: '++id, workoutId, exerciseId, [workoutId+exerciseId]',
    });
    await old.table('exercises').bulkAdd([
      { id: 1, name: 'Bench Press', muscle: 'Borst', equipment: 'barbell' },
      { id: 2, name: 'Hip Abduction', muscle: 'Billen', equipment: 'machine' },
      { id: 3, name: 'Mijn curl', muscle: 'Biceps', equipment: 'cable', custom: true },
    ]);
    await old.table('sets').add({ workoutId: 1, exerciseId: 1, order: 0, weight: 60, reps: 8, done: true });
    old.close();

    const { db, syncLibrary } = await import('../db');
    await db.open();
    await syncLibrary();

    const bench = await db.exercises.get(1);
    expect(bench?.slug).toBe('bankdrukken');
    expect(bench?.name).toBe('Bankdrukken');
    expect((await db.exercises.get(2))?.custom).toBe(true);
    expect((await db.exercises.get(3))?.muscle).toBe('Armen');
    expect(await db.exercises.where('slug').equals('bankdrukken').count()).toBe(1);
    expect(await db.exercises.count()).toBe(73 + 2);
    expect((await db.sets.toArray())[0].exerciseId).toBe(1);
    db.close();
  });
});
