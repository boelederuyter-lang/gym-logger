// De schemagenerator van de coach (fase 3).
//
// Puur en deterministisch: hetzelfde profiel + dezelfde seed geeft hetzelfde schema. Geen AI,
// geen internet: alleen vaste regels.
//
// Hoe het werkt, in het kort:
//   1. Het aantal dagen bepaalt de indeling (split): full body, upper/lower of push/pull/legs.
//   2. Elk dagtype is een rij "slots" met een bewegingspatroon (squat, hinge, ...) of, bij
//      isolatie, een doelspier.
//   3. Per slot kiezen we de best passende oefening: past bij je materiaal en niveau, en belast
//      geen geblesseerd gewricht. Lukt dat niet, dan valt het slot weg.
//   4. Reps volgen je doel, sets en aantal oefeningen volgen je tijd.
//   5. Prioriteitsspieren krijgen 1-2 extra sets per week.
//   6. Ken je je kracht op de basisoefeningen, dan rekenen we een startgewicht uit.

import type { Schema, SchemaDag, SchemaOefening } from '../plan/generator';
import {
  BASIS,
  belast,
  COACH_OEFENINGEN,
  GROEP_VAN,
  geschiktVoor,
  hoofdMateriaal,
  kanMet,
  type CoachOefening,
  type Patroon,
  type Spier,
} from './exercises';
import { naarOudeInvoer, type Basislift, type Doel, type Profiel } from './profile';

// ---------- dagtypes ----------

interface Slot {
  p: Patroon;
  /** Doelspieren voor isolatie (de oefening moet een ervan als hoofdspier hebben). */
  spier?: Spier[];
  /** Als het patroon niet lukt: probeer dit patroon. */
  anders?: Patroon;
}

interface DagType {
  naam: string;
  focus: string;
  slots: Slot[];
  /** Reserveslots als er te weinig oefeningen passen (bijvoorbeeld door een blessure). */
  vul?: Slot[];
  /** Twee zinnen uitleg; `hoofd` is de naam van de eerste oefening. */
  uitleg: (hoofd: string) => string;
}

const iso = (...spier: Spier[]): Slot => ({ p: 'isolatie', spier });

export const DAGTYPES: Record<string, DagType> = {
  fbA: {
    naam: 'Full body A',
    focus: 'Hele lichaam',
    slots: [
      { p: 'squat', anders: 'lunge' },
      { p: 'horizontaal duwen' },
      { p: 'horizontaal trekken' },
      { p: 'hinge' },
      iso('zijkant schouder'),
      iso('biceps'),
      iso('triceps'),
      { p: 'core' },
    ],
    uitleg: (h) =>
      `Je traint je hele lichaam, met ${h} als hoofdoefening. Daarna duw en trek je evenveel, zodat je lichaam in balans blijft.`,
  },
  fbB: {
    naam: 'Full body B',
    focus: 'Hele lichaam',
    slots: [
      { p: 'hinge' },
      { p: 'verticaal duwen', anders: 'horizontaal duwen' },
      { p: 'verticaal trekken', anders: 'horizontaal trekken' },
      { p: 'lunge', anders: 'squat' },
      iso('borst'),
      iso('hamstrings', 'billen'),
      { p: 'core' },
      iso('kuiten'),
    ],
    uitleg: (h) =>
      `Vandaag begin je met ${h} voor je achterkant: billen, hamstrings en rug. Boven train je nu verticaal, zodat je schouders en lats ook aan bod komen.`,
  },
  fbC: {
    naam: 'Full body C',
    focus: 'Hele lichaam',
    slots: [
      { p: 'squat', anders: 'lunge' },
      { p: 'horizontaal duwen' },
      { p: 'verticaal trekken', anders: 'horizontaal trekken' },
      { p: 'lunge', anders: 'hinge' },
      iso('achterkant schouder'),
      iso('triceps'),
      iso('biceps'),
      { p: 'core' },
    ],
    uitleg: (h) =>
      `Nog een keer het hele lichaam, met ${h} voorop maar andere varianten dan op A. Zo train je elke spier drie keer per week zonder dat het saai wordt.`,
  },
  upperA: {
    naam: 'Upper A',
    focus: 'Bovenlichaam',
    slots: [
      { p: 'horizontaal duwen' },
      { p: 'horizontaal trekken' },
      { p: 'verticaal duwen' },
      { p: 'verticaal trekken', anders: 'horizontaal trekken' },
      iso('zijkant schouder'),
      iso('biceps'),
      iso('triceps'),
      iso('borst'),
    ],
    uitleg: (h) =>
      `Een dag voor je bovenlichaam, met ${h} als zwaarste oefening. Elke duwoefening heeft een trekoefening als tegenhanger, goed voor je schouders.`,
  },
  lowerA: {
    naam: 'Lower A',
    focus: 'Onderlichaam',
    slots: [
      { p: 'squat', anders: 'lunge' },
      { p: 'hinge' },
      { p: 'lunge' },
      iso('quadriceps'),
      iso('hamstrings'),
      iso('kuiten'),
      { p: 'core' },
    ],
    uitleg: (h) => `Benendag met ${h} voorop, als je nog fris bent. Daarna werk je je hamstrings, billen en kuiten af.`,
  },
  upperB: {
    naam: 'Upper B',
    focus: 'Bovenlichaam',
    slots: [
      { p: 'verticaal trekken', anders: 'horizontaal trekken' },
      { p: 'horizontaal duwen' },
      { p: 'horizontaal trekken' },
      { p: 'verticaal duwen' },
      iso('borst'),
      iso('achterkant schouder'),
      iso('triceps'),
      iso('biceps'),
    ],
    uitleg: (h) =>
      `Weer bovenlichaam, maar nu begin je met ${h}. Andere varianten dan op A geven je spieren een nieuwe prikkel.`,
  },
  lowerB: {
    naam: 'Lower B',
    focus: 'Onderlichaam',
    slots: [
      { p: 'hinge' },
      { p: 'squat', anders: 'lunge' },
      { p: 'lunge' },
      iso('hamstrings'),
      iso('billen'),
      iso('kuiten'),
      { p: 'core' },
    ],
    uitleg: (h) =>
      `Benendag met de nadruk op je achterkant: ${h} gaat voor. Zo train je je benen van alle kanten in één week.`,
  },
  push: {
    naam: 'Push',
    focus: 'Borst, schouders en triceps',
    slots: [
      { p: 'horizontaal duwen' },
      { p: 'verticaal duwen' },
      { p: 'horizontaal duwen' },
      iso('zijkant schouder'),
      iso('borst'),
      iso('triceps'),
      iso('triceps'),
      { p: 'core' },
    ],
    uitleg: (h) =>
      `Alles wat duwt: borst, schouders en triceps, met ${h} als basis. Door ze op één dag te trainen hebben ze daarna een paar dagen rust.`,
  },
  pull: {
    naam: 'Pull',
    focus: 'Rug en biceps',
    slots: [
      { p: 'verticaal trekken', anders: 'horizontaal trekken' },
      { p: 'horizontaal trekken' },
      { p: 'hinge' },
      { p: 'horizontaal trekken' },
      iso('achterkant schouder'),
      iso('biceps'),
      iso('biceps'),
      { p: 'core' },
    ],
    uitleg: (h) =>
      `Alles wat trekt: rug, achterkant schouders en biceps, te beginnen met ${h}. Een sterke rug houdt je houding recht en je schouders gezond.`,
  },
  legs: {
    naam: 'Legs',
    focus: 'Benen en billen',
    slots: [
      { p: 'squat', anders: 'lunge' },
      { p: 'hinge' },
      { p: 'lunge' },
      iso('quadriceps'),
      iso('hamstrings'),
      iso('kuiten'),
      { p: 'core' },
    ],
    uitleg: (h) =>
      `Je benen en billen krijgen vandaag alle aandacht, met ${h} als hoofdoefening. De grootste spieren van je lichaam, dus hier win je de meeste kracht.`,
  },
};

const VUL: Record<string, Slot[]> = {
  full: [{ p: 'lunge' }, { p: 'hinge' }, iso('billen'), { p: 'horizontaal trekken' }, iso('kuiten'), { p: 'core' }],
  upper: [
    { p: 'horizontaal trekken' },
    { p: 'horizontaal duwen' },
    iso('achterkant schouder'),
    iso('triceps'),
    iso('biceps'),
  ],
  lower: [{ p: 'hinge' }, iso('billen'), iso('hamstrings', 'billen'), iso('kuiten'), iso('adductoren'), { p: 'core' }],
  push: [{ p: 'horizontaal duwen' }, iso('zijkant schouder'), iso('triceps'), iso('borst')],
  pull: [{ p: 'horizontaal trekken' }, iso('biceps'), iso('achterkant schouder'), { p: 'hinge' }],
};
for (const [type, vul] of Object.entries({
  fbA: VUL.full,
  fbB: VUL.full,
  fbC: VUL.full,
  upperA: VUL.upper,
  upperB: VUL.upper,
  lowerA: VUL.lower,
  lowerB: VUL.lower,
  legs: VUL.lower,
  push: VUL.push,
  pull: VUL.pull,
}))
  DAGTYPES[type].vul = vul;

interface Split {
  naam: string;
  dagen: string[];
}

/** Welke dagen bij welk aantal trainingen per week horen. */
export function kiesSplit(p: Pick<Profiel, 'dagen' | 'niveau'>): Split {
  const n = Math.min(6, Math.max(2, p.dagen.length));
  switch (n) {
    case 2:
      return { naam: 'Full body', dagen: ['fbA', 'fbB'] };
    case 3:
      return p.niveau === 'ervaren'
        ? { naam: 'Push/pull/legs', dagen: ['push', 'pull', 'legs'] }
        : { naam: 'Full body', dagen: ['fbA', 'fbB', 'fbC'] };
    case 4:
      return { naam: 'Upper/lower', dagen: ['upperA', 'lowerA', 'upperB', 'lowerB'] };
    case 5:
      return p.niveau === 'ervaren'
        ? { naam: 'Push/pull/legs + upper/lower', dagen: ['push', 'pull', 'legs', 'upperA', 'lowerA'] }
        : { naam: 'Upper/lower + push/pull/legs', dagen: ['upperA', 'lowerA', 'push', 'pull', 'legs'] };
    default:
      return { naam: 'Push/pull/legs ×2', dagen: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] };
  }
}

// ---------- reps, sets en rust ----------

export type Rol = 'hoofd' | 'compound' | 'isolatie';

/** Repbereik op basis van je doel en de rol van de oefening in de training. */
export function repsVoor(oef: CoachOefening, doel: Doel, rol: Rol): [number, number] {
  if (oef.eenheid === 'sec' || oef.progressie === 'reps') return oef.reps;
  if (rol === 'isolatie') return [10, 15];
  switch (doel) {
    case 'sterker':
      return rol === 'hoofd' ? [3, 6] : [6, 10];
    case 'spiermassa':
      return rol === 'hoofd' ? [6, 10] : [8, 12];
    default: // vet verliezen, fitheid
      return rol === 'hoofd' ? [8, 12] : [10, 15];
  }
}

/** Rust in seconden: zwaar en kort = lang rusten, licht en lang = kort rusten. */
export function rustVoor(doel: Doel, rol: Rol): number {
  const tabel: Record<Doel, Record<Rol, number>> = {
    sterker: { hoofd: 180, compound: 120, isolatie: 75 },
    spiermassa: { hoofd: 120, compound: 90, isolatie: 60 },
    'vet verliezen': { hoofd: 90, compound: 75, isolatie: 45 },
    fitheid: { hoofd: 90, compound: 60, isolatie: 45 },
  };
  return tabel[doel][rol];
}

/** Hoeveel oefeningen er in een training passen. */
export const OEFENINGEN_PER_TIJD: Record<number, number> = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };

/** Geschatte duur in minuten, inclusief 5 minuten warming-up en 1 minuut per wissel. */
export function schatMinuten(oefeningen: Pick<SchemaOefening, 'reps' | 'eenheid' | 'sets' | 'rust'>[]): number {
  let sec = 5 * 60;
  for (const o of oefeningen) {
    const gem = (o.reps[0] + o.reps[1]) / 2;
    const werk = o.eenheid === 'sec' ? gem + 10 : gem * 3.5 + 10;
    sec += o.sets * (werk + o.rust) + 60;
  }
  return Math.round(sec / 60);
}

// ---------- startgewicht ----------

/** Geschatte 1RM (één keer maximaal) met de formule van Epley. */
export function epley(kg: number, reps: number): number {
  return reps <= 1 ? kg : kg * (1 + reps / 30);
}

/** Hoeveel je bij een 1RM ongeveer haalt voor een aantal reps (Epley, omgekeerd). */
export function gewichtVoorReps(e1rm: number, reps: number): number {
  return e1rm / (1 + reps / 30);
}

/**
 * Oefeningen waarvan we het startgewicht kunnen afleiden van een basisoefening:
 * [basisoefening, verhouding]. Dumbbells zijn per hand. Bewust aan de voorzichtige kant.
 */
export const AFGELEID: Record<string, [Basislift, number]> = {
  squat: ['squat', 1],
  'front-squat': ['squat', 0.8],
  'smith-squat': ['squat', 0.85],
  'goblet-squat': ['squat', 0.3],
  'dumbbell-squat': ['squat', 0.25],
  bankdrukken: ['bankdrukken', 1],
  'incline-bankdrukken': ['bankdrukken', 0.8],
  'decline-bankdrukken': ['bankdrukken', 0.95],
  'close-grip-bankdrukken': ['bankdrukken', 0.85],
  'smith-bankdrukken': ['bankdrukken', 0.9],
  'dumbbell-bankdrukken': ['bankdrukken', 0.35],
  'incline-dumbbell-press': ['bankdrukken', 0.3],
  'overhead-press': ['bankdrukken', 0.6],
  'dumbbell-schouderpress': ['bankdrukken', 0.22],
  'barbell-row': ['bankdrukken', 0.7],
  deadlift: ['deadlift', 1],
  'romanian-deadlift': ['deadlift', 0.6],
  'rack-pull': ['deadlift', 1],
  'dumbbell-rdl': ['deadlift', 0.25],
  'hip-thrust': ['deadlift', 0.7],
};

/** Rondt omlaag af op de stapgrootte (iets aan de lichte kant). Een stang weegt minstens 20 kg. */
export function rondAf(kg: number, stap: number, oef?: Pick<CoachOefening, 'materiaal'>): number {
  const r = Math.floor(kg / stap + 1e-9) * stap;
  const min = oef && hoofdMateriaal(oef.materiaal) === 'stang' ? 20 : stap;
  return Math.max(min, Math.round(r * 100) / 100);
}

/**
 * Startgewicht voor een oefening: geschatte 1RM × het percentage dat bij de bovenkant van het
 * repbereik hoort, afgerond omlaag op de stapgrootte. Geeft undefined als we het niet weten.
 */
export function startgewicht(
  oef: CoachOefening,
  reps: [number, number],
  kracht: Profiel['kracht'],
): number | undefined {
  if (oef.progressie !== 'gewicht' || oef.eenheid === 'sec') return undefined;
  const bron = AFGELEID[oef.id];
  if (!bron) return undefined;
  const meting = kracht[bron[0]];
  if (!meting) return undefined;
  const e1rm = epley(meting.kg, meting.reps) * bron[1];
  return rondAf(gewichtVoorReps(e1rm, reps[1]), oef.stap, oef);
}

/** Uitleg als we geen startgewicht weten. */
export function startHint(oef: CoachOefening, reps: [number, number]): string | undefined {
  if (oef.eenheid === 'sec') return `Houd ${reps[0]} sec vol; lukt ${reps[1]} sec, maak het zwaarder.`;
  if (oef.progressie === 'reps') return `Doe ${reps[0]} tot ${reps[1]} nette reps per set.`;
  return `Kies een gewicht waarmee je ${reps[1]} reps net haalt.`;
}

// ---------- kiezen ----------

/** Kleine seeded random generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Oefeningen die je kunt doen: juist materiaal, passend niveau, geen geblesseerd gewricht. */
export function beschikbaar(p: Pick<Profiel, 'materiaal' | 'niveau' | 'blessures'>): CoachOefening[] {
  return COACH_OEFENINGEN.filter((c) => kanMet(c, p.materiaal) && geschiktVoor(c, p.niveau) && !belast(c, p.blessures));
}

/** Past een oefening in een slot? */
export function pastIn(c: CoachOefening, slot: Slot, patroon = slot.p): boolean {
  if (c.patroon !== patroon) return false;
  if (patroon !== 'isolatie' || !slot.spier) return true;
  return c.primair.some((s) => slot.spier!.includes(s));
}

/**
 * Hoe graag we een oefening kiezen (hoger = beter). Vaste voorkeuren plus een klein beetje
 * toeval uit de seed, zodat "Opnieuw genereren" andere keuzes geeft.
 */
function score(c: CoachOefening, p: Profiel, rol: Rol, gebruik: Map<string, number>, random: () => number) {
  const m = hoofdMateriaal(c.materiaal);
  const gym = p.materiaal.includes('machine') || p.materiaal.includes('stang');
  let s = 0;
  if (rol === 'hoofd') {
    if (m === 'stang') s += p.doel === 'sterker' ? 4 : p.niveau === 'beginner' ? 1 : 3;
    if (m === 'machine') s += p.niveau === 'beginner' ? 2.5 : 1;
    if (m === 'dumbbells') s += 1.5;
  } else if (rol === 'compound') {
    if (m === 'dumbbells' || m === 'kabel' || m === 'machine') s += 2;
    if (m === 'stang') s += 1.5;
  } else {
    if (m === 'kabel' || m === 'machine') s += 2;
    if (m === 'dumbbells') s += 1.5;
  }
  // Bekende basisoefeningen gaan voor.
  if (BASIS.has(c.id)) s += 2;
  // In de gym liever met gewicht dan met lichaamsgewicht. Uitzondering: core, en optrekken en
  // dippen voor wie geen beginner meer is.
  const zwaarGenoeg = p.niveau !== 'beginner' && (c.patroon === 'verticaal trekken' || c.id === 'dips');
  if (gym && m === 'lichaamsgewicht' && c.patroon !== 'core' && !zwaarGenoeg) s -= 3;
  // Afwisseling over de week.
  s -= 4 * (gebruik.get(c.id) ?? 0);
  return s + random();
}

function rolVan(c: CoachOefening, index: number): Rol {
  if (c.patroon === 'isolatie' || c.patroon === 'core') return 'isolatie';
  return index === 0 ? 'hoofd' : 'compound';
}

const ONDER: Spier[] = ['quadriceps', 'hamstrings', 'billen', 'adductoren', 'kuiten'];

/** Zet een coach-oefening om naar een regel in het schema. */
export function maakOefening(c: CoachOefening, p: Profiel, rol: Rol, sets: number): SchemaOefening {
  const reps = repsVoor(c, p.doel, rol);
  const kg = startgewicht(c, reps, p.kracht);
  const deel =
    c.patroon === 'core'
      ? 'core'
      : ['squat', 'hinge', 'lunge'].includes(c.patroon) || ONDER.includes(c.primair[0])
        ? 'onder'
        : 'boven';
  return {
    id: c.id,
    slug: c.id,
    naam: c.naam,
    spiergroep: c.primair.map((s) => s[0].toUpperCase() + s.slice(1)).join(', '),
    patroon: c.patroon,
    apparatuur: hoofdMateriaal(c.materiaal),
    zonderGewicht: c.progressie === 'reps',
    type: rol === 'isolatie' ? 'isolatie' : 'compound',
    deel,
    tip: c.tip,
    eenheid: c.eenheid ?? 'reps',
    sets,
    reps,
    rust: rustVoor(p.doel, rol),
    rol,
    stap: c.stap,
    startgewicht: kg,
    startHint: kg === undefined ? startHint(c, reps) : undefined,
  };
}

function setsVoor(rol: Rol, p: Profiel): number {
  const beginner = p.niveau === 'beginner';
  if (rol === 'hoofd') return beginner ? 3 : 4;
  if (rol === 'compound') return 3;
  return beginner ? 2 : 3;
}

const SETS_MAX: Record<Rol, number> = { hoofd: 5, compound: 4, isolatie: 4 };
const SETS_MIN: Record<Rol, number> = { hoofd: 2, compound: 2, isolatie: 2 };

/** Is `c` een vaste alternatief van een oefening die al op de dag staat (of andersom)? */
export function bijnaDubbel(c: CoachOefening, gekozen: Set<string>): boolean {
  for (const id of gekozen) {
    if (c.alternatieven.includes(id)) return true;
    if (COACH_OEFENINGEN.find((x) => x.id === id)?.alternatieven.includes(c.id)) return true;
  }
  return false;
}

/** Bouwt één trainingsdag. */
function bouwDag(
  type: string,
  p: Profiel,
  pool: CoachOefening[],
  gebruik: Map<string, number>,
  random: () => number,
): SchemaOefening[] {
  const budget = p.tijd;
  const doelAantal = Math.max(3, OEFENINGEN_PER_TIJD[p.tijd] - (p.niveau === 'beginner' ? 1 : 0));
  const gekozen = new Set<string>();
  const lijst: SchemaOefening[] = [];

  const { slots, vul = [] } = DAGTYPES[type];
  const heeftCore = () => lijst.some((o) => o.patroon === 'core');
  for (const [i, slot] of [...slots, ...vul].entries()) {
    if (lijst.length >= doelAantal) break;
    // Reserveslots alleen als de gewone slots tekort schoten; nooit twee keer core.
    if (i >= slots.length && slot.p === 'core' && heeftCore()) continue;
    for (const patroon of [slot.p, slot.anders].filter(Boolean) as Patroon[]) {
      const passend = pool.filter((c) => !gekozen.has(c.id) && pastIn(c, slot, patroon));
      // Liever geen bijna-dubbele oefening (bijv. RDL met stang én met dumbbells) op één dag.
      const anders = passend.filter((c) => !bijnaDubbel(c, gekozen));
      const kandidaten = anders.length ? anders : passend;
      if (!kandidaten.length) continue;
      const beste = kandidaten
        .map((c) => ({ c, s: score(c, p, rolVan(c, lijst.length), gebruik, random) }))
        .sort((a, b) => b.s - a.s)[0].c;
      const rol = rolVan(beste, lijst.length);
      gekozen.add(beste.id);
      lijst.push(maakOefening(beste, p, rol, setsVoor(rol, p)));
      break;
    }
  }

  // Volgorde: hoofdoefening, dan compounds, dan isolatie, core als laatste (stabiel gesorteerd).
  const plek = (o: SchemaOefening) => (o.rol === 'hoofd' ? 0 : o.rol === 'compound' ? 1 : o.patroon === 'core' ? 3 : 2);
  lijst.sort((a, b) => plek(a) - plek(b));

  // Te lang? Eerst isolatiesets omlaag, dan de laatste oefening eraf, dan compoundsets omlaag.
  const krimp = (): boolean => {
    for (let i = lijst.length - 1; i >= 0; i--) {
      if (lijst[i].rol === 'isolatie' && lijst[i].sets > SETS_MIN.isolatie) return (lijst[i].sets--, true);
    }
    if (lijst.length > 3) return (lijst.pop(), true);
    for (let i = lijst.length - 1; i >= 0; i--) {
      if (lijst[i].sets > SETS_MIN[lijst[i].rol!]) return (lijst[i].sets--, true);
    }
    return false;
  };
  while (schatMinuten(lijst) > budget && krimp());

  // Tijd over? Dan een set erbij, eerst op de hoofdoefening en compounds (niet voor beginners).
  if (p.niveau !== 'beginner') {
    for (;;) {
      const kandidaat = lijst
        .filter((o) => o.sets < SETS_MAX[o.rol!])
        .sort((a, b) => a.sets - b.sets || Number(a.rol === 'isolatie') - Number(b.rol === 'isolatie'))[0];
      if (!kandidaat) break;
      kandidaat.sets++;
      if (schatMinuten(lijst) <= budget) continue;
      kandidaat.sets--;
      break;
    }
  }

  return lijst;
}

/**
 * Prioriteitsspieren: +1 set op de eerste oefening voor die spiergroep op hoogstens twee dagen,
 * dus 1-2 extra sets per week. Isolatie-oefeningen eerst, dan compounds.
 */
export function voegPrioriteitToe(dagen: SchemaOefening[][], p: Profiel): void {
  for (const groep of p.prioriteit) {
    let extra = 0;
    for (const dag of dagen) {
      if (extra >= 2) break;
      const treft = (o: SchemaOefening) => {
        const c = COACH_OEFENINGEN.find((x) => x.id === o.id);
        return !!c && c.primair.some((s) => GROEP_VAN[s] === groep);
      };
      const doel = dag.find((o) => treft(o) && o.rol === 'isolatie') ?? dag.find(treft);
      if (doel && doel.sets < SETS_MAX[doel.rol!] + 1) {
        doel.sets++;
        doel.prioriteit = true;
        extra++;
        // Past de dag dan niet meer in je tijd? Haal een set weg bij een oefening zonder prioriteit.
        if (schatMinuten(dag) > p.tijd) {
          const ruil = [...dag].reverse().find((o) => !o.prioriteit && o.sets > SETS_MIN[o.rol!]);
          if (ruil) ruil.sets--;
        }
      }
    }
  }
}

/** Sets per spiergroep per week (hoofdspieren tellen voor 1). Handig voor tests en de check-in. */
export function setsPerGroep(dagen: Pick<SchemaOefening, 'id' | 'sets'>[][]): Record<string, number> {
  const telling: Record<string, number> = {};
  for (const dag of dagen)
    for (const o of dag) {
      const c = COACH_OEFENINGEN.find((x) => x.id === o.id);
      if (!c) continue;
      for (const g of new Set(c.primair.map((s) => GROEP_VAN[s]))) telling[g] = (telling[g] ?? 0) + o.sets;
    }
  return telling;
}

const sleutel = (oef: SchemaOefening[]) =>
  oef
    .map((o) => o.id)
    .sort()
    .join('|');

/** Genereert het schema voor een profiel. */
export function genereerCoachSchema(p: Profiel, seed: number): Schema {
  const random = rng(seed);
  const pool = beschikbaar(p);
  const split = kiesSplit(p);
  const gebruik = new Map<string, number>();
  const lijsten: SchemaOefening[][] = [];

  for (const type of split.dagen) {
    let oef = bouwDag(type, p, pool, gebruik, random);
    // Nooit twee precies dezelfde trainingen: probeer andere keuzes.
    for (let poging = 0; poging < 10 && lijsten.some((l) => sleutel(l) === sleutel(oef)); poging++) {
      oef = bouwDag(type, p, pool, gebruik, random);
    }
    for (const o of oef) gebruik.set(o.id, (gebruik.get(o.id) ?? 0) + 1);
    lijsten.push(oef);
  }
  voegPrioriteitToe(lijsten, p);

  const tellers: Record<string, number> = {};
  const dagen: SchemaDag[] = split.dagen.map((type, i) => {
    const t = DAGTYPES[type];
    // Bij PPL ×2 heten de dagen "Push A" en "Push B".
    const dubbel = split.dagen.filter((x) => x === type).length > 1;
    tellers[type] = (tellers[type] ?? 0) + 1;
    const naam = dubbel ? `${t.naam} ${tellers[type] === 1 ? 'A' : 'B'}` : t.naam;
    const oefeningen = lijsten[i];
    return {
      type,
      naam,
      focus: t.focus,
      uitleg: t.uitleg(oefeningen[0]?.naam.toLowerCase() ?? 'de eerste oefening'),
      weekdag: p.dagen[i],
      oefeningen,
      cardio: null,
    };
  });

  return { versie: 1, invoer: naarOudeInvoer(p), seed, split: split.naam, dagen, coach: true };
}

// ---------- oefeningen aanpassen ----------

/** Varianten voor één plek in het schema: zelfde slot, past bij je profiel, nog niet op die dag. */
export function coachVarianten(schema: Schema, p: Profiel, dagIndex: number, oefIndex: number): CoachOefening[] {
  const dag = schema.dagen[dagIndex];
  const huidig = dag?.oefeningen[oefIndex];
  if (!huidig) return [];
  const bron = COACH_OEFENINGEN.find((c) => c.id === huidig.id);
  const opDag = new Set(dag.oefeningen.map((o) => o.id));
  const vast = bron?.alternatieven ?? [];
  return beschikbaar(p)
    .filter(
      (c) =>
        !opDag.has(c.id) &&
        c.patroon === huidig.patroon &&
        (huidig.patroon !== 'isolatie' || !bron || c.primair.some((s) => bron.primair.includes(s))),
    )
    .sort(
      (a, b) =>
        (vast.includes(a.id) ? vast.indexOf(a.id) : 99) - (vast.includes(b.id) ? vast.indexOf(b.id) : 99) ||
        a.naam.localeCompare(b.naam),
    );
}

/** Vervangt één oefening; sets en rol blijven, reps en startgewicht passen zich aan. */
export function wisselCoachOefening(schema: Schema, p: Profiel, dag: number, index: number, id: string): Schema {
  const nieuw = COACH_OEFENINGEN.find((c) => c.id === id);
  const oud = schema.dagen[dag]?.oefeningen[index];
  if (!nieuw || !oud) return schema;
  const rol = oud.rol === 'hoofd' && nieuw.patroon !== 'isolatie' ? 'hoofd' : rolVan(nieuw, index === 0 ? 0 : 1);
  return {
    ...schema,
    dagen: schema.dagen.map((d, i) =>
      i !== dag
        ? d
        : {
            ...d,
            oefeningen: d.oefeningen.map((o, j) =>
              j === index ? { ...maakOefening(nieuw, p, rol, oud.sets), prioriteit: oud.prioriteit } : o,
            ),
          },
    ),
  };
}
