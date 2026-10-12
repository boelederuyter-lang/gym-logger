import { useEffect, useState } from 'react';
import { genereerSchema, nieuweSeed, normaliseerInvoer, type Invoer, type Schema } from './generator';

/** The training schema and where you are in the 4-week block. Lives in localStorage. */
export interface PlanState {
  versie: 1;
  invoer: Invoer;
  schema: Schema;
  blok: number;
  week: number;
  gedaan: Record<string, boolean>; // `${week}-${dag}` ticked off by hand (trained elsewhere)
  gestart: string;
}

// Same key as the former standalone schema app on the same site, so an existing schema carries over.
const KEY = 'trainingsschema.v1';

function load(): PlanState | null {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    const invoer = normaliseerInvoer(data?.invoer);
    if (!data || data.versie !== 1 || !invoer || !data.schema) return null;
    // Schemas from the standalone app lack the library link; the seed regenerates the same schema.
    if (!data.schema.dagen?.[0]?.oefeningen?.[0]?.patroon) data.schema = genereerSchema(invoer, data.schema.seed);
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

export function createPlan(invoer: Invoer, seed = nieuweSeed()) {
  save({
    versie: 1,
    invoer,
    schema: genereerSchema(invoer, seed),
    blok: 1,
    week: 1,
    gedaan: {},
    gestart: new Date().toISOString(),
  });
}

/** New exercises for the same answers; block and week stay. */
export function regeneratePlan() {
  if (!current) return;
  save({ ...current, schema: genereerSchema(current.invoer, nieuweSeed()), gedaan: {} });
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
  url.hash = `s=${[i.doel, i.niveau, i.dagen, i.tijd, i.apparatuur, plan.schema.seed].join('.')}`;
  return url.toString();
}

export function parseShareHash(hash: string): { invoer: Invoer; seed: number } | null {
  const match = hash.match(/^#s=([\w.]+)$/);
  if (!match) return null;
  const [doel, niveau, dagen, tijd, apparatuur, seed] = match[1].split('.');
  const invoer = normaliseerInvoer({ doel, niveau, dagen, tijd, apparatuur });
  const s = Number(seed);
  if (!invoer || !Number.isInteger(s) || s < 0) return null;
  return { invoer, seed: s };
}
