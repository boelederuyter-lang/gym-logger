import {
  adviseer,
  gaatAchteruit,
  herstelAdvies,
  herstelweek,
  maandagVan,
  wekenOpRij,
  type Advies,
  type OefInfo,
  type Sessie,
} from '../coach/progression';
import { COACH_BY_ID, geschiktVoor } from '../coach/exercises';
import { db, type Workout } from '../db';
import type { SchemaOefening } from './generator';
import type { PlanState } from './store';

// Glue between the progression engine (pure, src/coach/progression.ts) and the logbook.

/** Your history with an exercise as engine sessions, newest first (only finished workouts). */
export async function historieVoor(exerciseId: number, max = 12): Promise<Sessie[]> {
  const sets = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter((s) => s.done && !s.warmup)
    .toArray();
  const ids = [...new Set(sets.map((s) => s.workoutId))];
  const workouts = (await db.workouts.bulkGet(ids)).filter((w): w is Workout => !!w?.endedAt);
  return workouts
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, max)
    .map((w) => ({
      datum: w.startedAt,
      sets: sets
        .filter((s) => s.workoutId === w.id)
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ gewicht: s.weight, reps: s.reps, rpe: s.rpe })),
      advies: w.coach?.[exerciseId]?.gewicht,
      herstel: !!w.herstel,
    }));
}

/** What the engine needs to know about a schema exercise. */
export function oefInfo(o: SchemaOefening, plan: PlanState): OefInfo {
  const c = COACH_BY_ID.get(o.id);
  const niveau = plan.profiel?.niveau ?? 'beginner';
  const alternatieven = (c?.alternatieven ?? []).map((id) => COACH_BY_ID.get(id)!).filter(Boolean);
  // A harder variant: an alternative for a higher level that also works with bodyweight.
  const zwaarder = alternatieven.find((a) => a.progressie === 'reps' && !geschiktVoor(a, c?.niveau ?? 'beginner'));
  const alternatief = alternatieven.find(
    (a) => geschiktVoor(a, niveau) && (!plan.profiel || a.materiaal.every((m) => plan.profiel!.materiaal.includes(m))),
  );
  return {
    naam: o.naam,
    reps: o.reps,
    sets: o.sets,
    stap: o.stap ?? 2.5,
    progressie: o.zonderGewicht ? 'reps' : 'gewicht',
    eenheid: o.eenheid,
    startgewicht: o.startgewicht,
    zwaarder: zwaarder?.naam,
    alternatief: alternatief?.naam,
    minimum: o.apparatuur === 'stang' ? 20 : undefined,
    perHand: o.apparatuur === 'dumbbells',
  };
}

/**
 * Is this week a recovery week? Either it was already marked, or after 5 trained weeks in a row,
 * or when 3+ exercises of the schema went backwards last time.
 */
export async function bepaalHerstel(
  plan: PlanState,
  exerciseIds: Map<string, number>,
  now = Date.now(),
): Promise<{ actief: boolean; reden?: string; nieuw: boolean }> {
  const deze = maandagVan(now);
  if (plan.herstelWeken?.includes(deze))
    return { actief: true, reden: 'Herstelweek: minder sets, zelfde gewicht.', nieuw: false };
  const workouts = await db.workouts.filter((w) => !!w.endedAt && !!w.plan).toArray();
  const weken = wekenOpRij(
    workouts.map((w) => w.startedAt),
    plan.herstelWeken ?? [],
    now,
  );
  let dalers = 0;
  for (const id of exerciseIds.values()) if (gaatAchteruit(await historieVoor(id, 2))) dalers++;
  const r = herstelweek({ wekenGetraind: weken, dalers });
  return { ...r, nieuw: r.actief };
}

/** Advice for one exercise, normal or for a recovery week. */
export async function adviesVoor(
  o: SchemaOefening,
  plan: PlanState,
  exerciseId: number,
  herstel: boolean,
): Promise<Advies> {
  const info = oefInfo(o, plan);
  const historie = await historieVoor(exerciseId);
  return herstel ? herstelAdvies(info, historie) : adviseer(info, historie);
}
