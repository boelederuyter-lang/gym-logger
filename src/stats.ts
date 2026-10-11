import { e1rm } from './format';

const DAY = 24 * 60 * 60 * 1000;

/** Monday 00:00 of the week containing `ts` (local time). */
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d.getTime();
}

/** For each day Monday..Sunday of the current week: whether you trained. */
export function weekDays(workoutStarts: number[], now: number): boolean[] {
  const start = startOfWeek(now);
  const days = Array(7).fill(false);
  for (const ts of workoutStarts) {
    if (ts < start) continue;
    const d = new Date(ts);
    const idx = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start) / DAY);
    if (idx >= 0 && idx < 7) days[idx] = true;
  }
  return days;
}

/**
 * Number of consecutive weeks with at least one workout, ending this week.
 * A week without training yet doesn't break the streak until it's over.
 */
export function weekStreak(workoutStarts: number[], now: number): number {
  const weeks = new Set(workoutStarts.map(startOfWeek));
  let week = startOfWeek(now);
  if (!weeks.has(week)) week = startOfWeek(week - DAY);
  let streak = 0;
  while (weeks.has(week)) {
    streak++;
    week = startOfWeek(week - DAY);
  }
  return streak;
}

/** Estimated minutes: every set takes ~40 s plus its rest. */
export function estimateMinutes(items: { sets: number; rest: number }[]): number {
  const seconds = items.reduce((sum, i) => sum + i.sets * (40 + i.rest), 0);
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

/** "vandaag", "gisteren", "3 dagen geleden", "2 weken geleden" or "nog nooit". */
export function relativeDay(ts: number | undefined, now: number): string {
  if (!ts) return 'nog nooit';
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (days <= 0) return 'vandaag';
  if (days === 1) return 'gisteren';
  if (days < 14) return `${days} dagen geleden`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `${weeks} weken geleden`;
  return `${Math.round(days / 30)} maanden geleden`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Best set: highest estimated 1RM, or most reps without weight. */
export function bestSet<T extends { weight: number | null; reps: number | null }>(sets: T[]): T | undefined {
  let best: T | undefined;
  for (const s of sets) {
    if (!best) best = s;
    else if (s.weight || best.weight) {
      if (e1rm(s) > e1rm(best)) best = s;
    } else if ((s.reps ?? 0) > (best.reps ?? 0)) best = s;
  }
  return best;
}
