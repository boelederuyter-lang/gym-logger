import Dexie, { type EntityTable } from 'dexie';
import { LEGACY_MUSCLES, LEGACY_NAMES, LIBRARY, type Equipment } from './library/exercises';
import { defaultsFor } from './library/defaults';
import { normalize } from './library/search';
import { BIBLIOTHEEK } from './plan/exercises';
import { computePrs } from './prs';
import { parseRepRange, progressionIncrement, shouldProgress } from './progression';
import { getSettings } from './settings';
import { cleanLinks } from './supersets';
import type { PlannedSet } from './warmup';
import { getPlan, restorePlan } from './plan/store';

export type { Equipment };

export interface Exercise {
  id: number;
  slug?: string; // set for library exercises
  name: string;
  aliases: string[];
  muscle: string;
  equipment: Equipment;
  tip?: string;
  note?: string; // personal note, e.g. "rek op stand 12"
  custom?: boolean;
  planKey?: string; // id in de schema-database, voor schema-oefeningen buiten de bibliotheek
}

export interface TemplateItem {
  exerciseId: number;
  sets: number;
  reps: string; // free text, e.g. "8" or "8-12"
  restSeconds?: number;
  supersetNext?: boolean; // done as a superset with the next item
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
  rest?: Record<number, number>; // rest seconds per exercise
  note?: string;
  plan?: PlanRef; // set when the workout was started from the training schema
  progress?: Record<number, number>; // kg added per exercise compared to last time (double progression)
  supersets?: number[]; // exercises done as a superset with the next one in exerciseIds
}

/** Which day of the training schema a workout belongs to. */
export interface PlanRef {
  seed: number;
  blok: number;
  week: number;
  dag: number;
}

export type PrType = 'weight' | 'e1rm' | 'reps';

export interface PrInfo {
  type: PrType;
  prev: number; // previous record value (kg, estimated kg, or reps)
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
  warmup?: boolean;
  failure?: boolean;
  rir?: number;
  rpe?: number;
  pr?: PrInfo;
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

db.version(2)
  .stores({ exercises: '++id, name, muscle, slug' })
  .upgrade((tx) => tx.table('exercises').toCollection().modify(upgradeExercise));

/** Links an exercise from the first app version to the library, keeping its id (and thus its history). */
function upgradeExercise(ex: Exercise) {
  const slug = LEGACY_NAMES[ex.name];
  if (slug) {
    ex.slug = slug;
  } else if (!ex.slug) {
    ex.custom = true;
    ex.muscle = LEGACY_MUSCLES[ex.muscle] ?? ex.muscle;
  }
  ex.aliases ??= [];
}

/** Adds missing library exercises and refreshes names, aliases and tips of existing ones. */
export async function syncLibrary() {
  await db.transaction('rw', db.exercises, async () => {
    const rows = await db.exercises.toArray();
    const bySlug = new Map(rows.filter((r) => r.slug).map((r) => [r.slug!, r]));
    for (const lib of LIBRARY) {
      const data = {
        slug: lib.slug,
        name: lib.name,
        aliases: lib.aliases,
        muscle: lib.muscle,
        equipment: lib.equipment,
        tip: lib.tip,
      };
      let row = bySlug.get(lib.slug);
      if (!row) {
        // An exercise you already log (your own, an old one, or from the schema) that the library now has:
        // link it instead of adding a duplicate, so its history stays.
        const match = rows.find((r) => !r.slug && linksTo(r, lib));
        if (match) {
          await db.exercises.update(match.id, { ...data, custom: undefined });
          row = { ...match, ...data };
          bySlug.set(lib.slug, row);
          continue;
        }
        await db.exercises.add(data as Exercise);
      } else if (JSON.stringify({ ...data }) !== JSON.stringify(pick(row, Object.keys(data))))
        await db.exercises.update(row.id, data);
    }
  });
}

function linksTo(row: Exercise, lib: (typeof LIBRARY)[number]): boolean {
  if (row.planKey && BIBLIOTHEEK[row.planKey] === lib.slug) return true;
  if (LEGACY_NAMES[row.name] === lib.slug) return true;
  const n = normalize(row.name);
  return [lib.name, ...lib.aliases].some((label) => normalize(label) === n);
}

function pick(o: object, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, (o as Record<string, unknown>)[k]]));
}

export function restFor(workout: Workout | undefined, ex: Exercise | undefined): number {
  if (!ex) return 90;
  return workout?.rest?.[ex.id] ?? defaultsFor(ex).rest;
}

/** Work sets of the most recent finished workout that contained this exercise. */
export async function previousSets(exerciseId: number, beforeWorkoutId?: number): Promise<WorkoutSet[]> {
  const all = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter((s) => s.done && !s.warmup)
    .toArray();
  const byWorkout = new Map<number, WorkoutSet[]>();
  for (const s of all) {
    if (s.workoutId === beforeWorkoutId) continue;
    (byWorkout.get(s.workoutId) ?? byWorkout.set(s.workoutId, []).get(s.workoutId)!).push(s);
  }
  if (byWorkout.size === 0) return [];
  const workouts = await db.workouts.bulkGet([...byWorkout.keys()]);
  const latest = workouts.filter((w): w is Workout => !!w && !!w.endedAt).sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!latest) return [];
  return byWorkout.get(latest.id)!.sort((a, b) => a.order - b.order);
}

export async function startWorkout(template?: Template, extraExercises: Exercise[] = []): Promise<number> {
  return db.transaction('rw', db.workouts, db.sets, db.exercises, async () => {
    const items = template?.items ?? [];
    const rest: Record<number, number> = {};
    for (const i of items) if (i.restSeconds) rest[i.exerciseId] = i.restSeconds;
    const workoutId = await db.workouts.add({
      name: template?.name ?? 'Losse workout',
      templateId: template?.id,
      startedAt: Date.now(),
      exerciseIds: items.map((i) => i.exerciseId),
      rest,
      supersets: items.filter((i) => i.supersetNext).map((i) => i.exerciseId),
    } as Workout);
    const progress: Record<number, number> = {};
    for (const item of items) {
      const ex = await db.exercises.get(item.exerciseId);
      const range = parseRepRange(item.reps);
      const added = await addPlannedSets(workoutId, item.exerciseId, item.sets, range?.[0] ?? null, {
        progression: ex && range ? { range, increment: progressionIncrement(ex, getSettings().weightStep) } : undefined,
      });
      if (added) progress[item.exerciseId] = added;
    }
    if (Object.keys(progress).length) await db.workouts.update(workoutId, { progress });
    if (extraExercises.length) await addExercisesToWorkout((await db.workouts.get(workoutId))!, extraExercises);
    return workoutId;
  });
}

export interface PlanTarget {
  repRange?: [number, number]; // prefilled reps are kept within this range
  weightDelta?: number; // added to last time's weight (schema progression)
  progression?: { range: [number, number]; increment: number }; // double progression for programs
}

/**
 * Adds sets for an exercise, prefilled with what you did last time. With `progression`, the weight
 * goes up when last time every set reached the top of the rep range. Returns the kg added.
 */
export async function addPlannedSets(
  workoutId: number,
  exerciseId: number,
  count: number,
  targetReps: number | null,
  target: PlanTarget = {},
) {
  const prev = await previousSets(exerciseId, workoutId);
  const existing = await db.sets.where({ workoutId, exerciseId }).toArray();
  const work = existing.filter((s) => !s.warmup).length;
  const maxOrder = Math.max(-1, ...existing.map((s) => s.order));
  const pg = target.progression;
  const up = !!pg && work === 0 && shouldProgress(prev, pg.range, pg.increment);
  const rows = Array.from({ length: count }, (_, i) => {
    const p = prev[work + i] ?? prev[prev.length - 1];
    const delta = up ? pg!.increment : (target.weightDelta ?? 0);
    return {
      workoutId,
      exerciseId,
      order: maxOrder + 1 + i,
      weight: p?.weight != null ? Math.max(0, p.weight + delta) : null,
      reps: up ? pg!.range[0] : clampReps(p?.reps ?? targetReps, target.repRange),
      done: false,
    } as WorkoutSet;
  });
  await db.sets.bulkAdd(rows);
  return up ? pg!.increment : 0;
}

function clampReps(reps: number | null, range?: [number, number]): number | null {
  if (!range) return reps;
  if (reps == null) return range[0];
  return Math.min(range[1], Math.max(range[0], reps));
}

export async function addExercisesToWorkout(workout: Workout, exercises: Exercise[]) {
  const fresh = exercises.filter((ex) => !workout.exerciseIds.includes(ex.id));
  if (!fresh.length) return;
  const rest = { ...workout.rest };
  for (const ex of fresh) rest[ex.id] = defaultsFor(ex).rest;
  await db.workouts.update(workout.id, { exerciseIds: [...workout.exerciseIds, ...fresh.map((x) => x.id)], rest });
  const progress = { ...workout.progress };
  for (const ex of fresh) {
    const d = defaultsFor(ex);
    const added = await addPlannedSets(workout.id, ex.id, d.sets, d.reps, {
      progression: { range: [d.reps, d.reps], increment: progressionIncrement(ex, getSettings().weightStep) },
    });
    if (added) progress[ex.id] = added;
  }
  if (Object.keys(progress).length) await db.workouts.update(workout.id, { progress });
}

export async function removeExerciseFromWorkout(workout: Workout, exerciseId: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const exerciseIds = workout.exerciseIds.filter((id) => id !== exerciseId);
    await db.workouts.update(workout.id, { exerciseIds, supersets: cleanLinks(exerciseIds, workout.supersets) });
    await db.sets.where({ workoutId: workout.id, exerciseId }).delete();
  });
}

/** Inserts a copy of the set directly below it. */
export async function duplicateSet(set: WorkoutSet) {
  await db.transaction('rw', db.sets, async () => {
    await db.sets
      .where({ workoutId: set.workoutId, exerciseId: set.exerciseId })
      .filter((s) => s.order > set.order)
      .modify((s) => {
        s.order += 1;
      });
    await db.sets.add({
      workoutId: set.workoutId,
      exerciseId: set.exerciseId,
      order: set.order + 1,
      weight: set.weight,
      reps: set.reps,
      warmup: set.warmup,
      done: false,
    } as WorkoutSet);
  });
}

/** Deletes a set and returns a function that restores it. */
export async function deleteSet(set: WorkoutSet): Promise<() => Promise<void>> {
  await db.sets.delete(set.id);
  return async () => {
    await db.sets.put(set);
  };
}

/**
 * Recomputes the PR flags of one exercise in a workout against earlier finished workouts.
 * Returns the sets that just became a PR.
 */
export async function recomputePrs(workoutId: number, exerciseId: number): Promise<WorkoutSet[]> {
  const self = await db.workouts.get(workoutId);
  const others = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter((s) => s.done && !s.warmup && s.workoutId !== workoutId)
    .toArray();
  const workouts = await db.workouts.bulkGet([...new Set(others.map((s) => s.workoutId))]);
  // Only workouts that were finished before this one count as history.
  const earlier = new Set(
    workouts.filter((w) => w?.endedAt && (!self || w.startedAt < self.startedAt)).map((w) => w!.id),
  );
  const history = others.filter((s) => earlier.has(s.workoutId));

  const sets = (await db.sets.where({ workoutId, exerciseId }).toArray()).sort((a, b) => a.order - b.order);
  const prs = computePrs(sets, history);
  const fresh: WorkoutSet[] = [];
  for (let i = 0; i < sets.length; i++) {
    if (JSON.stringify(sets[i].pr) === JSON.stringify(prs[i])) continue;
    await db.sets.update(sets[i].id, { pr: prs[i] });
    if (prs[i] && !sets[i].pr) fresh.push({ ...sets[i], pr: prs[i] });
  }
  return fresh;
}

/** Recomputes PRs of finished workouts after `startedAt` that contain these exercises, oldest first. */
export async function recomputeLaterPrs(startedAt: number, exerciseIds: number[]) {
  const later = (await db.workouts.where('startedAt').above(startedAt).sortBy('startedAt')).filter((w) => w.endedAt);
  for (const w of later) {
    for (const exId of exerciseIds) if (w.exerciseIds.includes(exId)) await recomputePrs(w.id, exId);
  }
}

/** Ends editing a finished workout: drops sets that aren't ticked and refreshes all affected PRs. */
export async function finishEdit(workoutId: number) {
  const w = await db.workouts.get(workoutId);
  if (!w) return;
  const touched = [...w.exerciseIds];
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets
      .where('workoutId')
      .equals(workoutId)
      .filter((s) => !s.done)
      .delete();
    const used = new Set((await db.sets.where('workoutId').equals(workoutId).toArray()).map((s) => s.exerciseId));
    const exerciseIds = w.exerciseIds.filter((id) => used.has(id));
    await db.workouts.update(workoutId, { exerciseIds, supersets: cleanLinks(exerciseIds, w.supersets) });
  });
  for (const exId of touched) await recomputePrs(workoutId, exId);
  await recomputeLaterPrs(w.startedAt, touched);
}

/** Inserts warm-up sets before the first work set of an exercise. */
export async function addWarmupSets(workoutId: number, exerciseId: number, planned: PlannedSet[]) {
  await db.transaction('rw', db.sets, async () => {
    const all = (await db.sets.where({ workoutId, exerciseId }).toArray()).sort((a, b) => a.order - b.order);
    const firstWork = all.find((s) => !s.warmup);
    const at = firstWork?.order ?? (all.length ? all[all.length - 1].order + 1 : 0);
    await db.sets
      .where({ workoutId, exerciseId })
      .filter((s) => s.order >= at)
      .modify((s) => {
        s.order += planned.length;
      });
    await db.sets.bulkAdd(
      planned.map(
        (p, i) =>
          ({
            workoutId,
            exerciseId,
            order: at + i,
            weight: p.weight,
            reps: p.reps,
            warmup: true,
            done: false,
          }) as WorkoutSet,
      ),
    );
  });
}

/** Ends the workout; sets that were never ticked off are discarded. */
export async function finishWorkout(workoutId: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets
      .where('workoutId')
      .equals(workoutId)
      .filter((s) => !s.done)
      .delete();
    const w = await db.workouts.get(workoutId);
    if (!w) return;
    const remaining = await db.sets.where('workoutId').equals(workoutId).toArray();
    const used = new Set(remaining.map((s) => s.exerciseId));
    await db.workouts.update(workoutId, {
      endedAt: Date.now(),
      exerciseIds: w.exerciseIds.filter((id) => used.has(id)),
      supersets: cleanLinks(
        w.exerciseIds.filter((id) => used.has(id)),
        w.supersets,
      ),
    });
  });
}

export async function deleteWorkout(workoutId: number) {
  const w = await db.workouts.get(workoutId);
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(workoutId).delete();
    await db.workouts.delete(workoutId);
  });
  // Records set after this workout may have depended on it.
  if (w?.endedAt) await recomputeLaterPrs(w.startedAt, w.exerciseIds);
}

export async function addToTemplate(templateId: number, exercises: Exercise[]) {
  const t = await db.templates.get(templateId);
  if (!t) return;
  const have = new Set(t.items.map((i) => i.exerciseId));
  const items = exercises
    .filter((ex) => !have.has(ex.id))
    .map((ex) => {
      const d = defaultsFor(ex);
      return { exerciseId: ex.id, sets: d.sets, reps: String(d.reps), restSeconds: d.rest };
    });
  await db.templates.update(templateId, { items: [...t.items, ...items] });
}

export async function exportData(): Promise<string> {
  const [exercises, templates, workouts, sets] = await Promise.all([
    db.exercises.toArray(),
    db.templates.toArray(),
    db.workouts.toArray(),
    db.sets.toArray(),
  ]);
  const plan = getPlan();
  return JSON.stringify({
    version: 2,
    exportedAt: new Date().toISOString(),
    exercises,
    templates,
    workouts,
    sets,
    plan,
  });
}

export async function importData(json: string) {
  const data = JSON.parse(json);
  if (data.version !== 1 && data.version !== 2) throw new Error('Onbekend bestandsformaat');
  if (data.version === 1) data.exercises.forEach(upgradeExercise);
  await db.transaction('rw', [db.exercises, db.templates, db.workouts, db.sets], async () => {
    await Promise.all([db.exercises.clear(), db.templates.clear(), db.workouts.clear(), db.sets.clear()]);
    await db.exercises.bulkAdd(data.exercises);
    await db.templates.bulkAdd(data.templates);
    await db.workouts.bulkAdd(data.workouts);
    await db.sets.bulkAdd(data.sets);
  });
  await syncLibrary();
  if (data.plan) restorePlan(data.plan);
}
