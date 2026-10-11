import type { WorkoutSet } from './db';

export function fmtWeight(w: number | null | undefined): string {
  if (w == null) return '–';
  return Number.isInteger(w) ? String(w) : w.toFixed(2).replace(/0+$/, '').replace('.', ',');
}

export function fmtSet(s: Pick<WorkoutSet, 'weight' | 'reps'>): string {
  return `${fmtWeight(s.weight)} kg × ${s.reps ?? '–'}`;
}

export function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function volume(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + (s.done ? (s.weight ?? 0) * (s.reps ?? 0) : 0), 0);
}

/** Epley estimate of one-rep max. */
export function e1rm(s: Pick<WorkoutSet, 'weight' | 'reps'>): number {
  if (!s.weight || !s.reps) return 0;
  return s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30);
}
