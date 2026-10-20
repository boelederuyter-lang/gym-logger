import { describe, expect, it } from 'vitest';
import { estimateSeconds, fitToTime, patternOf, replacements, type CoachExercise } from '../coach';
import { LIBRARY } from '../library/exercises';

const all: CoachExercise[] = LIBRARY.map((e, i) => ({
  id: i + 1,
  name: e.name,
  slug: e.slug,
  muscle: e.muscle,
  equipment: e.equipment,
}));
const bySlug = (slug: string) => all.find((e) => e.slug === slug)!;

describe('replacements', () => {
  it('knows the movement pattern of library exercises', () => {
    expect(patternOf(bySlug('bankdrukken'))).toBe('hpush');
    expect(patternOf(bySlug('lat-pulldown'))).toBe('vpull');
  });

  it('offers exercises with the same pattern, other equipment first', () => {
    const bench = bySlug('bankdrukken');
    const list = replacements(bench, all);
    expect(list.length).toBeGreaterThan(2);
    for (const o of list) expect(patternOf(o)).toBe('hpush');
    expect(list[0].equipment).not.toBe('barbell');
    expect(list.map((o) => o.slug)).not.toContain('bankdrukken');
  });

  it('skips exercises already in the workout', () => {
    const bench = bySlug('bankdrukken');
    const db = bySlug('dumbbell-bankdrukken');
    expect(replacements(bench, all, [db.id]).map((o) => o.id)).not.toContain(db.id);
  });

  it('falls back to the muscle group for custom exercises', () => {
    const own: CoachExercise = { id: 999, name: 'Mijn borstoefening', muscle: 'Borst', equipment: 'machine' };
    for (const o of replacements(own, all)) expect(o.muscle).toBe('Borst');
  });
});

describe('fitToTime', () => {
  const items = [
    { id: 1, openSets: 4, rest: 180 },
    { id: 2, openSets: 3, rest: 150 },
    { id: 3, openSets: 3, rest: 90 },
    { id: 4, openSets: 3, rest: 90 },
    { id: 5, openSets: 3, rest: 60 },
  ];

  it('changes nothing but rest when it already fits', () => {
    const plan = fitToTime(items, 120);
    expect(plan.dropped).toEqual([]);
    expect(plan.sets).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 3 });
    expect(plan.rest[1]).toBe(120);
    expect(plan.rest[3]).toBe(60);
  });

  it('fits the workout in the time you have', () => {
    const plan = fitToTime(items, 20);
    expect(plan.minutes).toBeLessThanOrEqual(20);
    const kept = Object.entries(plan.sets).map(([id, n]) => ({ openSets: n, rest: plan.rest[Number(id)] }));
    expect(estimateSeconds(kept)).toBeLessThanOrEqual(20 * 60);
  });

  it('protects the main lifts', () => {
    const plan = fitToTime(items, 15);
    expect(plan.sets[1]).toBeGreaterThanOrEqual(2);
    expect(plan.sets[2]).toBeGreaterThanOrEqual(2);
    expect(plan.dropped).not.toContain(1);
  });

  it('drops the last exercises first', () => {
    const plan = fitToTime(items, 12);
    expect(plan.dropped.length).toBeGreaterThan(0);
    // what's dropped is always a tail of the workout
    expect(plan.dropped).toEqual(items.slice(items.length - plan.dropped.length).map((i) => i.id));
  });
});
