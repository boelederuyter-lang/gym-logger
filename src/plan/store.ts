import { useEffect, useState } from 'react';
import { genereerCoachSchema, wisselCoachOefening } from '../coach/generator';
import { naarOudeInvoer, normaliseerProfiel, type Profiel } from '../coach/profile';
import {
  genereerSchema,
  nieuweSeed,
  normaliseerInvoer,
  pasWisselsToe,
  type Invoer,
  type Schema,
  type Wissel,
} from './generator';

/** The training schema and where you are in the 4-week block. Lives in localStorage. */
export interface PlanState {
  versie: 1;
  invoer: Invoer;
  schema: Schema;
  blok: number;
  week: number;
  gedaan: Record<string, boolean>; // `${week}-${dag}` ticked off by hand (trained elsewhere)
  gestart: string;
  wissels?: Wissel[]; // exercises you swapped for another variant, applied on top of the generated schema
  profiel?: Profiel; // coach schemas: the questionnaire answers the schema was made from
  herstelWeken?: number[]; // coach schemas: Mondays (timestamps) of recovery weeks
}

// Same key as the former standalone schema app on the same site, so an existing schema carries over.
const KEY = 'trainingsschema.v1';

function load(): PlanState | null {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    const invoer = normaliseerInvoer(data?.invoer);
    if (!data || data.versie !== 1 || !invoer || !data.schema) return null;
    if (data.schema.coach) {
      const profiel = normaliseerProfiel(data.profiel);
      return profiel ? { ...data, invoer, profiel } : null;
    }
    // Schemas from the standalone app lack the library link; the seed regenerates the same schema.
    if (!data.schema.dagen?.[0]?.oefeningen?.[0]?.patroon)
      data.schema = pasWisselsToe(genereerSchema(invoer, data.schema.seed), data.wissels);
    return { ...data, invoer };
  } catch {
    return null;
  }
}

const listeners = new Set<(p: PlanState | null) => void>();
let current = load();

function save(next: PlanState | null) {
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable; keep in memory only
  }
  listeners.forEach((l) => l(current));
}

export function getPlan(): PlanState | null {
  return current;
}

export function usePlan(): PlanState | null {
  const [p, setP] = useState(current);
  useEffect(() => {
    listeners.add(setP);
    return () => void listeners.delete(setP);
  }, []);
  return p;
}

/** A schema from the coach, made from the questionnaire answers. */
export function createCoachPlan(profiel: Profiel, seed = nieuweSeed(), wissels: Wissel[] = []) {
  save({
    versie: 1,
    invoer: naarOudeInvoer(profiel),
    profiel,
    schema: coachSchema(profiel, seed, wissels),
    wissels,
    blok: 1,
    week: 1,
    gedaan: {},
    gestart: new Date().toISOString(),
  });
}

function coachSchema(profiel: Profiel, seed: number, wissels: Wissel[] = []) {
  return wissels.reduce(
    (schema, w) => wisselCoachOefening(schema, profiel, w.dag, w.index, w.id),
    genereerCoachSchema(profiel, seed),
  );
}

export function createPlan(invoer: Invoer, seed = nieuweSeed(), wissels: Wissel[] = []) {
  save({
    versie: 1,
    invoer,
    schema: pasWisselsToe(genereerSchema(invoer, seed), wissels),
    wissels,
    blok: 1,
    week: 1,
    gedaan: {},
    gestart: new Date().toISOString(),
  });
}

/** New exercises for the same answers; block and week stay. */
export function regeneratePlan() {
  if (!current) return;
  const schema = current.profiel
    ? genereerCoachSchema(current.profiel, nieuweSeed())
    : genereerSchema(current.invoer, nieuweSeed());
  save({ ...current, schema, gedaan: {}, wissels: [] });
}

/** Swaps one exercise of the schema for a variant; a later swap of the same spot replaces the earlier one. */
export function swapExercise(w: Wissel) {
  if (!current) return;
  const wissels = [...(current.wissels ?? []).filter((x) => x.dag !== w.dag || x.index !== w.index), w];
  const schema = current.profiel
    ? wisselCoachOefening(current.schema, current.profiel, w.dag, w.index, w.id)
    : pasWisselsToe(current.schema, [w]);
  save({ ...current, schema, wissels });
}

/** Marks a week (its Monday timestamp) as a recovery week for the whole schema. */
export function markeerHerstel(maandag: number) {
  if (!current || current.herstelWeken?.includes(maandag)) return;
  save({ ...current, herstelWeken: [...(current.herstelWeken ?? []), maandag] });
}

export function setWeek(week: number) {
  if (current) save({ ...current, week });
}

export function toggleDone(week: number, dag: number) {
  if (!current) return;
  const gedaan = { ...current.gedaan };
  const k = `${week}-${dag}`;
  if (gedaan[k]) delete gedaan[k];
  else gedaan[k] = true;
  save({ ...current, gedaan });
}

export function startNewBlock() {
  if (!current) return;
  save({ ...current, blok: current.blok + 1, week: 1, gedaan: {}, gestart: new Date().toISOString() });
}

export function deletePlan() {
  save(null);
}

/** For backups: the export file carries the schema next to the logbook. */
export function restorePlan(data: unknown) {
  if (!data) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    return;
  }
  save(load());
}

// ---------- share links ----------

/** A link holds only the answers and the seed; the receiver generates the same schema. */
export function shareLink(plan: PlanState, base = location.href): string {
  const i = plan.invoer;
  const url = new URL(base);
  const wissels = (plan.wissels ?? []).map((w) => `!${w.dag}.${w.index}.${w.id}`).join('');
  if (plan.profiel) {
    // Coach schema: the answers that shape the schema (not your strength or bodyweight) as base64 JSON.
    const { kracht: _k, lichaamsgewicht: _l, ...rest } = plan.profiel;
    url.hash = `c=${toBase64Url(JSON.stringify(rest))}.${plan.schema.seed}${wissels}`;
    return url.toString();
  }
  url.hash = `s=${[i.doel, i.niveau, i.dagen, i.tijd, i.apparatuur, plan.schema.seed].join('.')}${wissels}`;
  return url.toString();
}

export interface SharedPlan {
  invoer: Invoer;
  seed: number;
  wissels: Wissel[];
  profiel?: Profiel;
}

function parseWissels(text: string): Wissel[] {
  return text
    .split('!')
    .filter(Boolean)
    .map((part) => {
      const [dag, index, ...id] = part.split('.');
      return { dag: Number(dag), index: Number(index), id: id.join('.') };
    });
}

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const fromBase64Url = (text: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

/** Starts the schema from a shared link: a coach schema or one from the old form. */
export function adoptShared(shared: SharedPlan) {
  if (shared.profiel) createCoachPlan(shared.profiel, shared.seed, shared.wissels);
  else createPlan(shared.invoer, shared.seed, shared.wissels);
}

export function parseShareHash(hash: string): SharedPlan | null {
  const coach = hash.match(/^#c=([\w-]+)\.(\d+)((?:!\d+\.\d+\.[a-z0-9-]+)*)$/);
  if (coach) {
    try {
      const profiel = normaliseerProfiel(JSON.parse(fromBase64Url(coach[1])));
      const seed = Number(coach[2]);
      if (!profiel || !Number.isInteger(seed)) return null;
      return { invoer: naarOudeInvoer(profiel), seed, wissels: parseWissels(coach[3]), profiel };
    } catch {
      return null;
    }
  }
  const match = hash.match(/^#s=([\w.]+)((?:!\d+\.\d+\.[a-z0-9-]+)*)$/);
  if (!match) return null;
  const wissels = parseWissels(match[2]);
  const [doel, niveau, dagen, tijd, apparatuur, seed] = match[1].split('.');
  const invoer = normaliseerInvoer({ doel, niveau, dagen, tijd, apparatuur });
  const s = Number(seed);
  if (!invoer || !Number.isInteger(s) || s < 0) return null;
  return { invoer, seed: s, wissels };
}
