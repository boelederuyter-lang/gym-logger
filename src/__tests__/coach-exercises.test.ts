import { describe, expect, it } from 'vitest';
import {
  alternatievenVoor,
  belast,
  COACH_BY_ID,
  COACH_OEFENINGEN,
  coachInfo,
  geschiktVoor,
  GROEP_VAN,
  kanMet,
  MATERIAAL_PER_KEUZE,
  PATRONEN,
  stapVoor,
  type CoachOefening,
  type MateriaalKeuze,
} from '../coach/exercises';
import { LIBRARY_BY_SLUG } from '../library/exercises';

const get = (id: string) => COACH_BY_ID.get(id)!;

describe('coach-oefeningendatabase', () => {
  it('heeft minstens 80 oefeningen met unieke ids en namen', () => {
    expect(COACH_OEFENINGEN.length).toBeGreaterThanOrEqual(80);
    expect(new Set(COACH_OEFENINGEN.map((c) => c.id)).size).toBe(COACH_OEFENINGEN.length);
    expect(new Set(COACH_OEFENINGEN.map((c) => c.naam)).size).toBe(COACH_OEFENINGEN.length);
  });

  it('koppelt elke oefening aan de bibliotheek (zelfde slug en naam)', () => {
    for (const c of COACH_OEFENINGEN) {
      expect(LIBRARY_BY_SLUG.has(c.id), c.id).toBe(true);
      expect(c.naam).toBe(LIBRARY_BY_SLUG.get(c.id)!.name);
    }
  });

  it('vult alle verplichte velden', () => {
    for (const c of COACH_OEFENINGEN) {
      expect(c.naamEn, c.id).not.toBe('');
      expect(c.primair.length, c.id).toBeGreaterThan(0);
      expect(c.materiaal.length, c.id).toBeGreaterThan(0);
      expect(c.tip.length, c.id).toBeGreaterThan(10);
      expect(c.reps[0], c.id).toBeLessThan(c.reps[1]);
      expect(c.rust, c.id).toBeGreaterThanOrEqual(30);
    }
  });

  it('heeft 2 tot 4 alternatieven die bestaan en hetzelfde patroon hebben', () => {
    const fout: string[] = [];
    for (const c of COACH_OEFENINGEN) {
      expect(c.alternatieven.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.alternatieven.length, c.id).toBeLessThanOrEqual(4);
      expect(c.alternatieven, c.id).not.toContain(c.id);
      for (const a of c.alternatieven) {
        const alt = COACH_BY_ID.get(a);
        if (alt?.patroon !== c.patroon) fout.push(`${c.id} → ${a}`);
      }
    }
    expect(fout).toEqual([]);
  });

  it('heeft isolatie-alternatieven die dezelfde spiergroep trainen', () => {
    for (const c of COACH_OEFENINGEN.filter((x) => x.patroon === 'isolatie')) {
      for (const a of c.alternatieven) {
        const alt = get(a);
        const groepen = c.primair.map((s) => GROEP_VAN[s]);
        const overlap = [...alt.primair, ...alt.secundair].some((s) => groepen.includes(GROEP_VAN[s]));
        expect(overlap, `${c.id} → ${a}`).toBe(true);
      }
    }
  });

  it('dekt elk patroon', () => {
    for (const p of PATRONEN)
      expect(
        COACH_OEFENINGEN.some((c) => c.patroon === p),
        p,
      ).toBe(true);
  });

  it('heeft voor elke materiaalkeuze een beginner-oefening per hoofdpatroon', () => {
    const hoofd = ['squat', 'hinge', 'horizontaal duwen', 'verticaal duwen', 'horizontaal trekken', 'lunge', 'core'];
    for (const keuze of Object.keys(MATERIAAL_PER_KEUZE) as MateriaalKeuze[]) {
      for (const p of hoofd) {
        const ok = COACH_OEFENINGEN.some(
          (c) => c.patroon === p && kanMet(c, MATERIAAL_PER_KEUZE[keuze]) && geschiktVoor(c, 'beginner'),
        );
        expect(ok, `${keuze}: ${p}`).toBe(true);
      }
    }
  });
});

describe('stapgrootte', () => {
  it('volgt de regels per materiaal', () => {
    expect(get('squat').stap).toBe(5); // stang, benen
    expect(get('romanian-deadlift').stap).toBe(5); // stang, hinge
    expect(get('hip-thrust').stap).toBe(5); // stang, billen
    expect(get('bankdrukken').stap).toBe(2.5); // stang, boven
    expect(get('barbell-curl').stap).toBe(2.5);
    expect(get('dumbbell-bankdrukken').stap).toBe(2); // dumbbells
    expect(get('goblet-squat').stap).toBe(2);
    expect(get('leg-press').stap).toBe(2.5); // machine
    expect(get('lat-pulldown').stap).toBe(2.5); // kabel
  });

  it('is altijd gelijk aan stapVoor()', () => {
    for (const c of COACH_OEFENINGEN) expect(c.stap, c.id).toBe(stapVoor(c));
  });
});

describe('progressietype en standaardwaarden', () => {
  it('lichaamsgewicht = reps, gewicht = gewicht', () => {
    expect(get('push-up').progressie).toBe('reps');
    expect(get('pull-up').progressie).toBe('reps');
    expect(get('bankdrukken').progressie).toBe('gewicht');
  });

  it('geeft zware stangoefeningen meer rust dan isolatie', () => {
    expect(get('squat').rust).toBe(180);
    expect(get('lateral-raises').rust).toBe(60);
    expect(get('plank').rust).toBe(45);
  });

  it('markeert tijdoefeningen', () => {
    expect(get('plank').eenheid).toBe('sec');
    expect(get('bankdrukken').eenheid).toBeUndefined();
  });
});

describe('filters', () => {
  it('kanMet vereist al het materiaal', () => {
    expect(kanMet(get('bankdrukken'), MATERIAAL_PER_KEUZE['volledige gym'])).toBe(true);
    expect(kanMet(get('bankdrukken'), MATERIAAL_PER_KEUZE['thuis met dumbbells'])).toBe(false);
    expect(kanMet(get('leg-press'), MATERIAAL_PER_KEUZE['kleine gym'])).toBe(false);
    expect(kanMet(get('push-up'), MATERIAAL_PER_KEUZE['alleen lichaamsgewicht'])).toBe(true);
  });

  it('geschiktVoor: niveau is een minimum', () => {
    expect(geschiktVoor(get('pistol-squat'), 'beginner')).toBe(false);
    expect(geschiktVoor(get('pistol-squat'), 'ervaren')).toBe(true);
    expect(geschiktVoor(get('front-squat'), 'gevorderd')).toBe(true);
    expect(geschiktVoor(get('squat'), 'beginner')).toBe(true);
  });

  it('belast herkent geblesseerde gewrichten', () => {
    expect(belast(get('squat'), ['knie'])).toBe(true);
    expect(belast(get('hip-thrust'), ['knie'])).toBe(false);
  });
});

describe('alternatievenVoor', () => {
  it('geeft eerst de vaste alternatieven', () => {
    const alt = alternatievenVoor(get('bankdrukken')).map((c) => c.id);
    expect(alt.slice(0, 4)).toEqual(get('bankdrukken').alternatieven);
    expect(alt).not.toContain('bankdrukken');
  });

  it('filtert op materiaal, niveau en blessures', () => {
    const thuis = alternatievenVoor(get('bankdrukken'), { materiaal: MATERIAAL_PER_KEUZE['alleen lichaamsgewicht'] });
    expect(thuis.length).toBeGreaterThan(0);
    for (const c of thuis) expect(c.materiaal).toEqual(['lichaamsgewicht']);

    const knie = alternatievenVoor(get('squat'), { blessures: ['knie'] });
    for (const c of knie) expect(c.gewrichten).not.toContain('knie');

    const beginner = alternatievenVoor(get('pull-up'), { niveau: 'beginner' });
    for (const c of beginner) expect(c.niveau).toBe('beginner');
  });

  it('blijft bij isolatie binnen dezelfde spier', () => {
    for (const c of alternatievenVoor(get('lateral-raises'))) {
      expect(c.patroon).toBe('isolatie');
    }
    const extra = alternatievenVoor(get('lateral-raises')).slice(get('lateral-raises').alternatieven.length);
    for (const c of extra) expect(c.primair[0]).toBe('zijkant schouder');
  });
});

describe('coachInfo', () => {
  it('geeft de database-oefening voor bibliotheekoefeningen', () => {
    expect(coachInfo({ slug: 'squat', name: 'Squat', muscle: 'Benen', equipment: 'barbell' })).toBe(get('squat'));
  });

  it('maakt redelijke gegevens voor een eigen oefening', () => {
    const c: CoachOefening = coachInfo({ name: 'Landmine press', muscle: 'Schouders', equipment: 'barbell' });
    expect(c.patroon).toBe('isolatie');
    expect(c.materiaal).toEqual(['stang']);
    expect(c.progressie).toBe('gewicht');
    expect(c.stap).toBe(2.5);
  });

  it('gebruikt wat de gebruiker invulde', () => {
    const c = coachInfo({
      name: 'Landmine press',
      muscle: 'Schouders',
      equipment: 'barbell',
      coach: { patroon: 'verticaal duwen', gewrichten: ['schouder'] },
    });
    expect(c.patroon).toBe('verticaal duwen');
    expect(c.gewrichten).toEqual(['schouder']);
    expect(c.reps).toEqual([6, 10]);
  });

  it('eigen lichaamsgewicht-oefening progressie op reps, core-spier → core-patroon', () => {
    const c = coachInfo({ name: 'L-sit', muscle: 'Core', equipment: 'bodyweight' });
    expect(c.patroon).toBe('core');
    expect(c.progressie).toBe('reps');
  });
});
