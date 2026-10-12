import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, finishWorkout, syncLibrary } from '../db';
import { LIBRARY } from '../library/exercises';
import { BIBLIOTHEEK, OEFENINGEN } from '../plan/exercises';
import { genereerSchema, weekSchema, type Invoer } from '../plan/generator';
import { loggedDays, nextDay, startPlanDay, weightDelta } from '../plan/start';
import type { PlanState } from '../plan/store';

function planFor(invoer: Invoer, seed = 42, week = 1, blok = 1): PlanState {
  return { versie: 1, invoer, schema: genereerSchema(invoer, seed), blok, week, gedaan: {}, gestart: '' };
}

const GYM: Invoer = { doel: 'spiermassa', niveau: 'gevorderd', dagen: 4, tijd: 60, apparatuur: 'gym' };
const THUIS: Invoer = { doel: 'fitheid', niveau: 'beginner', dagen: 3, tijd: 45, apparatuur: 'thuis' };

beforeEach(async () => {
  await db.delete();
  await db.open();
  await syncLibrary();
});

describe('koppeling met de bibliotheek', () => {
  it('verwijst alleen naar bestaande bibliotheekoefeningen, elk hoogstens één keer', () => {
    const slugs = new Set(LIBRARY.map((l) => l.slug));
    for (const [id, slug] of Object.entries(BIBLIOTHEEK)) {
      expect(slugs.has(slug), `${id} → ${slug}`).toBe(true);
      expect(OEFENINGEN.some((o) => o.id === id), id).toBe(true);
    }
    const waarden = Object.values(BIBLIOTHEEK);
    expect(new Set(waarden).size).toBe(waarden.length);
  });

  it('gebruikt de bibliotheeknaam voor gekoppelde oefeningen', () => {
    expect(OEFENINGEN.find((o) => o.id === 'back-squat')!.naam).toBe('Squat');
  });
});

describe('training starten vanuit het schema', () => {
  it('maakt een workout met de oefeningen, sets, reps en rust van die week', async () => {
    const plan = planFor(GYM, 42, 2);
    const id = await startPlanDay(plan, 1);
    const workout = (await db.workouts.get(id))!;
    const dag = weekSchema(plan.schema, 2)[1];

    expect(workout.name).toBe(`${dag.naam} · week 2`);
    expect(workout.plan).toEqual({ seed: 42, blok: 1, week: 2, dag: 1 });
    expect(workout.exerciseIds).toHaveLength(dag.oefeningen.length);

    for (const [i, o] of dag.oefeningen.entries()) {
      const exId = workout.exerciseIds[i];
      const ex = (await db.exercises.get(exId))!;
      if (o.slug) expect(ex.slug).toBe(o.slug);
      const sets = await db.sets.where({ workoutId: id, exerciseId: exId }).toArray();
      expect(sets).toHaveLength(o.sets);
      expect(sets.every((s) => s.reps === o.reps[0])).toBe(true); // week 2: ondergrens is al +1
      expect(workout.rest![exId]).toBe(o.rust);
    }
  });

  it('maakt eigen oefeningen voor schema-oefeningen buiten de bibliotheek, en hergebruikt ze', async () => {
    const plan = planFor(THUIS);
    const eerste = await startPlanDay(plan, 0);
    const ids = (await db.workouts.get(eerste))!.exerciseIds;
    await finishWorkout(eerste);
    const aantal = await db.exercises.count();
    const tweede = await startPlanDay(plan, 0);
    expect(await db.exercises.count()).toBe(aantal);
    expect((await db.workouts.get(tweede))!.exerciseIds).toEqual(ids);
    const eigen = await db.exercises.filter((e) => !!e.planKey).toArray();
    expect(eigen.length).toBeGreaterThan(0);
    expect(eigen.every((e) => e.custom && e.tip)).toBe(true);
  });

  it('zet in week 3 het gewicht van vorige keer een stap hoger klaar', async () => {
    const week1 = planFor(GYM, 7, 1);
    const w1 = await startPlanDay(week1, 0);
    await db.sets.where('workoutId').equals(w1).modify({ weight: 60, reps: 10, done: true });
    await finishWorkout(w1);

    const w3 = await startPlanDay({ ...week1, week: 3 }, 0);
    const dag = weekSchema(week1.schema, 3)[0];
    const workout = (await db.workouts.get(w3))!;
    for (const [i, o] of dag.oefeningen.entries()) {
      const sets = await db.sets.where({ workoutId: w3, exerciseId: workout.exerciseIds[i] }).toArray();
      expect(sets[0].weight).toBe(60 + weightDelta(o, 3, 1));
      expect(sets[0].reps).toBe(10); // binnen 8–12 blijft wat je deed
    }
  });

  it('telt gelogde workouts als gedaan en zoekt de volgende dag', async () => {
    const plan = planFor(GYM);
    expect(nextDay(plan, loggedDays(plan, await db.workouts.toArray()))).toBe(0);
    const id = await startPlanDay(plan, 0);
    expect(loggedDays(plan, await db.workouts.toArray()).size).toBe(0); // nog bezig
    await db.sets.where('workoutId').equals(id).modify({ done: true });
    await finishWorkout(id);
    const logged = loggedDays(plan, await db.workouts.toArray());
    expect([...logged]).toEqual(['1-0']);
    expect(nextDay(plan, logged)).toBe(1);
    // Een nieuw blok of nieuw schema begint weer bij dag 1.
    expect(loggedDays({ ...plan, blok: 2 }, await db.workouts.toArray()).size).toBe(0);
    expect(nextDay({ ...plan, gedaan: { '1-0': true, '1-1': true, '1-2': true, '1-3': true } }, new Set())).toBeNull();
  });
});

describe('gewichtsprogressie', () => {
  const schema = genereerSchema(GYM, 3);
  const onder = schema.dagen.flatMap((d) => d.oefeningen).find((o) => o.deel === 'onder' && !o.zonderGewicht)!;
  const boven = schema.dagen.flatMap((d) => d.oefeningen).find((o) => o.deel === 'boven' && !o.zonderGewicht)!;

  it('+5 kg onder, +2,5 kg boven in week 3; terug in de deload; nieuw blok begint zwaarder', () => {
    expect(weightDelta(onder, 3, 1)).toBe(5);
    expect(weightDelta(boven, 3, 1)).toBe(2.5);
    expect(weightDelta(boven, 4, 1)).toBe(-2.5);
    expect(weightDelta(boven, 1, 1)).toBe(0);
    expect(weightDelta(boven, 2, 1)).toBe(0);
    expect(weightDelta(onder, 1, 2)).toBe(5);
  });
});
