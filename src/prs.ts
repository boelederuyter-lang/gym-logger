import { e1rm, fmtWeight } from './format';
import type { PrInfo, PrType } from './db';

export interface SetLike {
  weight: number | null;
  reps: number | null;
  warmup?: boolean;
}

const counts = (s: SetLike) => !s.warmup && (s.reps ?? 0) > 0;

/**
 * Checks whether `set` is a personal record compared to earlier finished workouts (`history`)
 * plus the sets done before it in the current workout (`earlier`). Priority: heaviest weight,
 * best estimated 1RM, most reps at the same weight. No history means no PR.
 */
export function detectPr(set: SetLike, history: SetLike[], earlier: SetLike[]): PrInfo | undefined {
  if (!counts(set)) return undefined;
  const past = history.filter(counts);
  if (past.length === 0) return undefined;
  const prior = [...past, ...earlier.filter(counts)];
  const w = set.weight ?? 0;

  const maxWeight = Math.max(...prior.map((s) => s.weight ?? 0));
  if (w > maxWeight) return { type: 'weight', prev: maxWeight };

  const best = Math.max(...prior.map(e1rm));
  if (w > 0 && e1rm(set) > best + 1e-9) return { type: 'e1rm', prev: round(best) };

  const same = prior.filter((s) => (s.weight ?? 0) === w);
  if (same.length) {
    const maxReps = Math.max(...same.map((s) => s.reps ?? 0));
    if ((set.reps ?? 0) > maxReps) return { type: 'reps', prev: maxReps };
  }
  return undefined;
}

/** Recomputes PRs for the sets of one exercise in one workout (in order). */
export function computePrs<T extends SetLike & { done: boolean }>(
  sets: T[],
  history: SetLike[],
): (PrInfo | undefined)[] {
  const earlier: SetLike[] = [];
  return sets.map((s) => {
    if (!s.done) return undefined;
    const pr = detectPr(s, history, earlier);
    if (!s.warmup) earlier.push(s);
    return pr;
  });
}

const round = (n: number) => Math.round(n * 10) / 10;

export const PR_TITLES: Record<PrType, string> = {
  weight: 'Zwaarste gewicht ooit',
  e1rm: 'Beste geschatte 1RM',
  reps: 'Meeste reps',
};

/** Two lines for the banner, e.g. "Zwaarste gewicht ooit: 65 kg × 5" and "Vorig record 62,5 kg". */
export function describePr(set: SetLike, pr: PrInfo): { title: string; detail: string; previous: string } {
  const w = set.weight ?? 0;
  const lift = w > 0 ? `${fmtWeight(w)} kg × ${set.reps}` : `${set.reps} reps`;
  switch (pr.type) {
    case 'weight':
      return {
        title: PR_TITLES.weight,
        detail: `${PR_TITLES.weight}: ${lift}`,
        previous: `Vorig record ${fmtWeight(pr.prev)} kg`,
      };
    case 'e1rm':
      return {
        title: PR_TITLES.e1rm,
        detail: `${PR_TITLES.e1rm}: ${fmtWeight(round(e1rm(set)))} kg (${lift})`,
        previous: `Vorig record ${fmtWeight(pr.prev)} kg`,
      };
    case 'reps':
      return {
        title: w > 0 ? `Meeste reps met ${fmtWeight(w)} kg` : PR_TITLES.reps,
        detail: w > 0 ? `Meeste reps met ${fmtWeight(w)} kg: ${set.reps}` : `${PR_TITLES.reps}: ${set.reps}`,
        previous: `Vorig record ${pr.prev} reps`,
      };
  }
}
