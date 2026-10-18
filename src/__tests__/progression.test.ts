import { describe, expect, it } from 'vitest';
import { platesPerSide } from '../plates';
import { parseRepRange, progressionIncrement, shouldProgress } from '../progression';

describe('progression', () => {
  it('reads rep ranges', () => {
    expect(parseRepRange('8-12')).toEqual([8, 12]);
    expect(parseRepRange('10')).toEqual([10, 10]);
    expect(parseRepRange('12 – 8')).toEqual([8, 12]);
    expect(parseRepRange('')).toBeNull();
    expect(parseRepRange(8)).toEqual([8, 8]);
  });

  it('adds more for barbell legs, nothing for bodyweight', () => {
    expect(progressionIncrement({ muscle: 'Benen', equipment: 'barbell' }, 2.5)).toBe(5);
    expect(progressionIncrement({ muscle: 'Borst', equipment: 'barbell' }, 2.5)).toBe(2.5);
    expect(progressionIncrement({ muscle: 'Borst', equipment: 'bodyweight' }, 2.5)).toBe(0);
  });

  it('progresses only when every set hit the top of the range', () => {
    const s = (weight: number | null, reps: number) => ({ weight, reps });
    expect(shouldProgress([s(60, 12), s(60, 12), s(60, 12)], [8, 12], 2.5)).toBe(true);
    expect(shouldProgress([s(60, 12), s(60, 11), s(60, 12)], [8, 12], 2.5)).toBe(false);
    expect(shouldProgress([s(60, 8), s(60, 8)], [8, 8], 2.5)).toBe(true);
    expect(shouldProgress([], [8, 12], 2.5)).toBe(false);
    expect(shouldProgress([s(null, 15)], [10, 12], 2.5)).toBe(false);
    expect(shouldProgress([s(60, 12)], [8, 12], 0)).toBe(false);
  });
});

describe('platesPerSide', () => {
  it('splits the weight over both sides', () => {
    expect(platesPerSide(100, 20)).toEqual({ plates: [25, 15], rest: 0 });
    expect(platesPerSide(82.5, 20)).toEqual({ plates: [25, 5, 1.25], rest: 0 });
    expect(platesPerSide(61, 20)).toEqual({ plates: [20], rest: 0.5 });
  });

  it('returns null for the empty bar or less', () => {
    expect(platesPerSide(20, 20)).toBeNull();
    expect(platesPerSide(15, 20)).toBeNull();
  });
});
