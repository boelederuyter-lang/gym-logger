import type { Equipment } from './library/exercises';

/** "8-12" → [8, 12], "10" → [10, 10]; null when there is no number. */
export function parseRepRange(text: string | number | null | undefined): [number, number] | null {
  if (text == null) return null;
  const nums = String(text).match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  const lo = Math.min(...nums.slice(0, 2));
  const hi = Math.max(...nums.slice(0, 2));
  return [lo, hi];
}

/** How much weight to add: double the step for barbell leg and glute lifts (e.g. 5 kg), none without weight. */
export function progressionIncrement(ex: { muscle: string; equipment: Equipment }, step: number): number {
  if (ex.equipment === 'bodyweight') return 0;
  if (ex.equipment === 'barbell' && (ex.muscle === 'Benen' || ex.muscle === 'Billen')) return step * 2;
  return step;
}

/**
 * Double progression: when every work set last time reached the top of the rep range,
 * it's time to add weight and start again at the bottom of the range.
 */
export function shouldProgress(
  previous: { weight: number | null; reps: number | null }[],
  range: [number, number],
  increment: number,
): boolean {
  return (
    increment > 0 && previous.length > 0 && previous.every((s) => (s.weight ?? 0) > 0 && (s.reps ?? 0) >= range[1])
  );
}
