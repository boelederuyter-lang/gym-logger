import { addPlannedSets, db, syncLibrary, type Exercise, type PlanRef, type Workout } from '../db';
import { LOGGER_APPARATUUR, LOGGER_SPIER, OEFENINGEN, type Patroon } from './exercises';
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
    muscle: LOGGER_SPIER[o.patroon as Patroon] ?? 'Hele lichaam',
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
  const dag = weekSchema(plan.schema, plan.schema.coach ? 1 : plan.week)[dagIndex];
  const exercises: Exercise[] = [];
  for (const o of dag.oefeningen) exercises.push(await loggerExercise(o));

  return db.transaction('rw', db.workouts, db.sets, db.exercises, async () => {
    const rest: Record<number, number> = {};
    dag.oefeningen.forEach((o, i) => (rest[exercises[i].id] = o.rust));
    const ref: PlanRef = { seed: plan.schema.seed, blok: plan.blok, week: plan.week, dag: dagIndex };
    const workoutId = await db.workouts.add({
      name: plan.schema.coach ? dag.naam : `${dag.naam} · week ${plan.week}`,
      startedAt: Date.now(),
      exerciseIds: exercises.map((e) => e.id),
      rest,
      plan: ref,
    } as Workout);
    for (const [i, o] of dag.oefeningen.entries()) {
      await addPlannedSets(
        workoutId,
        exercises[i].id,
        o.sets,
        o.reps[0],
        plan.schema.coach
          ? // Coach schema: double progression per exercise, start weight when there's no history yet.
            {
              repRange: o.reps,
              progression: o.zonderGewicht ? undefined : { range: o.reps, increment: o.stap ?? 2.5 },
              startWeight: o.startgewicht,
            }
          : { repRange: o.reps, weightDelta: weightDelta(o, plan.week, plan.blok) },
      );
    }
    return workoutId;
  });
}

/** Calendar week as a number, e.g. 202643 for week 43 of 2026 (ISO weeks start on Monday). */
export function isoWeek(time: number): number {
  const d = new Date(time);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  // The Thursday of this week decides the year; its day of the year decides the week number.
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 3);
  const dayOfYear = Math.round((thursday.getTime() - new Date(thursday.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
  return thursday.getFullYear() * 100 + Math.ceil(dayOfYear / 7);
}

/**
 * The week a schema is in. Old schemas run in a 4-week block (week 1-4); coach schemas follow
 * the calendar, so the checklist starts fresh every Monday.
 */
export function currentWeek(plan: PlanState, now = Date.now()): number {
  return plan.schema.coach ? isoWeek(now) : plan.week;
}

/** Days of the current block (coach: of each calendar week) that were logged, as `${week}-${dag}` keys. */
export function loggedDays(plan: PlanState, workouts: Workout[]): Set<string> {
  const keys = new Set<string>();
  for (const w of workouts) {
    const p = w.plan;
    if (!w.endedAt || !p || p.seed !== plan.schema.seed) continue;
    if (plan.schema.coach) keys.add(`${isoWeek(w.startedAt)}-${p.dag}`);
    else if (p.blok === plan.blok) keys.add(`${p.week}-${p.dag}`);
  }
  return keys;
}

/** The first day of the current week that isn't done yet, or null when the week is complete. */
export function nextDay(plan: PlanState, logged: Set<string>, now = Date.now()): number | null {
  const week = currentWeek(plan, now);
  for (let d = 0; d < plan.schema.dagen.length; d++) {
    const k = `${week}-${d}`;
    if (!logged.has(k) && !plan.gedaan[k]) return d;
  }
  return null;
}
