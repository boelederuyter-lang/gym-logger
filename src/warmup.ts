export interface PlannedSet {
  weight: number;
  reps: number;
}

const BARBELL_SCHEME: [number, number][] = [
  [0, 10], // empty bar
  [0.4, 8],
  [0.6, 5],
  [0.8, 3],
];
const OTHER_SCHEME: [number, number][] = [
  [0.5, 8],
  [0.75, 4],
];

/** Warm-up sets leading up to `workWeight`, rounded to `step`, never lighter than the bar, without duplicates. */
export function warmupSets(workWeight: number, barbell: boolean, barWeight: number, step: number): PlannedSet[] {
  const out: PlannedSet[] = [];
  for (const [pct, reps] of barbell ? BARBELL_SCHEME : OTHER_SCHEME) {
    let w = pct === 0 ? barWeight : roundTo(workWeight * pct, step);
    if (barbell) w = Math.max(w, barWeight);
    if (w <= 0 || w >= workWeight) continue;
    if (out.some((s) => s.weight === w)) continue;
    out.push({ weight: w, reps });
  }
  return out;
}

function roundTo(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 100) / 100;
}
