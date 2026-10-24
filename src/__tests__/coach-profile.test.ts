import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { MATERIAAL_PER_KEUZE } from '../coach/exercises';
import {
  controleer,
  kiesMateriaal,
  leesGetal,
  naarOudeInvoer,
  normaliseerProfiel,
  samenvatting,
  standaardDagen,
  standaardProfiel,
  STAPPEN,
  vanOudeInvoer,
  voortgang,
  wisselDag,
  wisselMateriaal,
  wisselPrioriteit,
  type Profiel,
} from '../coach/profile';
import { getProfiel, saveProfiel } from '../coach/profileStore';
import { exportData, importData } from '../db';

describe('leesGetal', () => {
  it('accepteert komma en punt', () => {
    expect(leesGetal('82,5')).toBe(82.5);
    expect(leesGetal('82.5')).toBe(82.5);
    expect(leesGetal(' 100 ')).toBe(100);
    expect(leesGetal('60 kg')).toBe(60);
  });

  it('weigert lege en ongeldige invoer', () => {
    expect(leesGetal('')).toBeUndefined();
    expect(leesGetal('abc')).toBeUndefined();
    expect(leesGetal('1,2,3')).toBeUndefined();
    expect(leesGetal('-5')).toBeUndefined();
    expect(leesGetal(undefined)).toBeUndefined();
    expect(leesGetal(NaN)).toBeUndefined();
  });
});

describe('dagen', () => {
  it('spreidt de standaarddagen met rust ertussen', () => {
    expect(standaardDagen(2)).toEqual([0, 3]);
    expect(standaardDagen(3)).toEqual([0, 2, 4]);
    for (let n = 2; n <= 6; n++) expect(standaardDagen(n)).toHaveLength(n);
    expect(standaardDagen(9)).toHaveLength(6);
    expect(standaardDagen(1)).toHaveLength(2);
  });

  it('wisselDag zet aan en uit, gesorteerd, max 6', () => {
    expect(wisselDag([0, 4], 2)).toEqual([0, 2, 4]);
    expect(wisselDag([0, 2, 4], 2)).toEqual([0, 4]);
    expect(wisselDag([0, 1, 2, 3, 4, 5], 6)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('prioriteit', () => {
  it('houdt hoogstens 2 spiergroepen, de nieuwste wint', () => {
    expect(wisselPrioriteit([], 'borst')).toEqual(['borst']);
    expect(wisselPrioriteit(['borst', 'rug'], 'armen')).toEqual(['rug', 'armen']);
    expect(wisselPrioriteit(['borst', 'rug'], 'borst')).toEqual(['rug']);
  });
});

describe('materiaal', () => {
  it('een snelkeuze zet het bijbehorende materiaal', () => {
    const p = kiesMateriaal(standaardProfiel(), 'thuis met dumbbells');
    expect(p.materiaal).toEqual(MATERIAAL_PER_KEUZE['thuis met dumbbells']);
    expect(p.materiaalKeuze).toBe('thuis met dumbbells');
  });

  it('zelf aanvinken wordt "zelf"; lichaamsgewicht blijft altijd', () => {
    let p = kiesMateriaal(standaardProfiel(), 'alleen lichaamsgewicht');
    p = wisselMateriaal(p, 'dumbbells');
    expect(p.materiaalKeuze).toBe('zelf');
    expect(p.materiaal).toEqual(['dumbbells', 'lichaamsgewicht']);
    expect(wisselMateriaal(p, 'lichaamsgewicht').materiaal).toContain('lichaamsgewicht');
    expect(wisselMateriaal(p, 'dumbbells').materiaal).toEqual(['lichaamsgewicht']);
  });
});

describe('controleer', () => {
  it('keurt het standaardprofiel goed', () => {
    expect(controleer(standaardProfiel())).toBeNull();
  });

  it('vraagt om minstens 2 dagen', () => {
    expect(controleer({ ...standaardProfiel(), dagen: [1] })).toMatch(/minstens 2/);
  });
});

describe('normaliseerProfiel', () => {
  it('laat een geldig profiel heel', () => {
    const p: Profiel = {
      ...standaardProfiel(),
      doel: 'sterker',
      niveau: 'ervaren',
      dagen: [0, 1, 3, 4],
      tijd: 90,
      prioriteit: ['borst'],
      blessures: ['knie'],
      kracht: { squat: { kg: 100, reps: 5 } },
      lichaamsgewicht: 80.5,
    };
    expect(normaliseerProfiel(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('herstelt kapotte velden en weigert onzin', () => {
    expect(normaliseerProfiel(null)).toBeNull();
    expect(normaliseerProfiel({ doel: 'vliegen', niveau: 'beginner' })).toBeNull();
    const p = normaliseerProfiel({
      doel: 'fitheid',
      niveau: 'beginner',
      dagen: [9, 1],
      tijd: 50,
      prioriteit: ['borst', 'rug', 'armen'],
      kracht: { squat: { kg: 'x', reps: 5 }, bankdrukken: { kg: 60, reps: 8 } },
    })!;
    expect(p.dagen).toHaveLength(2);
    expect(p.tijd).toBe(60);
    expect(p.prioriteit).toHaveLength(2);
    expect(p.kracht).toEqual({ bankdrukken: { kg: 60, reps: 8 } });
  });
});

describe('overstap vanaf het oude formulier', () => {
  it('vertaalt de oude keuzes', () => {
    const p = vanOudeInvoer({ doel: 'kracht', niveau: 'gevorderd', dagen: 4, tijd: 75, apparatuur: 'dumbbells' });
    expect(p.doel).toBe('sterker');
    expect(p.niveau).toBe('gevorderd');
    expect(p.dagen).toHaveLength(4);
    expect(p.tijd).toBe(75);
    expect(p.materiaalKeuze).toBe('thuis met dumbbells');
    expect(controleer(p)).toBeNull();
  });

  it('en terug, met afronding naar wat het oude formulier kent', () => {
    const p: Profiel = {
      ...standaardProfiel(),
      doel: 'vet verliezen',
      niveau: 'ervaren',
      dagen: standaardDagen(6),
      tijd: 90,
    };
    expect(naarOudeInvoer(p)).toEqual({
      doel: 'vetverlies',
      niveau: 'gevorderd',
      dagen: 5,
      tijd: 75,
      apparatuur: 'gym',
    });
    expect(naarOudeInvoer(kiesMateriaal(p, 'alleen lichaamsgewicht')).apparatuur).toBe('thuis');
    expect(naarOudeInvoer(kiesMateriaal(p, 'thuis met dumbbells')).apparatuur).toBe('dumbbells');
  });
});

describe('samenvatting en voortgang', () => {
  it('heeft een regel per vraag', () => {
    const regels = samenvatting({ ...standaardProfiel(), kracht: { squat: { kg: 82.5, reps: 5 } } });
    expect(regels.map((r) => r.stap)).toEqual(STAPPEN.slice(0, -1));
    expect(regels.find((r) => r.label === 'Kracht')!.waarde).toBe('Squat 82,5 kg × 5');
    expect(regels.find((r) => r.label === 'Dagen')!.waarde).toBe('3× per week: ma, wo en vr');
  });

  it('loopt de balk op tot 1', () => {
    expect(voortgang('doel')).toBeGreaterThan(0);
    expect(voortgang('samenvatting')).toBe(1);
  });
});

describe('backup', () => {
  it('neemt het profiel mee in export en import', async () => {
    const p = { ...standaardProfiel(), doel: 'sterker' as const };
    saveProfiel(p);
    const json = await exportData();
    saveProfiel(null);
    await importData(json);
    expect(getProfiel()).toEqual(p);
  });
});
