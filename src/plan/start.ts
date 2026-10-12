import { addPlannedSets, db, syncLibrary, type Exercise, type PlanRef, type Workout } from '../db';
import { LOGGER_APPARATUUR, LOGGER_SPIER, OEFENINGEN } from './exercises';
import { weekSchema, type SchemaOefening } from './generator';
import type { PlanState } from './store';

const BRON = new Map(OEFENINGEN.map((o) => [o.id, o]));

/**
 * The logger exercise for a schema exercise: the library exercise when it is linked,
 * otherwise a custom exercise that is created once and reused (so history builds up).
 */
export async function loggerExercise(o: SchemaOefening): Promise<Exercise> {
  if (o.slug) {
    let ex = await db.exercises.where('slug').equals(o.slug).first();
    if (!ex) {
      await syncLibrary();
      ex = await db.exercises.where('slug').equals(o.slug).first();
    }
    if (ex) return ex;
  }
  const existing = await db.exercises.filter((e) => e.planKey === o.id).first();
  if (existing) return existing;
  const bron = BRON.get(o.id);
  const id = await db.exercises.add({
    name: o.naam,
    aliases: [],
    muscle: LOGGER_SPIER[o.patroon],
    equipment: bron ? LOGGER_APPARATUUR[bron.apparatuur] : 'other',
    tip: o.tip,
    custom: true,
    planKey: o.id,
  });
  return (await db.exercises.get(id))!;
}

/** Weight step for the schema progression: +2,5 kg upper body, +5 kg lower body. */
function step(o: SchemaOefening) {
  if (o.zonderGewicht) return 0;
  return o.deel === 'onder' ? 5 : 2.5;
}

/**
 * How much to change last time's weight. Week 3 goes up a step, the deload goes back to the
 * week-1 weight, and a new block starts at the week-3 weight.
 */
export function weightDelta(o: SchemaOefening, week: number, blok: number): number {
  if (week === 3) return step(o);
  if (week === 4) return -step(o);
  if (week === 1 && blok > 1) return step(o);
  return 0;
}

/** Starts a logged workout for one day of the schema, in the current week. */
export async function startPlanDay(plan: PlanState, dagIndex: number): Promise<number> {
  const dag = weekSchema(plan.schema, plan.week)[dagIndex];
  const exercises: Exercise[] = [];
  for (const o of dag.oefeningen) exercises.push(await loggerExercise(o));

  return db.transaction('rw', db.workouts, db.sets, db.exercises, async () => {
    const rest: Record<number, number> = {};
    dag.oefeningen.forEach((o, i) => (rest[exercises[i].id] = o.rust));
    const ref: PlanRef = { seed: plan.schema.seed, blok: plan.blok, week: plan.week, dag: dagIndex };
    const workoutId = await db.workouts.add({
      name: `${dag.naam} · week ${plan.week}`,
      startedAt: Date.now(),
      exerciseIds: exercises.map((e) => e.id),
      rest,
      plan: ref,
    } as Workout);
    for (const [i, o] of dag.oefeningen.entries()) {
      await addPlannedSets(workoutId, exercises[i].id, o.sets, o.reps[0], {
        repRange: o.reps,
        weightDelta: weightDelta(o, plan.week, plan.blok),
      });
    }
    return workoutId;
  });
}

/** Days of the current block that were logged, as `${week}-${dag}` keys. */
export function loggedDays(plan: PlanState, workouts: Workout[]): Set<string> {
  const keys = new Set<string>();
  for (const w of workouts) {
    const p = w.plan;
    if (w.endedAt && p && p.seed === plan.schema.seed && p.blok === plan.blok) keys.add(`${p.week}-${p.dag}`);
  }
  return keys;
}

/** The first day of the current week that isn't done yet, or null when the week is complete. */
export function nextDay(plan: PlanState, logged: Set<string>): number | null {
  for (let d = 0; d < plan.schema.dagen.length; d++) {
    const k = `${plan.week}-${d}`;
    if (!logged.has(k) && !plan.gedaan[k]) return d;
  }
  return null;
}
