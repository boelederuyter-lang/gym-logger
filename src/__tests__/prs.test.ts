import { describe, expect, it } from 'vitest';
import { computePrs, describePr, detectPr } from '../prs';
import { warmupSets } from '../warmup';

const s = (weight: number | null, reps: number | null, warmup = false) => ({ weight, reps, warmup });

describe('detectPr', () => {
  const history = [s(60, 8), s(62.5, 5), s(60, 10)];

  it('gives no PR without history', () => {
    expect(detectPr(s(100, 5), [], [s(50, 5)])).toBeUndefined();
  });

  it('heaviest weight wins first', () => {
    expect(detectPr(s(65, 5), history, [])).toEqual({ type: 'weight', prev: 62.5 });
  });

  it('then best estimated 1RM', () => {
    // 60 × 12 = 84 > 62,5 × 5 = 72,9 and 60 × 10 = 80
    expect(detectPr(s(60, 12), history, [])).toEqual({ type: 'e1rm', prev: 80 });
  });

  it('then most reps at the same weight', () => {
    const h = [s(100, 1), s(50, 8)];
    expect(detectPr(s(50, 9), h, [])).toEqual({ type: 'reps', prev: 8 });
  });

  it('counts earlier sets in the same workout', () => {
    expect(detectPr(s(65, 5), history, [s(65, 5)])).toBeUndefined();
  });

  it('ignores warm-up sets on both sides', () => {
    expect(detectPr(s(70, 5, true), history, [])).toBeUndefined();
    expect(detectPr(s(65, 5), [...history, s(80, 3, true)], [])).toEqual({ type: 'weight', prev: 62.5 });
  });

  it('handles bodyweight exercises by reps', () => {
    expect(detectPr(s(null, 15), [s(null, 12)], [])).toEqual({ type: 'reps', prev: 12 });
  });
});

describe('computePrs', () => {
  it('only marks the first set that breaks the record', () => {
    const sets = [
      { ...s(65, 5), done: true },
      { ...s(65, 5), done: true },
      { ...s(67.5, 3), done: true },
      { ...s(70, 3), done: false },
    ];
    expect(computePrs(sets, [s(62.5, 5)]).map((p) => p?.type)).toEqual(['weight', undefined, 'weight', undefined]);
  });
});

describe('describePr', () => {
  it('uses a decimal comma', () => {
    expect(describePr(s(65, 5), { type: 'weight', prev: 62.5 })).toEqual({
      title: 'Zwaarste gewicht ooit',
      detail: 'Zwaarste gewicht ooit: 65 kg × 5',
      previous: 'Vorig record 62,5 kg',
    });
  });
});

describe('warmupSets', () => {
  it('builds the barbell ladder', () => {
    expect(warmupSets(100, true, 20, 2.5)).toEqual([
      { weight: 20, reps: 10 },
      { weight: 40, reps: 8 },
      { weight: 60, reps: 5 },
      { weight: 80, reps: 3 },
    ]);
  });

  it('rounds to the step, never below the bar and without duplicates', () => {
    // 40% of 45 = 18 -> bar (dup), 60% = 27 -> 27,5, 80% = 36 -> 35
    expect(warmupSets(45, true, 20, 2.5)).toEqual([
      { weight: 20, reps: 10 },
      { weight: 27.5, reps: 5 },
      { weight: 35, reps: 3 },
    ]);
  });

  it('uses 50% and 75% for other exercises', () => {
    expect(warmupSets(30, false, 20, 2)).toEqual([
      { weight: 16, reps: 8 },
      { weight: 22, reps: 4 },
    ]);
  });

  it('returns nothing when the work weight is the bar', () => {
    expect(warmupSets(20, true, 20, 2.5)).toEqual([]);
  });
});
