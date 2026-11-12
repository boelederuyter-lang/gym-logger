import { afterEach, describe, expect, it, vi } from 'vitest';
import { decimal, deviceLang, locale, setLangForTest, tr } from '../i18n';
import { ENGLISH, MUSCLE_EN } from '../library/english';
import { MUSCLES } from '../library/exercises';

afterEach(() => setLangForTest('nl'));

describe('tr en formattering', () => {
  it('kiest de tekst in de huidige taal', () => {
    expect(tr('Hallo', 'Hello')).toBe('Hallo');
    setLangForTest('en');
    expect(tr('Hallo', 'Hello')).toBe('Hello');
  });

  it('decimaalteken en locale volgen de taal', () => {
    expect(decimal(82.5)).toBe('82,5');
    expect(locale()).toBe('nl-NL');
    setLangForTest('en');
    expect(decimal(82.5)).toBe('82.5');
    expect(locale()).toBe('en-GB');
  });

  it('volgt de taal van het apparaat', () => {
    vi.stubGlobal('navigator', { language: 'nl-BE' });
    expect(deviceLang()).toBe('nl');
    vi.stubGlobal('navigator', { language: 'de-DE' });
    expect(deviceLang()).toBe('en');
    vi.unstubAllGlobals();
  });
});

describe('Engelse oefeningen', () => {
  it('heeft een Engelse naam en tip voor elke bibliotheekoefening', async () => {
    const { LIBRARY } = await import('../library/exercises');
    for (const x of LIBRARY) {
      expect(ENGLISH[x.slug], x.slug).toBeDefined();
      expect(ENGLISH[x.slug][1].length, x.slug).toBeGreaterThan(20);
    }
    const names = Object.values(ENGLISH).map(([n]) => n.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('vertaalt elke spiergroep', () => {
    for (const m of MUSCLES) expect(MUSCLE_EN[m], m).toBeDefined();
  });

  it('gebruikt in het Engels de Engelse naam en houdt de Nederlandse als alias', async () => {
    vi.resetModules();
    const i18n = await import('../i18n');
    i18n.setLangForTest('en');
    const { LIBRARY_BY_SLUG, muscleLabel, EQUIPMENT_LABELS } = await import('../library/exercises');
    const bench = LIBRARY_BY_SLUG.get('bankdrukken')!;
    expect(bench.name).toBe('Bench press');
    expect(bench.aliases).toContain('Bankdrukken');
    expect(bench.tip).toMatch(/shoulder blades/);
    expect(muscleLabel('Borst')).toBe('Chest');
    expect(EQUIPMENT_LABELS.barbell).toBe('Barbell');
    i18n.setLangForTest('nl');
    vi.resetModules();
  });
});

describe('coach in het Engels', () => {
  it('geeft de reden in het Engels', async () => {
    const { adviseer } = await import('../coach/progression');
    setLangForTest('en');
    const bank = {
      naam: 'Bench press',
      reps: [8, 10] as [number, number],
      sets: 3,
      stap: 2.5,
      progressie: 'gewicht' as const,
    };
    const sessie = (reps: number[]) => ({ datum: 1, sets: reps.map((r) => ({ gewicht: 60, reps: r })) });
    expect(adviseer(bank, [sessie([10, 10, 10])]).reden).toBe('Last time you made 3×10, so +2.5 kg.');
    expect(adviseer(bank, [sessie([10, 9, 8])]).reden).toBe(
      'Last time 10, 9 and 8 at 60 kg. Same weight, try to add 1 rep per set.',
    );
    expect(adviseer(bank, []).reden).toBe('First time: pick a weight you can just manage for 10 reps.');
  });

  it('maakt het schema met Engelse dagteksten', async () => {
    vi.resetModules();
    const i18n = await import('../i18n');
    i18n.setLangForTest('en');
    const { genereerCoachSchema } = await import('../coach/generator');
    const { standaardProfiel } = await import('../coach/profile');
    const s = genereerCoachSchema(standaardProfiel(), 1);
    expect(s.dagen[0].focus).toBe('Full body');
    expect(s.dagen[0].uitleg).toMatch(/^You train your whole body, with /);
    expect(s.dagen[0].oefeningen.every((o) => /^[\x00-\x7F’–]*$/.test(o.naam))).toBe(true);
    i18n.setLangForTest('nl');
    vi.resetModules();
  });
});
