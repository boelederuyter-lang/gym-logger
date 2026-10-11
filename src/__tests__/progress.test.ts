import { describe, expect, it } from 'vitest';
import { fmtMetric, inPeriod, isWeighted, metricValue, metricsFor, niceTicks, type Session } from '../progress';

const session = (date: number, sets: [number | null, number][]): Session => ({
  workoutId: date,
  date,
  name: 'Push',
  sets: sets.map(([weight, reps]) => ({ weight, reps })),
});

describe('metrics', () => {
  const s = session(1, [
    [60, 8],
    [65, 5],
    [60, 10],
  ]);

  it('computes the session values', () => {
    expect(metricValue(s, 'e1rm')).toBe(80);
    expect(metricValue(s, 'weight')).toBe(65);
    expect(metricValue(s, 'volume')).toBe(60 * 8 + 65 * 5 + 60 * 10);
    expect(metricValue(s, 'reps')).toBe(10);
    expect(metricValue(s, 'totalReps')).toBe(23);
  });

  it('switches to reps for exercises without weight', () => {
    const bw = [session(1, [[null, 12]])];
    expect(isWeighted(bw)).toBe(false);
    expect(metricsFor(false)).toEqual(['reps', 'totalReps']);
    expect(metricsFor(isWeighted([s]))).toEqual(['e1rm', 'weight', 'volume']);
  });

  it('formats with a decimal comma', () => {
    expect(fmtMetric(82.5, 'e1rm')).toBe('82,5 kg');
    expect(fmtMetric(12345, 'volume')).toBe('12.345 kg');
    expect(fmtMetric(12, 'reps')).toBe('12 reps');
  });
});

describe('periods', () => {
  it('keeps sessions within the period', () => {
    const now = new Date(2026, 9, 11).getTime();
    const list = [session(new Date(2026, 5, 1).getTime(), []), session(new Date(2026, 8, 1).getTime(), [])];
    expect(inPeriod(list, '3m', now)).toHaveLength(1);
    expect(inPeriod(list, '1y', now)).toHaveLength(2);
  });
});

describe('niceTicks', () => {
  it('uses round steps that cover the range', () => {
    expect(niceTicks(62, 81)).toEqual([60, 70, 80, 90]);
    expect(niceTicks(62, 68)).toEqual([62, 64, 66, 68]);
    expect(niceTicks(0, 1000)).toEqual([0, 500, 1000]);
    const t = niceTicks(97.5, 97.5);
    expect(t[0]).toBeLessThan(97.5);
    expect(t[t.length - 1]).toBeGreaterThan(97.5);
  });
});
