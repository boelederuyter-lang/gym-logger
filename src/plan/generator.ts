// Schema-logica. Puur en deterministisch: dezelfde invoer + seed geeft hetzelfde schema,
// zodat een gedeelde link bij een vriend exact hetzelfde schema oplevert.

import {
  APPARATUUR,
  BESCHIKBAAR,
  BIBLIOTHEEK,
  CARDIO,
  OEFENINGEN,
  type ApparatuurKeuze,
  type Patroon,
  type PlanOefening,
} from './exercises';

export type Doel = 'kracht' | 'spiermassa' | 'fitheid' | 'vetverlies';
export type Niveau = 'beginner' | 'gevorderd';
type Tijd = 30 | 45 | 60 | 75;

export interface Invoer {
  doel: Doel;
  niveau: Niveau;
  dagen: number;
  tijd: number;
  apparatuur: ApparatuurKeuze;
}

export interface SchemaOefening {
  id: string;
  /** Slug in de bibliotheek van de logger, als de oefening daarin staat. */
  slug?: string;
  naam: string;
  spiergroep: string;
  patroon: Patroon;
  apparatuur: string;
  zonderGewicht: boolean;
  type: 'compound' | 'isolatie';
  deel: 'boven' | 'onder' | 'core';
  tip: string;
  eenheid: 'reps' | 'sec';
  sets: number;
  reps: [number, number];
  rust: number;
  advies?: string | null;
}

export interface Cardio {
  id: string;
  naam: string;
  tip: string;
  apparatuur: string;
  soort: 'rustig' | 'interval';
  minuten: number;
  rondes?: number;
  werk?: number;
  rust?: number;
  uitleg?: string;
  advies?: string | null;
}

export interface SchemaDag {
  type: string;
  naam: string;
  focus: string;
  oefeningen: SchemaOefening[];
  cardio: Cardio | null;
}

export interface Schema {
  versie: 1;
  invoer: Invoer;
  seed: number;
  split: string;
  dagen: SchemaDag[];
}

export interface WeekDag extends SchemaDag {
  minuten: number;
}

export const DOELEN: Record<Doel, string> = {
  kracht: 'Kracht',
  spiermassa: 'Spiermassa',
  fitheid: 'Algemene fitheid',
  vetverlies: 'Vetverlies',
};
export const NIVEAUS: Record<Niveau, string> = { beginner: 'Beginner', gevorderd: 'Gevorderd' };
export const DAGEN = [2, 3, 4, 5];
export const TIJDEN = [30, 45, 60, 75];
export const APPARATUUR_KEUZES: Record<ApparatuurKeuze, string> = {
  gym: 'Volledige gym',
  dumbbells: 'Alleen dumbbells',
  thuis: 'Thuis zonder spullen',
};

export const MIN_OEFENINGEN = 3;

const REPS: Record<Doel, Record<'compound' | 'isolatie' | 'sec', [number, number]>> = {
  kracht: { compound: [4, 6], isolatie: [6, 8], sec: [20, 30] },
  spiermassa: { compound: [8, 12], isolatie: [8, 12], sec: [30, 45] },
  fitheid: { compound: [12, 15], isolatie: [12, 15], sec: [40, 60] },
  // Vetverlies: zwaar genoeg blijven trainen om spiermassa te behouden.
  vetverlies: { compound: [8, 12], isolatie: [12, 15], sec: [30, 45] },
};

/** Rust in seconden: kracht langer, fitheid korter. */
const RUST = {
  kracht: { compound: 180, isolatie: 90 },
  spiermassa: { compound: 90, isolatie: 60 },
  fitheid: { compound: 60, isolatie: 45 },
  vetverlies: { compound: 75, isolatie: 45 },
};

/** Minuten cardio na de krachttraining bij vetverlies, per sessieduur. */
const CARDIO_MINUTEN: Record<Tijd, number> = { 30: 10, 45: 12, 60: 15, 75: 20 };
const INTERVAL = { werk: 30, rust: 60, inUit: 5 }; // 3 min inlopen + 2 min uitlopen

// Een trainingsdag is een rij slots in volgorde van belangrijkheid. Elk slot noemt
// bewegingspatronen; het eerste patroon waarvoor een passende oefening bestaat wint.
const DAGTYPES: Record<string, { naam: string; focus: string; slots: Patroon[][] }> = {
  fbA: {
    naam: 'Full body A',
    focus: 'Hele lichaam',
    slots: [
      ['squat', 'lunge'],
      ['hpush'],
      ['hpull'],
      ['hinge', 'heup'],
      ['schouder-iso', 'achterschouder', 'vpush'],
      ['biceps'],
      ['triceps'],
      ['core'],
      ['kuiten'],
    ],
  },
  fbB: {
    naam: 'Full body B',
    focus: 'Hele lichaam',
    slots: [
      ['hinge', 'heup'],
      ['vpush', 'hpush'],
      ['vpull', 'hpull'],
      ['lunge', 'squat'],
      ['borst-iso', 'hpush'],
      ['ham-iso', 'heup'],
      ['triceps'],
      ['biceps'],
      ['core'],
    ],
  },
  fbC: {
    naam: 'Full body C',
    focus: 'Hele lichaam',
    slots: [
      ['squat', 'lunge'],
      ['hpush'],
      ['hpull', 'vpull'],
      ['heup', 'hinge'],
      ['vpush'],
      ['achterschouder', 'schouder-iso'],
      ['biceps'],
      ['triceps'],
      ['core'],
      ['kuiten'],
    ],
  },
  upperA: {
    naam: 'Upper A',
    focus: 'Bovenlichaam',
    slots: [
      ['hpush'],
      ['hpull'],
      ['vpush'],
      ['vpull', 'hpull'],
      ['schouder-iso', 'achterschouder'],
      ['biceps'],
      ['triceps'],
      ['borst-iso', 'hpush'],
      ['core'],
    ],
  },
  lowerA: {
    naam: 'Lower A',
    focus: 'Onderlichaam',
    slots: [
      ['squat'],
      ['hinge'],
      ['lunge'],
      ['quad-iso', 'squat'],
      ['ham-iso', 'hinge'],
      ['kuiten'],
      ['core'],
      ['heup'],
    ],
  },
  upperB: {
    naam: 'Upper B',
    focus: 'Bovenlichaam',
    slots: [
      ['vpull', 'hpull'],
      ['hpush'],
      ['hpull'],
      ['vpush'],
      ['borst-iso', 'hpush'],
      ['achterschouder', 'schouder-iso'],
      ['triceps'],
      ['biceps'],
      ['schouder-iso'],
      ['core'],
    ],
  },
  lowerB: {
    naam: 'Lower B',
    focus: 'Onderlichaam',
    slots: [['hinge'], ['squat', 'lunge'], ['heup'], ['lunge'], ['ham-iso'], ['quad-iso'], ['kuiten'], ['core']],
  },
  push: {
    naam: 'Push',
    focus: 'Borst, schouders en triceps',
    slots: [
      ['hpush'],
      ['vpush'],
      ['hpush'],
      ['schouder-iso', 'vpush'],
      ['borst-iso', 'hpush'],
      ['triceps'],
      ['triceps'],
      ['core'],
    ],
  },
  pull: {
    naam: 'Pull',
    focus: 'Rug, biceps en hamstrings',
    slots: [
      ['vpull', 'hpull'],
      ['hpull'],
      ['hinge'],
      ['hpull', 'vpull'],
      ['achterschouder'],
      ['biceps'],
      ['biceps'],
      ['core'],
    ],
  },
  legs: {
    naam: 'Legs',
    focus: 'Benen en billen',
    slots: [['squat'], ['hinge'], ['lunge'], ['heup'], ['quad-iso'], ['ham-iso'], ['kuiten'], ['core']],
  },
};

const SPLITS: Record<number, { naam: string; dagen: string[] }> = {
  2: { naam: 'Full body', dagen: ['fbA', 'fbB'] },
  3: { naam: 'Full body', dagen: ['fbA', 'fbB', 'fbC'] },
  4: { naam: 'Upper/lower', dagen: ['upperA', 'lowerA', 'upperB', 'lowerB'] },
  5: { naam: 'Push/pull/legs + upper/lower', dagen: ['push', 'pull', 'legs', 'upperB', 'lowerB'] },
};

export const WEKEN = [
  {
    nr: 1,
    label: 'Basis',
    uitleg:
      'Kies per oefening een gewicht waarmee je alle sets haalt met nog 1–2 reps over. De app onthoudt je gewichten voor de volgende weken.',
  },
  { nr: 2, label: '+1 rep', uitleg: 'Zelfde gewichten als week 1, maar doe 1 rep extra per set.' },
  {
    nr: 3,
    label: 'Zwaarder',
    uitleg: 'Gewicht omhoog: +2,5 kg voor bovenlichaam, +5 kg voor onderlichaam. Reps terug naar week 1.',
  },
  {
    nr: 4,
    label: 'Deload',
    uitleg: 'Herstelweek: ongeveer 40% minder sets met het gewicht van week 1. Focus op techniek.',
  },
];

// ---------------------------------------------------------------------------

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

export function nieuweSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Valideert de invoer; geeft null bij ongeldige waarden. */
export function normaliseerInvoer(raw: Record<string, unknown> | null | undefined): Invoer | null {
  if (!raw) return null;
  const invoer = {
    doel: raw.doel as Doel,
    niveau: raw.niveau as Niveau,
    dagen: Number(raw.dagen),
    tijd: Number(raw.tijd),
    apparatuur: raw.apparatuur as ApparatuurKeuze,
  };
  if (!(invoer.doel in DOELEN) || !(invoer.niveau in NIVEAUS) || !(invoer.apparatuur in APPARATUUR_KEUZES)) return null;
  if (!DAGEN.includes(invoer.dagen) || !TIJDEN.includes(invoer.tijd)) return null;
  return invoer;
}

/** Oefeningen die passen bij apparatuur en niveau. */
export function beschikbareOefeningen(apparatuur: ApparatuurKeuze, niveau: Niveau) {
  const ok = BESCHIKBAAR[apparatuur];
  return OEFENINGEN.filter((o) => ok.includes(o.apparatuur) && (!o.niveau || o.niveau === niveau));
}

function repsVoor(oefening: PlanOefening, doel: Doel): [number, number] {
  if (oefening.eenheid === 'sec') return REPS[doel].sec;
  return REPS[doel][oefening.type];
}

/** Geschatte duur van een training in minuten (incl. 5 min warming-up). */
export function schatMinuten(oefeningen: Pick<SchemaOefening, 'reps' | 'eenheid' | 'sets' | 'rust'>[]) {
  let sec = 5 * 60;
  for (const o of oefeningen) {
    const gem = (o.reps[0] + o.reps[1]) / 2;
    const werk = o.eenheid === 'sec' ? gem + 10 : gem * 3.5 + 10;
    sec += o.sets * (werk + o.rust) + 60; // 60 sec wisselen/opzetten per oefening
  }
  return Math.round(sec / 60);
}

function gewicht(oefening: PlanOefening, invoer: Invoer, gebruik: Map<string, number>) {
  let w = 1;
  if (oefening.basis) w *= invoer.doel === 'kracht' ? 6 : 4;
  const zonderGewicht = oefening.apparatuur === 'lichaamsgewicht' && oefening.patroon !== 'core';
  if (zonderGewicht && invoer.apparatuur === 'gym') w *= 0.03;
  if (zonderGewicht && invoer.apparatuur === 'dumbbells') w *= 0.1;
  // In de gym liever barbell, machine en kabel; dumbbells blijven wel mogelijk.
  if (invoer.apparatuur === 'gym' && (oefening.apparatuur === 'dumbbells' || oefening.apparatuur === 'bank')) w *= 0.6;
  return w / (1 + 8 * (gebruik.get(oefening.id) ?? 0));
}

function kies(kandidaten: PlanOefening[], invoer: Invoer, gebruik: Map<string, number>, random: () => number) {
  const gewichten = kandidaten.map((o) => gewicht(o, invoer, gebruik));
  let r = random() * gewichten.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kandidaten.length; i++) {
    r -= gewichten[i];
    if (r <= 0) return kandidaten[i];
  }
  return kandidaten[kandidaten.length - 1];
}

function maakOefening(o: PlanOefening, invoer: Invoer, sets: number): SchemaOefening {
  return {
    id: o.id,
    slug: BIBLIOTHEEK[o.id],
    naam: o.naam,
    spiergroep: o.spiergroep,
    patroon: o.patroon,
    apparatuur: APPARATUUR[o.apparatuur],
    zonderGewicht: o.apparatuur === 'lichaamsgewicht',
    type: o.type,
    deel: o.deel,
    tip: o.tip,
    eenheid: o.eenheid ?? 'reps',
    sets,
    reps: repsVoor(o, invoer.doel),
    rust: RUST[invoer.doel][o.type],
  };
}

function bouwDag(
  type: string,
  invoer: Invoer,
  pool: PlanOefening[],
  gebruik: Map<string, number>,
  random: () => number,
  cardioMinuten = 0,
): SchemaOefening[] {
  const beginner = invoer.niveau === 'beginner';
  const budget = (invoer.tijd === 75 ? 80 : invoer.tijd) - cardioMinuten;
  const basisAantal = Math.max(
    MIN_OEFENINGEN,
    ({ 30: 4, 45: 5, 60: 6, 75: 7 } as Record<number, number>)[invoer.tijd] - (beginner ? 1 : 0),
  );
  const maxAantal = beginner ? basisAantal : Math.min(8, basisAantal + 1);
  const setsStart = { compound: beginner ? 3 : 4, isolatie: beginner ? 2 : 3 };
  const setsMin = { compound: 2, isolatie: 2 };
  // Beginners groeien niet in sets; gevorderden alleen bij kracht (5 sets op compounds).
  const setsMax = { compound: beginner ? 3 : invoer.doel === 'kracht' ? 5 : 4, isolatie: beginner ? 2 : 3 };

  const slots = DAGTYPES[type].slots;
  let slotIndex = 0;
  const gekozen = new Set<string>();
  const lijst: SchemaOefening[] = [];

  // Volgende oefening uit de slots, zonder dubbele oefeningen binnen de dag.
  const volgende = (): SchemaOefening | null => {
    while (slotIndex < slots.length) {
      const patronen = slots[slotIndex++];
      for (const patroon of patronen) {
        const kandidaten = pool.filter((o) => o.patroon === patroon && !gekozen.has(o.id));
        if (kandidaten.length) {
          const o = kies(kandidaten, invoer, gebruik, random);
          gekozen.add(o.id);
          return maakOefening(o, invoer, setsStart[o.type]);
        }
      }
    }
    return null;
  };

  while (lijst.length < basisAantal) {
    const o = volgende();
    if (!o) break;
    lijst.push(o);
  }

  // Te lang? Eerst isolatiesets omlaag, dan de laatste oefening eraf, dan compoundsets omlaag.
  const krimp = (): boolean | void => {
    for (let i = lijst.length - 1; i >= 0; i--) {
      if (lijst[i].type === 'isolatie' && lijst[i].sets > setsMin.isolatie) return void lijst[i].sets--;
    }
    if (lijst.length > MIN_OEFENINGEN) return void lijst.pop();
    for (let i = lijst.length - 1; i >= 0; i--) {
      if (lijst[i].type === 'compound' && lijst[i].sets > setsMin.compound) return void lijst[i].sets--;
    }
    return false;
  };
  while (schatMinuten(lijst) > budget && krimp() !== false);

  // Tijd over? Gevorderden krijgen een extra oefening of extra sets zolang het past.
  const past = (extra: SchemaOefening[]) => schatMinuten(extra) <= budget;
  let kanToevoegen = true;
  for (;;) {
    if (kanToevoegen && lijst.length < maxAantal) {
      const o = volgende();
      if (o && past([...lijst, o])) {
        lijst.push(o);
        continue;
      }
      kanToevoegen = false; // geen oefening meer of past niet: verder alleen sets
    }
    let groei = false;
    for (const t of ['compound', 'isolatie'] as const) {
      const kandidaat = lijst.filter((o) => o.type === t && o.sets < setsMax[t]).sort((a, b) => a.sets - b.sets)[0];
      if (!kandidaat) continue;
      kandidaat.sets++;
      if (past(lijst)) {
        groei = true;
        break;
      }
      kandidaat.sets--;
    }
    if (!groei) break;
  }

  // Altijd eerst de compound-oefeningen (stabiel, dus de slotvolgorde blijft verder intact).
  lijst.sort((a, b) => (a.type === b.type ? 0 : a.type === 'compound' ? -1 : 1));
  return lijst;
}

/**
 * Cardioblok na de krachttraining. Beginners doen rustige duurcardio; gevorderden doen
 * op dag 1 en 3 intervallen (maximaal twee keer per week) en verder rustige cardio.
 */
function kiesCardio(invoer: Invoer, index: number, gebruik: Map<string, number>, random: () => number): Cardio {
  const soort: Cardio['soort'] = invoer.niveau === 'gevorderd' && (index === 0 || index === 2) ? 'interval' : 'rustig';
  const ok = BESCHIKBAAR[invoer.apparatuur];
  const kandidaten = CARDIO.filter(
    (c) => ok.includes(c.apparatuur) && c.soorten.includes(soort) && (!c.niveau || c.niveau === invoer.niveau),
  );
  // In de gym liever een cardiomachine dan wandelen of traplopen.
  const voorkeur = kandidaten.filter((c) => invoer.apparatuur !== 'gym' || c.apparatuur !== 'lichaamsgewicht');
  const lijst = voorkeur.length ? voorkeur : kandidaten;
  const minstGebruikt = Math.min(...lijst.map((c) => gebruik.get(c.id) ?? 0));
  const opties = lijst.filter((c) => (gebruik.get(c.id) ?? 0) === minstGebruikt);
  const c = opties[Math.floor(random() * opties.length)];
  gebruik.set(c.id, (gebruik.get(c.id) ?? 0) + 1);

  const minuten = CARDIO_MINUTEN[invoer.tijd as Tijd];
  const basis = { id: c.id, naam: c.naam, tip: c.tip, apparatuur: APPARATUUR[c.apparatuur], soort };
  if (soort === 'rustig') return { ...basis, minuten };
  const rondes = Math.floor(((minuten - INTERVAL.inUit) * 60) / (INTERVAL.werk + INTERVAL.rust));
  return {
    ...basis,
    rondes,
    werk: INTERVAL.werk,
    rust: INTERVAL.rust,
    minuten: intervalMinuten(rondes, INTERVAL.werk, INTERVAL.rust),
  };
}

const intervalMinuten = (rondes: number, werk: number, rust: number) =>
  Math.round(INTERVAL.inUit + (rondes * (werk + rust)) / 60);

const perWeek = <T>(week: number, waarden: [T, T, T, T]): T => waarden[week - 1];

/** Cardio in een bepaalde week, met dezelfde opbouw als de krachtoefeningen. */
function cardioWeek(c: Cardio | null, week: number): Cardio | null {
  if (!c) return null;
  if (c.soort === 'rustig') {
    const minuten = perWeek(week, [c.minuten, c.minuten + 2, c.minuten, Math.round(c.minuten * 0.6)]);
    const uitleg = perWeek(week, [
      `${minuten} min in een rustig tempo: je kunt nog praten.`,
      `${minuten} min in hetzelfde tempo als week 1.`,
      `${minuten} min, iets hoger tempo, weerstand of helling dan week 1.`,
      `${minuten} min ontspannen, zonder te forceren.`,
    ]);
    return { ...c, minuten, uitleg, advies: perWeek(week, [null, '+2 min', 'Intensiever', 'Deload']) };
  }
  let { rondes = 0, werk = INTERVAL.werk, rust = INTERVAL.rust } = c;
  if (week === 2) rondes += 1;
  if (week === 3) [werk, rust] = [40, 50];
  if (week === 4) rondes = Math.max(2, Math.round(rondes * 0.6));
  const uitleg = `3 min inlopen · ${rondes} × ${werk} sec hard / ${rust} sec rustig · 2 min uitlopen`;
  const advies = perWeek(week, [null, '+1 ronde', '40/50 sec', 'Deload']);
  return { ...c, rondes, werk, rust, minuten: intervalMinuten(rondes, werk, rust), uitleg, advies };
}

const sleutel = (oefeningen: SchemaOefening[]) =>
  oefeningen
    .map((o) => o.id)
    .sort()
    .join('|');

/** Genereert een volledig schema. */
export function genereerSchema(rawInvoer: Invoer | Record<string, unknown>, seed = nieuweSeed()): Schema {
  const invoer = normaliseerInvoer(rawInvoer as Record<string, unknown>);
  if (!invoer) throw new Error('Ongeldige invoer');
  const random = rng(seed);
  const pool = beschikbareOefeningen(invoer.apparatuur, invoer.niveau);
  const split = SPLITS[invoer.dagen];
  const gebruik = new Map<string, number>();
  const dagen: SchemaDag[] = [];

  split.dagen.forEach((type, index) => {
    const cardio = invoer.doel === 'vetverlies' ? kiesCardio(invoer, index, gebruik, random) : null;
    const cardioMinuten = cardio?.minuten ?? 0;
    let oefeningen = bouwDag(type, invoer, pool, gebruik, random, cardioMinuten);
    // Nooit twee identieke trainingen: probeer opnieuw met andere keuzes.
    for (let poging = 0; poging < 25 && dagen.some((d) => sleutel(d.oefeningen) === sleutel(oefeningen)); poging++) {
      oefeningen = bouwDag(type, invoer, pool, gebruik, random, cardioMinuten);
    }
    for (const o of oefeningen) gebruik.set(o.id, (gebruik.get(o.id) ?? 0) + 1);
    dagen.push({ type, naam: DAGTYPES[type].naam, focus: DAGTYPES[type].focus, oefeningen, cardio });
  });

  return { versie: 1, invoer, seed, split: split.naam, dagen };
}

// ---------------------------------------------------------------------------
// Progressie binnen het blok van 4 weken

function adviesZwaarder(o: SchemaOefening) {
  if (o.zonderGewicht)
    return o.eenheid === 'sec' ? '+10 sec of zwaardere variant' : 'Zwaardere variant of 3 sec zakken';
  return o.deel === 'onder' ? '+5 kg' : '+2,5 kg';
}

/** Het schema zoals het er in een bepaalde week (1–4) uitziet. */
export function weekSchema(schema: Schema, week: number): WeekDag[] {
  return schema.dagen.map((dag) => {
    const oefeningen = dag.oefeningen.map((o) => {
      let { sets, reps } = o;
      let advies: string | null = null;
      if (week === 2) {
        const stap = o.eenheid === 'sec' ? 5 : 1;
        reps = [reps[0] + stap, reps[1] + stap];
        advies = o.eenheid === 'sec' ? '+5 sec' : '+1 rep';
      } else if (week === 3) {
        advies = adviesZwaarder(o);
      } else if (week === 4) {
        sets = Math.max(1, Math.round(sets * 0.6));
        advies = 'Deload';
      }
      return { ...o, sets, reps, advies };
    });
    const cardio = cardioWeek(dag.cardio, week);
    return { ...dag, oefeningen, cardio, minuten: schatMinuten(oefeningen) + (cardio?.minuten ?? 0) };
  });
}

// ---------------------------------------------------------------------------
// Weergave-hulpjes

export function formatReps(o: Pick<SchemaOefening, 'reps' | 'eenheid'>) {
  return `${o.reps[0]}–${o.reps[1]}${o.eenheid === 'sec' ? ' sec' : ''}`;
}

export function formatRust(sec: number) {
  if (sec < 60) return `${sec} sec`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, '0')} min` : `${m} min`;
}

// ---------------------------------------------------------------------------
// Oefeningen verwisselen

/** Eén verwisselde oefening: dag, plek in de dag en de nieuwe oefening. */
export interface Wissel {
  dag: number;
  index: number;
  id: string;
}

/**
 * Varianten om een oefening in het schema mee te verwisselen: hetzelfde bewegingspatroon,
 * passend bij je apparatuur en niveau, en nog niet op die dag. Standaardoefeningen eerst.
 */
export function varianten(schema: Schema, dagIndex: number, oefIndex: number): PlanOefening[] {
  const dag = schema.dagen[dagIndex];
  const huidig = dag?.oefeningen[oefIndex];
  if (!huidig) return [];
  const opDag = new Set(dag.oefeningen.map((o) => o.id));
  return beschikbareOefeningen(schema.invoer.apparatuur, schema.invoer.niveau)
    .filter((o) => o.patroon === huidig.patroon && !opDag.has(o.id))
    .sort((a, b) => Number(!!b.basis) - Number(!!a.basis) || a.naam.localeCompare(b.naam));
}

/** Het schema met één oefening vervangen; sets blijven, reps en rust volgen het type van de nieuwe oefening. */
export function wisselOefening(schema: Schema, w: Wissel): Schema {
  const nieuw = OEFENINGEN.find((o) => o.id === w.id);
  const oud = schema.dagen[w.dag]?.oefeningen[w.index];
  if (!nieuw || !oud) return schema;
  const dagen = schema.dagen.map((dag, d) =>
    d !== w.dag
      ? dag
      : {
          ...dag,
          oefeningen: dag.oefeningen.map((o, i) => (i === w.index ? maakOefening(nieuw, schema.invoer, oud.sets) : o)),
        },
  );
  return { ...schema, dagen };
}

export function pasWisselsToe(schema: Schema, wissels: Wissel[] = []): Schema {
  return wissels.reduce(wisselOefening, schema);
}
