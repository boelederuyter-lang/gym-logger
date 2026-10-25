import { describe, expect, it } from 'vitest';
import { BASIS, COACH_BY_ID, MATERIAAL_PER_KEUZE, type MateriaalKeuze } from '../coach/exercises';
import {
  beschikbaar,
  coachVarianten,
  epley,
  genereerCoachSchema,
  gewichtVoorReps,
  kiesSplit,
  repsVoor,
  rondAf,
  schatMinuten,
  setsPerGroep,
  startgewicht,
  startHint,
  wisselCoachOefening,
} from '../coach/generator';
import { kiesMateriaal, standaardDagen, standaardProfiel, TIJDEN, type Profiel } from '../coach/profile';

const SEEDS = [1, 42, 7919, 123456, 99991];
const profiel = (p: Partial<Profiel> = {}): Profiel => ({ ...standaardProfiel(), ...p });
const ids = (p: Profiel, seed: number) =>
  genereerCoachSchema(p, seed).dagen.flatMap((d) => d.oefeningen.map((o) => o.id));
const get = (id: string) => COACH_BY_ID.get(id)!;

describe('split', () => {
  it('kiest de indeling op basis van dagen en niveau', () => {
    const s = (n: number, niveau: Profiel['niveau'] = 'beginner') => kiesSplit({ dagen: standaardDagen(n), niveau });
    expect(s(2).dagen).toEqual(['fbA', 'fbB']);
    expect(s(3).dagen).toEqual(['fbA', 'fbB', 'fbC']);
    expect(s(3, 'ervaren').dagen).toEqual(['push', 'pull', 'legs']);
    expect(s(4).dagen).toEqual(['upperA', 'lowerA', 'upperB', 'lowerB']);
    expect(s(5).dagen).toEqual(['upperA', 'lowerA', 'push', 'pull', 'legs']);
    expect(s(5, 'ervaren').dagen).toEqual(['push', 'pull', 'legs', 'upperA', 'lowerA']);
    expect(s(6).dagen).toEqual(['push', 'pull', 'legs', 'push', 'pull', 'legs']);
  });

  it('geeft bij PPL ×2 elke dag een eigen naam', () => {
    const namen = genereerCoachSchema(profiel({ dagen: standaardDagen(6), niveau: 'gevorderd' }), 1).dagen.map(
      (d) => d.naam,
    );
    expect(namen).toEqual(['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B']);
  });
});

describe('schema', () => {
  it('is deterministisch: zelfde profiel en seed = zelfde schema', () => {
    const p = profiel({ dagen: standaardDagen(4) });
    expect(genereerCoachSchema(p, 5)).toEqual(genereerCoachSchema(p, 5));
    expect(ids(p, 5)).not.toEqual(ids(p, 6));
  });

  it('heeft per dag een naam, een uitleg van twee zinnen en de gekozen weekdag', () => {
    const p = profiel({ dagen: [1, 3, 5] });
    const s = genereerCoachSchema(p, 3);
    s.dagen.forEach((d, i) => {
      expect(d.naam).toBeTruthy();
      expect(d.uitleg!.split('. ').length).toBe(2);
      expect(d.weekdag).toBe(p.dagen[i]);
    });
    expect(s.coach).toBe(true);
  });

  it('zet nooit twee keer dezelfde oefening op één dag', () => {
    for (const n of [2, 3, 4, 5, 6])
      for (const seed of SEEDS) {
        for (const d of genereerCoachSchema(profiel({ dagen: standaardDagen(n), niveau: 'ervaren' }), seed).dagen) {
          expect(new Set(d.oefeningen.map((o) => o.id)).size).toBe(d.oefeningen.length);
        }
      }
  });

  it('kiest alleen oefeningen die passen bij je materiaal en niveau', () => {
    for (const keuze of Object.keys(MATERIAAL_PER_KEUZE) as MateriaalKeuze[])
      for (const seed of SEEDS) {
        const p = kiesMateriaal(profiel({ dagen: standaardDagen(4) }), keuze);
        for (const id of ids(p, seed)) {
          const c = get(id);
          expect(
            c.materiaal.every((m) => p.materiaal.includes(m)),
            `${keuze}: ${id}`,
          ).toBe(true);
          expect(c.niveau, id).toBe('beginner');
        }
      }
  });

  it('laat oefeningen weg die een geblesseerd gewricht belasten', () => {
    for (const blessure of ['knie', 'schouder', 'onderrug'] as const)
      for (const seed of SEEDS) {
        const p = profiel({ dagen: standaardDagen(4), blessures: [blessure] });
        for (const id of ids(p, seed)) expect(get(id).gewrichten, `${blessure}: ${id}`).not.toContain(blessure);
      }
  });

  it('vult elke dag met genoeg oefeningen, ook thuis', () => {
    for (const keuze of Object.keys(MATERIAAL_PER_KEUZE) as MateriaalKeuze[])
      for (const n of [2, 3, 4, 5, 6]) {
        const s = genereerCoachSchema(kiesMateriaal(profiel({ dagen: standaardDagen(n) }), keuze), 1);
        for (const d of s.dagen) expect(d.oefeningen.length, `${keuze} ${n} ${d.naam}`).toBeGreaterThanOrEqual(3);
      }
  });

  it('vult benendagen ook bij een knieblessure (met reserveslots)', () => {
    for (const seed of SEEDS) {
      const s = genereerCoachSchema(profiel({ dagen: standaardDagen(4), blessures: ['knie'], tijd: 60 }), seed);
      for (const d of s.dagen) expect(d.oefeningen.length, d.naam).toBeGreaterThanOrEqual(4);
    }
  });

  it('kiest bij een volledige gym vooral bekende basisoefeningen als hoofdoefening', () => {
    for (const niveau of ['beginner', 'gevorderd', 'ervaren'] as const)
      for (const seed of SEEDS)
        for (const d of genereerCoachSchema(profiel({ niveau, dagen: standaardDagen(4) }), seed).dagen)
          expect(BASIS.has(d.oefeningen[0].id), `${niveau} ${d.naam}: ${d.oefeningen[0].id}`).toBe(true);
  });

  it('begint elke dag met een compound-oefening als hoofdoefening', () => {
    for (const n of [2, 3, 4, 5, 6])
      for (const d of genereerCoachSchema(profiel({ dagen: standaardDagen(n) }), 9).dagen) {
        expect(d.oefeningen[0].rol, d.naam).toBe('hoofd');
        expect(d.oefeningen.filter((o) => o.rol === 'hoofd')).toHaveLength(1);
      }
  });
});

describe('tijd', () => {
  it('past binnen de gekozen tijd', () => {
    for (const tijd of TIJDEN)
      for (const niveau of ['beginner', 'gevorderd', 'ervaren'] as const)
        for (const seed of SEEDS) {
          const s = genereerCoachSchema(
            profiel({ tijd, niveau, dagen: standaardDagen(4), prioriteit: ['armen'] }),
            seed,
          );
          for (const d of s.dagen) expect(schatMinuten(d.oefeningen), `${tijd} ${niveau}`).toBeLessThanOrEqual(tijd);
        }
  });

  it('geeft meer oefeningen of sets bij meer tijd', () => {
    const volume = (tijd: Profiel['tijd']) =>
      genereerCoachSchema(profiel({ tijd, niveau: 'gevorderd' }), 1).dagen[0].oefeningen.reduce(
        (n, o) => n + o.sets,
        0,
      );
    expect(volume(30)).toBeLessThan(volume(60));
    expect(volume(60)).toBeLessThan(volume(90));
  });
});

describe('reps en rust', () => {
  it('volgen het doel', () => {
    const squat = get('squat');
    expect(repsVoor(squat, 'sterker', 'hoofd')).toEqual([3, 6]);
    expect(repsVoor(squat, 'spiermassa', 'hoofd')).toEqual([6, 10]);
    expect(repsVoor(squat, 'spiermassa', 'compound')).toEqual([8, 12]);
    expect(repsVoor(squat, 'vet verliezen', 'compound')).toEqual([10, 15]);
    expect(repsVoor(squat, 'fitheid', 'hoofd')).toEqual([8, 12]);
  });

  it('isolatie altijd 10–15, lichaamsgewicht en tijd houden hun eigen bereik', () => {
    expect(repsVoor(get('lateral-raises'), 'sterker', 'isolatie')).toEqual([10, 15]);
    expect(repsVoor(get('push-up'), 'sterker', 'hoofd')).toEqual(get('push-up').reps);
    expect(repsVoor(get('plank'), 'spiermassa', 'isolatie')).toEqual(get('plank').reps);
  });

  it('liggen binnen de grenzen per doel in een heel schema', () => {
    const grens = { sterker: [3, 10], spiermassa: [6, 12], 'vet verliezen': [8, 15], fitheid: [8, 15] } as const;
    for (const doel of Object.keys(grens) as (keyof typeof grens)[])
      for (const d of genereerCoachSchema(profiel({ doel }), 2).dagen)
        for (const o of d.oefeningen) {
          if (o.eenheid === 'sec' || o.zonderGewicht) continue;
          const [lo, hi] = o.rol === 'isolatie' ? [10, 15] : grens[doel];
          expect(o.reps[0], `${doel} ${o.id}`).toBeGreaterThanOrEqual(lo);
          expect(o.reps[1], `${doel} ${o.id}`).toBeLessThanOrEqual(hi);
        }
  });
});

describe('prioriteit', () => {
  it('geeft een prioriteitsspiergroep 1–2 extra sets per week', () => {
    for (const seed of SEEDS)
      for (const groep of ['borst', 'armen', 'billen'] as const) {
        const basis = profiel({ dagen: standaardDagen(4), niveau: 'gevorderd' });
        const zonder = setsPerGroep(genereerCoachSchema(basis, seed).dagen.map((d) => d.oefeningen));
        const met = setsPerGroep(
          genereerCoachSchema({ ...basis, prioriteit: [groep] }, seed).dagen.map((d) => d.oefeningen),
        );
        const extra = met[groep] - zonder[groep];
        expect(extra, `${groep} seed ${seed}`).toBeGreaterThanOrEqual(1);
        expect(extra, `${groep} seed ${seed}`).toBeLessThanOrEqual(2);
      }
  });
});

describe('startgewicht', () => {
  it('Epley: 100 kg × 5 ≈ 116,7 kg 1RM, en terug', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 1);
    expect(epley(100, 1)).toBe(100);
    expect(gewichtVoorReps(epley(100, 5), 5)).toBeCloseTo(100, 5);
  });

  it('rondt omlaag af op de stap, stang minstens 20 kg', () => {
    expect(rondAf(83.9, 2.5)).toBe(82.5);
    expect(rondAf(84.9, 5)).toBe(80);
    expect(rondAf(23.9, 2)).toBe(22);
    expect(rondAf(12, 2.5, get('bankdrukken'))).toBe(20);
  });

  it('rekent vanaf je basisoefening, aan de lichte kant', () => {
    const kracht = { squat: { kg: 100, reps: 5 }, bankdrukken: { kg: 80, reps: 8 } };
    // squat: 1RM 116,7; bij 10 reps → 87,5 → afgerond op 5 kg = 85
    expect(startgewicht(get('squat'), [6, 10], kracht)).toBe(85);
    // bankdrukken: 1RM 101,3; bij 12 reps → 72,4 → omlaag afgerond op 2,5 kg = 70
    expect(startgewicht(get('bankdrukken'), [8, 12], kracht)).toBe(70);
    // dumbbell bankdrukken: 35% per hand, op 2 kg
    expect(startgewicht(get('dumbbell-bankdrukken'), [8, 12], kracht)).toBe(24);
    // lichter dan wat je nu bij die reps haalt
    expect(startgewicht(get('squat'), [3, 5], kracht)!).toBeLessThanOrEqual(100);
  });

  it('geeft geen gewicht zonder data of voor lichaamsgewicht', () => {
    expect(startgewicht(get('squat'), [6, 10], {})).toBeUndefined();
    expect(startgewicht(get('leg-press'), [6, 10], { squat: { kg: 100, reps: 5 } })).toBeUndefined();
    expect(startgewicht(get('push-up'), [8, 20], { bankdrukken: { kg: 80, reps: 8 } })).toBeUndefined();
  });

  it('geeft anders een duidelijke hint', () => {
    expect(startHint(get('leg-press'), [8, 12])).toBe('Kies een gewicht waarmee je 12 reps net haalt.');
    expect(startHint(get('push-up'), [8, 20])).toMatch(/8 tot 20/);
    expect(startHint(get('plank'), [30, 60])).toMatch(/30 sec/);
  });

  it('staat in het schema', () => {
    const p = profiel({ doel: 'sterker', niveau: 'gevorderd', kracht: { squat: { kg: 100, reps: 5 } } });
    const squat = genereerCoachSchema(p, 1)
      .dagen.flatMap((d) => d.oefeningen)
      .find((o) => o.id === 'squat');
    expect(squat?.startgewicht).toBe(rondAf(gewichtVoorReps(epley(100, 5), squat!.reps[1]), 5));
    const legPress = genereerCoachSchema(profiel(), 1)
      .dagen.flatMap((d) => d.oefeningen)
      .find((o) => o.startgewicht === undefined && !o.zonderGewicht);
    expect(legPress?.startHint).toMatch(/Kies een gewicht/);
  });
});

describe('oefeningen wisselen', () => {
  const p = profiel({ dagen: standaardDagen(4), blessures: ['knie'] });
  const s = genereerCoachSchema(p, 4);

  it('biedt varianten met hetzelfde patroon die je blessure ontzien', () => {
    const opties = coachVarianten(s, p, 0, 0);
    expect(opties.length).toBeGreaterThan(0);
    for (const c of opties) {
      expect(c.patroon).toBe(s.dagen[0].oefeningen[0].patroon);
      expect(c.gewrichten).not.toContain('knie');
      expect(s.dagen[0].oefeningen.map((o) => o.id)).not.toContain(c.id);
    }
    expect(beschikbaar(p).map((c) => c.id)).toEqual(expect.arrayContaining(opties.map((c) => c.id)));
  });

  it('vervangt één oefening en houdt sets en rol', () => {
    const nieuw = coachVarianten(s, p, 0, 1)[0];
    const na = wisselCoachOefening(s, p, 0, 1, nieuw.id);
    expect(na.dagen[0].oefeningen[1].id).toBe(nieuw.id);
    expect(na.dagen[0].oefeningen[1].sets).toBe(s.dagen[0].oefeningen[1].sets);
    expect(na.dagen[0].oefeningen[1].rol).toBe(s.dagen[0].oefeningen[1].rol);
    expect(na.dagen[1]).toBe(s.dagen[1]);
  });
});

describe('volgorde', () => {
  it('zet compounds voor isolatie en core als laatste', () => {
    for (const seed of SEEDS)
      for (const d of genereerCoachSchema(profiel({ dagen: standaardDagen(4), blessures: ['knie'] }), seed).dagen) {
        const plek = d.oefeningen.map((o) =>
          o.rol === 'hoofd' ? 0 : o.rol === 'compound' ? 1 : o.patroon === 'core' ? 3 : 2,
        );
        expect(plek, d.naam).toEqual([...plek].sort((a, b) => a - b));
      }
  });
});

describe('variatie binnen een dag', () => {
  // Full body en upper/lower hebben elk patroon één keer, dus daar hoort nooit een bijna-dubbele
  // te staan. (Een pull-dag heeft bewust twee rij-oefeningen.)
  it('zet geen bijna-dubbele oefeningen op één dag als er iets anders kan', () => {
    for (const seed of SEEDS)
      for (const n of [2, 3, 4])
        for (const d of genereerCoachSchema(profiel({ dagen: standaardDagen(n), niveau: 'gevorderd' }), seed).dagen) {
          const ids = d.oefeningen.filter((o) => o.patroon !== 'isolatie').map((o) => o.id);
          for (const id of ids)
            for (const ander of ids)
              if (id !== ander) expect(get(id).alternatieven, `${d.naam}: ${id} + ${ander}`).not.toContain(ander);
        }
  });
});
