import { e1rm, fmtWeight } from './format';

export interface SessionSet {
  weight: number | null;
  reps: number | null;
  pr?: unknown;
}

export interface Session {
  workoutId: number;
  date: number;
  name: string;
  sets: SessionSet[];
}

export type Metric = 'e1rm' | 'weight' | 'volume' | 'reps' | 'totalReps';
export type Period = '3m' | '1y' | 'all';

export const METRIC_LABELS: Record<Metric, string> = {
  e1rm: 'Geschatte 1RM',
  weight: 'Zwaarste gewicht',
  volume: 'Volume',
  reps: 'Meeste reps',
  totalReps: 'Totaal reps',
};

export const PERIOD_LABELS: Record<Period, string> = { '3m': '3 mnd', '1y': '1 jaar', all: 'Alles' };

/** Exercises without any weight are charted by reps. */
export function isWeighted(sessions: Session[]): boolean {
  return sessions.some((s) => s.sets.some((x) => (x.weight ?? 0) > 0));
}

export function metricsFor(weighted: boolean): Metric[] {
  return weighted ? ['e1rm', 'weight', 'volume'] : ['reps', 'totalReps'];
}

export function metricValue(session: Session, metric: Metric): number {
  const sets = session.sets;
  switch (metric) {
    case 'e1rm':
      return round1(Math.max(0, ...sets.map(e1rm)));
    case 'weight':
      return Math.max(0, ...sets.map((s) => s.weight ?? 0));
    case 'volume':
      return Math.round(sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0));
    case 'reps':
      return Math.max(0, ...sets.map((s) => s.reps ?? 0));
    case 'totalReps':
      return sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  }
}

export function fmtMetric(value: number, metric: Metric): string {
  if (metric === 'reps' || metric === 'totalReps') return `${value} reps`;
  if (metric === 'volume') return `${Math.round(value).toLocaleString('nl-NL')} kg`;
  return `${fmtWeight(round1(value))} kg`;
}

export function inPeriod(sessions: Session[], period: Period, now: number): Session[] {
  if (period === 'all') return sessions;
  const from = new Date(now);
  if (period === '3m') from.setMonth(from.getMonth() - 3);
  else from.setFullYear(from.getFullYear() - 1);
  return sessions.filter((s) => s.date >= from.getTime());
}

/** About `count` evenly spaced ticks on round numbers (1, 2, 2,5 or 5 × 10^n) covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(round1(v * 100) / 100);
  if (ticks[ticks.length - 1] < max) ticks.push(round1((ticks[ticks.length - 1] + step) * 100) / 100);
  return ticks;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
