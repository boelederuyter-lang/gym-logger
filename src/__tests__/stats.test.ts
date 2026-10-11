import { describe, expect, it } from 'vitest';
import { bestSet, estimateMinutes, relativeDay, startOfWeek, weekDays, weekStreak } from '../stats';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
// Saturday 11 October 2026
const now = at(2026, 10, 11);

describe('week stats', () => {
  it('starts weeks on Monday', () => {
    expect(new Date(startOfWeek(now)).getDate()).toBe(5);
  });

  it('marks training days of this week', () => {
    expect(weekDays([at(2026, 10, 5), at(2026, 10, 8), at(2026, 10, 4)], now)).toEqual([true, false, false, true, false, false, false]);
  });

  it('counts consecutive weeks', () => {
    const starts = [at(2026, 10, 6), at(2026, 9, 30), at(2026, 9, 22), at(2026, 9, 1)];
    expect(weekStreak(starts, now)).toBe(3);
  });

  it('keeps the streak alive during a week without training yet', () => {
    expect(weekStreak([at(2026, 10, 1), at(2026, 9, 24)], now)).toBe(2);
    expect(weekStreak([at(2026, 9, 24)], now)).toBe(0);
  });
});

describe('helpers', () => {
  it('estimates duration in 5-minute steps', () => {
    expect(estimateMinutes([{ sets: 3, rest: 150 }, { sets: 3, rest: 90 }])).toBe(15);
  });

  it('describes relative days', () => {
    expect(relativeDay(undefined, now)).toBe('nog nooit');
    expect(relativeDay(at(2026, 10, 11, 7), now)).toBe('vandaag');
    expect(relativeDay(at(2026, 10, 10), now)).toBe('gisteren');
    expect(relativeDay(at(2026, 10, 7), now)).toBe('4 dagen geleden');
    expect(relativeDay(at(2026, 9, 20), now)).toBe('3 weken geleden');
  });

  it('picks the best set by estimated 1RM or reps', () => {
    expect(bestSet([{ weight: 60, reps: 8 }, { weight: 65, reps: 5 }, { weight: 55, reps: 12 }])).toEqual({ weight: 55, reps: 12 });
    expect(bestSet([{ weight: null, reps: 12 }, { weight: null, reps: 15 }])).toEqual({ weight: null, reps: 15 });
  });
});
