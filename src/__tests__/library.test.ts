import { describe, expect, it } from 'vitest';
import { LEGACY_NAMES, LIBRARY, LIBRARY_BY_SLUG, MUSCLES } from '../library/exercises';
import { defaultsFor } from '../library/defaults';
import { ik, solve } from '../library/poses';
import { matches, normalize } from '../library/search';

describe('library', () => {
  it('has 129 exercises with unique slugs and names', () => {
    expect(LIBRARY).toHaveLength(129);
    expect(new Set(LIBRARY.map((e) => e.slug)).size).toBe(129);
    expect(new Set(LIBRARY.map((e) => e.name)).size).toBe(129);
  });

  it('gives every exercise a tip, aliases and a known muscle group', () => {
    for (const ex of LIBRARY) {
      expect(ex.tip.length, ex.name).toBeGreaterThan(10);
      expect(ex.aliases.length, ex.name).toBeGreaterThan(0);
      expect(MUSCLES).toContain(ex.muscle);
    }
  });

  it('maps every legacy name to an existing slug', () => {
    for (const slug of Object.values(LEGACY_NAMES)) expect(LIBRARY_BY_SLUG.has(slug), slug).toBe(true);
  });

  it('produces finite geometry for every animation frame', () => {
    for (const ex of LIBRARY) {
      for (const u of [0, 0.5, 1]) {
        const g = solve(ex.anim, u);
        for (const seg of g.body)
          for (const p of seg.pts) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), ex.name).toBe(true);
      }
    }
  });
});

describe('ik', () => {
  it('keeps bone lengths and bends towards the hint', () => {
    const [joint, end] = ik([0, 0], [10, 0], 8, 8, [0, 1]);
    expect(Math.hypot(joint[0], joint[1])).toBeCloseTo(8);
    expect(Math.hypot(end[0] - joint[0], end[1] - joint[1])).toBeCloseTo(8);
    expect(joint[1]).toBeGreaterThan(0);
  });

  it('clamps unreachable targets to a straight limb', () => {
    const [, end] = ik([0, 0], [100, 0], 8, 8, [0, 1]);
    expect(end[0]).toBeCloseTo(16, 1);
  });
});

describe('search', () => {
  it('ignores accents and case', () => {
    expect(normalize('Héél Zwáár')).toBe('heel zwaar');
  });

  it('searches name, aliases, muscle group and equipment', () => {
    const bench = LIBRARY_BY_SLUG.get('bankdrukken')!;
    expect(matches(bench, 'BENCH')).toBe(true);
    expect(matches(bench, 'borst stang')).toBe(true);
    expect(matches(bench, 'kabel')).toBe(false);
  });
});

describe('defaults', () => {
  it('follows the rules per type', () => {
    expect(defaultsFor({ muscle: 'Core', equipment: 'cable' })).toEqual({ sets: 3, reps: 15, rest: 60 });
    expect(defaultsFor({ muscle: 'Benen', equipment: 'barbell' })).toEqual({ sets: 3, reps: 8, rest: 150 });
    expect(defaultsFor({ muscle: 'Rug', equipment: 'cable' })).toEqual({ sets: 3, reps: 12, rest: 90 });
    expect(defaultsFor({ muscle: 'Armen', equipment: 'dumbbell' })).toEqual({ sets: 3, reps: 10, rest: 90 });
  });
});
