import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { standaardDagen, standaardProfiel } from '../coach/profile';
import { db, type Workout } from '../db';
import { currentWeek, isoWeek, loggedDays, nextDay, startPlanDay } from '../plan/start';
import {
  adoptShared,
  createCoachPlan,
  getPlan,
  parseShareHash,
  regeneratePlan,
  shareLink,
  swapExercise,
} from '../plan/store';
import { coachVarianten } from '../coach/generator';

const profiel = { ...standaardProfiel(), dagen: standaardDagen(3), kracht: { squat: { kg: 100, reps: 5 } } };

describe('coach-schema in de opslag', () => {
  it('maakt, wisselt en hergenereert een coachschema', () => {
    createCoachPlan(profiel, 11);
    const plan = getPlan()!;
    expect(plan.schema.coach).toBe(true);
    expect(plan.profiel).toEqual(profiel);

    const optie = coachVarianten(plan.schema, profiel, 0, 1)[0];
    swapExercise({ dag: 0, index: 1, id: optie.id });
    expect(getPlan()!.schema.dagen[0].oefeningen[1].id).toBe(optie.id);
    expect(getPlan()!.wissels).toEqual([{ dag: 0, index: 1, id: optie.id }]);

    regeneratePlan();
    expect(getPlan()!.schema.coach).toBe(true);
    expect(getPlan()!.schema.seed).not.toBe(11);
    expect(getPlan()!.wissels).toEqual([]);
  });

  it('deelt een coachschema via een link, zonder kracht of lichaamsgewicht', () => {
    createCoachPlan({ ...profiel, lichaamsgewicht: 80 }, 22);
    const plan = getPlan()!;
    const optie = coachVarianten(plan.schema, profiel, 1, 2)[0];
    swapExercise({ dag: 1, index: 2, id: optie.id });
    const link = shareLink(getPlan()!, 'https://example.com/gym-logger/');
    expect(link).toContain('#c=');
    const shared = parseShareHash(new URL(link).hash)!;
    expect(shared.seed).toBe(22);
    expect(shared.profiel!.kracht).toEqual({});
    expect(shared.profiel!.lichaamsgewicht).toBeUndefined();
    expect(shared.wissels).toEqual([{ dag: 1, index: 2, id: optie.id }]);

    const voor = getPlan()!.schema.dagen.map((d) => d.oefeningen.map((o) => o.id));
    adoptShared(shared);
    expect(getPlan()!.schema.dagen.map((d) => d.oefeningen.map((o) => o.id))).toEqual(voor);
  });

  it('weigert kapotte links', () => {
    expect(parseShareHash('#c=bm9wZQ.5')).toBeNull();
    expect(parseShareHash('#c=!!!.5')).toBeNull();
  });
});

describe('weken van een coachschema', () => {
  it('isoWeek telt kalenderweken vanaf maandag', () => {
    expect(isoWeek(new Date(2026, 9, 19).getTime())).toBe(202643); // maandag
    expect(isoWeek(new Date(2026, 9, 25).getTime())).toBe(202643); // zondag
    expect(isoWeek(new Date(2026, 9, 26).getTime())).toBe(202644);
    expect(isoWeek(new Date(2027, 0, 1).getTime())).toBe(202653);
    expect(isoWeek(new Date(2026, 0, 1).getTime())).toBe(202601);
  });

  it('vinkt per kalenderweek af en begint maandag opnieuw', () => {
    createCoachPlan(profiel, 33);
    const plan = getPlan()!;
    const maandag = new Date(2026, 9, 19, 18).getTime();
    const workouts = [
      { startedAt: maandag, endedAt: maandag + 1, plan: { seed: 33, blok: 1, week: 1, dag: 0 } },
    ] as Workout[];
    const logged = loggedDays(plan, workouts);
    expect(nextDay(plan, logged, maandag + 86400000)).toBe(1);
    expect(nextDay(plan, logged, maandag + 7 * 86400000)).toBe(0);
    expect(currentWeek(plan, maandag)).toBe(202643);
  });
});

describe('training starten', () => {
  it('vult het startgewicht in als er nog geen geschiedenis is', async () => {
    createCoachPlan({ ...profiel, doel: 'sterker' }, 44);
    const plan = getPlan()!;
    const d = plan.schema.dagen.findIndex((x) => x.oefeningen.some((o) => o.id === 'squat'));
    expect(d).toBeGreaterThanOrEqual(0);
    const squat = plan.schema.dagen[d].oefeningen.find((o) => o.id === 'squat')!;
    const id = await startPlanDay(plan, d);
    const ex = await db.exercises.where('slug').equals('squat').first();
    const sets = await db.sets.where({ workoutId: id, exerciseId: ex!.id }).toArray();
    expect(sets).toHaveLength(squat.sets);
    expect(sets.every((s) => s.weight === squat.startgewicht)).toBe(true);
    expect(sets[0].reps).toBe(squat.reps[0]);
    expect((await db.workouts.get(id))!.name).toBe(plan.schema.dagen[d].naam);
  });
});
