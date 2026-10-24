// Coach-oefeningendatabase.
//
// Dit bestand bevat alleen gegevens en kleine hulpfuncties, geen schermcode. De generator
// (fase 3) en de progressie-engine (fase 4) lezen hieruit.
//
// Elke oefening gebruikt dezelfde `id` als de slug in de oefeningenbibliotheek
// (src/library/exercises.ts). Daardoor hoort een coach-oefening automatisch bij de
// oefening in de logger, met al je geschiedenis, PR's en animatie.
//
// Velden:
//   id            slug uit de bibliotheek
//   naam          Nederlandse (weergave)naam, zoals in de logger
//   naamEn        Engelse naam
//   primair       spieren die het meeste werk doen
//   secundair     spieren die meehelpen
//   patroon       bewegingspatroon (squat, hinge, horizontaal duwen, ...)
//   materiaal     alles wat je nodig hebt; de oefening kan alleen als je alles hebt
//   niveau        vanaf welk niveau de oefening geschikt is
//   progressie    'gewicht' = zwaarder maken, 'reps' = meer herhalingen
//   reps          standaard repbereik [min, max]
//   rust          standaard rust in seconden
//   stap          hoeveel kg er per stap bij komt (zie stapVoor)
//   gewrichten    gewrichten die de oefening belast (voor blessures)
//   alternatieven 2-4 oefeningen met hetzelfde patroon
//   tip           één techniektip
//   eenheid       'sec' voor oefeningen die je op tijd doet (plank e.d.)

import { LIBRARY_BY_SLUG, type Equipment, type Muscle } from '../library/exercises';

export type Patroon =
  | 'squat'
  | 'hinge'
  | 'horizontaal duwen'
  | 'verticaal duwen'
  | 'horizontaal trekken'
  | 'verticaal trekken'
  | 'lunge'
  | 'isolatie'
  | 'core';

export const PATRONEN: Patroon[] = [
  'squat',
  'hinge',
  'horizontaal duwen',
  'verticaal duwen',
  'horizontaal trekken',
  'verticaal trekken',
  'lunge',
  'isolatie',
  'core',
];

export type Materiaal = 'stang' | 'dumbbells' | 'machine' | 'kabel' | 'lichaamsgewicht' | 'bank' | 'rek';
export const MATERIALEN: Materiaal[] = ['stang', 'dumbbells', 'machine', 'kabel', 'lichaamsgewicht', 'bank', 'rek'];

export type Niveau = 'beginner' | 'gevorderd' | 'ervaren';
export const NIVEAUS: Niveau[] = ['beginner', 'gevorderd', 'ervaren'];

export type Gewricht = 'knie' | 'onderrug' | 'schouder' | 'elleboog' | 'pols' | 'heup' | 'nek';
export const GEWRICHTEN: Gewricht[] = ['knie', 'onderrug', 'schouder', 'elleboog', 'pols', 'heup', 'nek'];

export type Spier =
  | 'borst'
  | 'lats'
  | 'bovenrug'
  | 'onderrug'
  | 'voorkant schouder'
  | 'zijkant schouder'
  | 'achterkant schouder'
  | 'biceps'
  | 'triceps'
  | 'onderarmen'
  | 'quadriceps'
  | 'hamstrings'
  | 'billen'
  | 'adductoren'
  | 'kuiten'
  | 'buik'
  | 'schuine buikspieren';

/** Grote spiergroepen: voor prioriteiten in de vragenlijst en volume in de check-in. */
export type Spiergroep = 'borst' | 'rug' | 'schouders' | 'armen' | 'benen' | 'billen' | 'buik';
export const SPIERGROEPEN: Spiergroep[] = ['borst', 'rug', 'schouders', 'armen', 'benen', 'billen', 'buik'];

export const GROEP_VAN: Record<Spier, Spiergroep> = {
  borst: 'borst',
  lats: 'rug',
  bovenrug: 'rug',
  onderrug: 'rug',
  'voorkant schouder': 'schouders',
  'zijkant schouder': 'schouders',
  'achterkant schouder': 'schouders',
  biceps: 'armen',
  triceps: 'armen',
  onderarmen: 'armen',
  quadriceps: 'benen',
  hamstrings: 'benen',
  adductoren: 'benen',
  kuiten: 'benen',
  billen: 'billen',
  buik: 'buik',
  'schuine buikspieren': 'buik',
};

export type Progressie = 'gewicht' | 'reps';

export interface CoachOefening {
  id: string;
  naam: string;
  naamEn: string;
  primair: Spier[];
  secundair: Spier[];
  patroon: Patroon;
  materiaal: Materiaal[];
  niveau: Niveau;
  progressie: Progressie;
  reps: [number, number];
  rust: number;
  stap: number;
  gewrichten: Gewricht[];
  alternatieven: string[];
  tip: string;
  eenheid?: 'sec';
}

// ---------- standaardwaarden ----------

const ONDERLICHAAM: Spier[] = ['quadriceps', 'hamstrings', 'billen', 'adductoren', 'kuiten'];

/** Het belangrijkste materiaal: het eerste dat iets over het gewicht zegt. */
export function hoofdMateriaal(materiaal: Materiaal[]): Materiaal {
  for (const m of ['stang', 'dumbbells', 'machine', 'kabel'] as Materiaal[]) if (materiaal.includes(m)) return m;
  return 'lichaamsgewicht';
}

/**
 * Stapgrootte in kg:
 * stang voor benen 5, stang voor bovenlichaam 2,5, dumbbells 2, machine en kabel 2,5.
 * Lichaamsgewicht 2,5 (alleen als je er een gewicht aan hangt; normaal tel je reps).
 */
export function stapVoor(o: Pick<CoachOefening, 'materiaal' | 'primair' | 'patroon'>): number {
  switch (hoofdMateriaal(o.materiaal)) {
    case 'stang': {
      const benen =
        o.patroon === 'squat' ||
        o.patroon === 'hinge' ||
        o.patroon === 'lunge' ||
        o.primair.some((s) => ONDERLICHAAM.includes(s));
      return benen ? 5 : 2.5;
    }
    case 'dumbbells':
      return 2;
    default:
      return 2.5;
  }
}

function standaardReps(patroon: Patroon, hoofd: Materiaal, progressie: Progressie): [number, number] {
  if (progressie === 'reps') return patroon === 'core' ? [10, 20] : [8, 15];
  if (patroon === 'isolatie' || patroon === 'core') return [10, 15];
  if (patroon === 'lunge') return [8, 12];
  return hoofd === 'stang' ? [6, 10] : [8, 12];
}

function standaardRust(patroon: Patroon, hoofd: Materiaal): number {
  if (patroon === 'core') return 45;
  if (patroon === 'isolatie') return 60;
  if (patroon === 'lunge') return 90;
  if (hoofd === 'stang' && (patroon === 'squat' || patroon === 'hinge')) return 180;
  return hoofd === 'stang' ? 150 : 120;
}

interface Extra {
  niveau?: Niveau;
  progressie?: Progressie;
  reps?: [number, number];
  rust?: number;
  tip?: string;
  eenheid?: 'sec';
}

function o(
  id: string,
  naamEn: string,
  patroon: Patroon,
  primair: Spier[],
  secundair: Spier[],
  materiaal: Materiaal[],
  gewrichten: Gewricht[],
  alternatieven: string[],
  extra: Extra = {},
): CoachOefening {
  const lib = LIBRARY_BY_SLUG.get(id);
  const hoofd = hoofdMateriaal(materiaal);
  const progressie = extra.progressie ?? (hoofd === 'lichaamsgewicht' ? 'reps' : 'gewicht');
  const basis = { patroon, primair, materiaal };
  return {
    id,
    naam: lib?.name ?? id,
    naamEn,
    primair,
    secundair,
    patroon,
    materiaal,
    niveau: extra.niveau ?? 'beginner',
    progressie,
    reps: extra.reps ?? (extra.eenheid === 'sec' ? [20, 60] : standaardReps(patroon, hoofd, progressie)),
    rust: extra.rust ?? standaardRust(patroon, hoofd),
    stap: stapVoor(basis),
    gewrichten,
    alternatieven,
    tip: extra.tip ?? lib?.tip ?? '',
    eenheid: extra.eenheid,
  };
}

const G = 'gevorderd' as const;
const E = 'ervaren' as const;

// ---------- de database ----------

// prettier-ignore
export const COACH_OEFENINGEN: CoachOefening[] = [
  // ---------- squat ----------
  o('squat', 'Back squat', 'squat', ['quadriceps', 'billen'], ['hamstrings', 'onderrug', 'buik'], ['stang', 'rek'],
    ['knie', 'heup', 'onderrug'], ['leg-press', 'hack-squat', 'smith-squat', 'goblet-squat']),
  o('front-squat', 'Front squat', 'squat', ['quadriceps'], ['billen', 'bovenrug', 'buik'], ['stang', 'rek'],
    ['knie', 'pols', 'onderrug'], ['squat', 'hack-squat', 'goblet-squat'], { niveau: G }),
  o('hack-squat', 'Hack squat', 'squat', ['quadriceps'], ['billen'], ['machine'],
    ['knie'], ['leg-press', 'smith-squat', 'squat']),
  o('smith-squat', 'Smith machine squat', 'squat', ['quadriceps', 'billen'], ['hamstrings'], ['machine'],
    ['knie', 'heup'], ['hack-squat', 'leg-press', 'squat']),
  o('leg-press', 'Leg press', 'squat', ['quadriceps', 'billen'], ['hamstrings', 'adductoren'], ['machine'],
    ['knie', 'heup'], ['hack-squat', 'smith-squat', 'goblet-squat', 'squat']),
  o('goblet-squat', 'Goblet squat', 'squat', ['quadriceps', 'billen'], ['buik', 'bovenrug'], ['dumbbells'],
    ['knie', 'heup'], ['dumbbell-squat', 'leg-press', 'bodyweight-squat']),
  o('dumbbell-squat', 'Dumbbell squat', 'squat', ['quadriceps', 'billen'], ['hamstrings', 'onderarmen'], ['dumbbells'],
    ['knie', 'heup'], ['goblet-squat', 'leg-press', 'bodyweight-squat']),
  o('bodyweight-squat', 'Bodyweight squat', 'squat', ['quadriceps', 'billen'], ['hamstrings'], ['lichaamsgewicht'],
    ['knie'], ['jump-squat', 'goblet-squat', 'wall-sit'], { reps: [12, 25] }),
  o('jump-squat', 'Jump squat', 'squat', ['quadriceps', 'billen'], ['kuiten'], ['lichaamsgewicht'],
    ['knie', 'heup'], ['bodyweight-squat', 'pistol-squat', 'goblet-squat'], { niveau: G, reps: [8, 15] }),
  o('pistol-squat', 'Pistol squat', 'squat', ['quadriceps', 'billen'], ['buik'], ['lichaamsgewicht'],
    ['knie', 'heup'], ['jump-squat', 'bodyweight-squat', 'goblet-squat'], { niveau: E, reps: [4, 10] }),
  o('wall-sit', 'Wall sit', 'squat', ['quadriceps'], ['billen'], ['lichaamsgewicht'],
    ['knie'], ['bodyweight-squat', 'goblet-squat'], { eenheid: 'sec', reps: [30, 60], rust: 60 }),

  // ---------- lunge ----------
  o('lunges', 'Walking lunge', 'lunge', ['quadriceps', 'billen'], ['hamstrings', 'adductoren'], ['dumbbells'],
    ['knie', 'heup'], ['reverse-lunge', 'bulgarian-split-squat', 'step-up']),
  o('reverse-lunge', 'Reverse lunge', 'lunge', ['quadriceps', 'billen'], ['hamstrings'], ['lichaamsgewicht'],
    ['knie', 'heup'], ['lunges', 'step-up', 'bulgarian-split-squat'],
    { reps: [10, 20], tip: 'Stap ver naar achteren en zak recht omlaag. Je voorste knie blijft boven je voet; duw je op via je voorste hiel.' }),
  o('bulgarian-split-squat', 'Bulgarian split squat', 'lunge', ['quadriceps', 'billen'], ['hamstrings', 'adductoren'],
    ['dumbbells', 'bank'], ['knie', 'heup'], ['reverse-lunge', 'lunges', 'step-up']),
  o('step-up', 'Step-up', 'lunge', ['quadriceps', 'billen'], ['hamstrings'], ['dumbbells', 'bank'],
    ['knie'], ['reverse-lunge', 'lunges', 'bulgarian-split-squat']),
  o('jumping-lunge', 'Jumping lunge', 'lunge', ['quadriceps', 'billen'], ['kuiten'], ['lichaamsgewicht'],
    ['knie', 'heup'], ['reverse-lunge', 'lunges'], { niveau: G, reps: [8, 16] }),

  // ---------- hinge ----------
  o('deadlift', 'Deadlift', 'hinge', ['hamstrings', 'billen', 'onderrug'], ['bovenrug', 'onderarmen', 'quadriceps'],
    ['stang'], ['onderrug', 'heup'], ['romanian-deadlift', 'rack-pull', 'dumbbell-rdl'], { niveau: G, reps: [3, 6] }),
  o('romanian-deadlift', 'Romanian deadlift', 'hinge', ['hamstrings', 'billen'], ['onderrug', 'onderarmen'], ['stang'],
    ['onderrug', 'heup'], ['dumbbell-rdl', 'good-morning', 'cable-pull-through', 'hip-thrust']),
  o('rack-pull', 'Rack pull', 'hinge', ['billen', 'onderrug', 'bovenrug'], ['hamstrings', 'onderarmen'], ['stang', 'rek'],
    ['onderrug', 'heup'], ['deadlift', 'romanian-deadlift'], { niveau: G, reps: [4, 8] }),
  o('good-morning', 'Good morning', 'hinge', ['hamstrings', 'onderrug'], ['billen'], ['stang', 'rek'],
    ['onderrug', 'heup'], ['romanian-deadlift', 'back-extension', 'dumbbell-rdl'], { niveau: G }),
  o('dumbbell-rdl', 'Dumbbell Romanian deadlift', 'hinge', ['hamstrings', 'billen'], ['onderrug', 'onderarmen'],
    ['dumbbells'], ['onderrug', 'heup'], ['romanian-deadlift', 'single-leg-rdl', 'dumbbell-hip-thrust']),
  o('single-leg-rdl', 'Single-leg RDL', 'hinge', ['hamstrings', 'billen'], ['buik'], ['dumbbells'],
    ['heup'], ['dumbbell-rdl', 'single-leg-glute-bridge', 'cable-pull-through'], { niveau: G }),
  o('hip-thrust', 'Barbell hip thrust', 'hinge', ['billen'], ['hamstrings'], ['stang', 'bank'],
    ['heup'], ['dumbbell-hip-thrust', 'glute-bridge', 'cable-pull-through']),
  o('dumbbell-hip-thrust', 'Dumbbell hip thrust', 'hinge', ['billen'], ['hamstrings'], ['dumbbells', 'bank'],
    ['heup'], ['hip-thrust', 'glute-bridge', 'single-leg-glute-bridge']),
  o('glute-bridge', 'Glute bridge', 'hinge', ['billen'], ['hamstrings'], ['lichaamsgewicht'],
    ['heup'], ['single-leg-glute-bridge', 'dumbbell-hip-thrust', 'hip-thrust'], { reps: [12, 20] }),
  o('single-leg-glute-bridge', 'Single-leg glute bridge', 'hinge', ['billen'], ['hamstrings'], ['lichaamsgewicht'],
    ['heup'], ['glute-bridge', 'dumbbell-hip-thrust', 'single-leg-rdl']),
  o('cable-pull-through', 'Cable pull-through', 'hinge', ['billen', 'hamstrings'], ['onderrug'], ['kabel'],
    ['heup'], ['romanian-deadlift', 'hip-thrust', 'dumbbell-rdl'], { reps: [10, 15] }),
  o('back-extension', 'Back extension', 'hinge', ['onderrug', 'billen'], ['hamstrings'], ['lichaamsgewicht'],
    ['onderrug'], ['good-morning', 'superman', 'romanian-deadlift'], { reps: [10, 20] }),
  o('superman', 'Superman', 'hinge', ['onderrug'], ['billen'], ['lichaamsgewicht'],
    ['onderrug'], ['back-extension', 'glute-bridge', 'single-leg-glute-bridge'], { reps: [10, 20], rust: 45 }),

  // ---------- horizontaal duwen ----------
  o('bankdrukken', 'Bench press', 'horizontaal duwen', ['borst'], ['triceps', 'voorkant schouder'], ['stang', 'bank', 'rek'],
    ['schouder', 'elleboog', 'pols'], ['dumbbell-bankdrukken', 'chest-press-machine', 'smith-bankdrukken', 'push-up']),
  o('dumbbell-bankdrukken', 'Dumbbell bench press', 'horizontaal duwen', ['borst'], ['triceps', 'voorkant schouder'],
    ['dumbbells', 'bank'], ['schouder', 'elleboog'], ['bankdrukken', 'chest-press-machine', 'dumbbell-floor-press']),
  o('smith-bankdrukken', 'Smith machine bench press', 'horizontaal duwen', ['borst'], ['triceps', 'voorkant schouder'],
    ['machine', 'bank'], ['schouder', 'elleboog'], ['bankdrukken', 'chest-press-machine', 'dumbbell-bankdrukken']),
  o('incline-bankdrukken', 'Incline bench press', 'horizontaal duwen', ['borst', 'voorkant schouder'], ['triceps'],
    ['stang', 'bank', 'rek'], ['schouder', 'elleboog', 'pols'], ['incline-dumbbell-press', 'bankdrukken', 'chest-press-machine']),
  o('incline-dumbbell-press', 'Incline dumbbell press', 'horizontaal duwen', ['borst', 'voorkant schouder'], ['triceps'],
    ['dumbbells', 'bank'], ['schouder', 'elleboog'], ['incline-bankdrukken', 'dumbbell-bankdrukken', 'decline-push-up']),
  o('decline-bankdrukken', 'Decline bench press', 'horizontaal duwen', ['borst'], ['triceps'], ['stang', 'bank', 'rek'],
    ['schouder', 'elleboog', 'pols'], ['bankdrukken', 'dips', 'dumbbell-bankdrukken'], { niveau: G }),
  o('chest-press-machine', 'Machine chest press', 'horizontaal duwen', ['borst'], ['triceps', 'voorkant schouder'],
    ['machine'], ['schouder', 'elleboog'], ['dumbbell-bankdrukken', 'smith-bankdrukken', 'bankdrukken']),
  o('dumbbell-floor-press', 'Dumbbell floor press', 'horizontaal duwen', ['borst', 'triceps'], ['voorkant schouder'],
    ['dumbbells'], ['elleboog'], ['dumbbell-bankdrukken', 'push-up', 'chest-press-machine']),
  o('push-up', 'Push-up', 'horizontaal duwen', ['borst'], ['triceps', 'voorkant schouder', 'buik'], ['lichaamsgewicht'],
    ['schouder', 'pols', 'elleboog'], ['incline-push-up', 'decline-push-up', 'dumbbell-floor-press', 'push-up-knieen'],
    { reps: [8, 20] }),
  o('push-up-knieen', 'Knee push-up', 'horizontaal duwen', ['borst'], ['triceps', 'voorkant schouder'], ['lichaamsgewicht'],
    ['schouder', 'pols'], ['incline-push-up', 'push-up'], { reps: [8, 20] }),
  o('incline-push-up', 'Incline push-up', 'horizontaal duwen', ['borst'], ['triceps', 'voorkant schouder'],
    ['lichaamsgewicht'], ['schouder', 'pols'], ['push-up-knieen', 'push-up'], { reps: [8, 20] }),
  o('decline-push-up', 'Decline push-up', 'horizontaal duwen', ['borst', 'voorkant schouder'], ['triceps'],
    ['lichaamsgewicht'], ['schouder', 'pols', 'elleboog'], ['push-up', 'incline-dumbbell-press', 'diamond-push-up'],
    { niveau: G, reps: [8, 20] }),
  o('dips', 'Dips', 'horizontaal duwen', ['borst', 'triceps'], ['voorkant schouder'], ['lichaamsgewicht', 'rek'],
    ['schouder', 'elleboog'], ['decline-bankdrukken', 'close-grip-bankdrukken', 'push-up'], { niveau: G, reps: [6, 12] }),
  o('close-grip-bankdrukken', 'Close-grip bench press', 'horizontaal duwen', ['triceps', 'borst'], ['voorkant schouder'],
    ['stang', 'bank', 'rek'], ['elleboog', 'pols', 'schouder'], ['dips', 'diamond-push-up', 'bankdrukken']),
  o('diamond-push-up', 'Diamond push-up', 'horizontaal duwen', ['triceps', 'borst'], ['voorkant schouder'],
    ['lichaamsgewicht'], ['elleboog', 'pols'], ['push-up', 'close-grip-bankdrukken', 'dips'],
    { niveau: G, reps: [6, 15] }),

  // ---------- verticaal duwen ----------
  o('overhead-press', 'Overhead press', 'verticaal duwen', ['voorkant schouder', 'zijkant schouder'], ['triceps', 'bovenrug', 'buik'],
    ['stang', 'rek'], ['schouder', 'onderrug', 'pols'], ['dumbbell-schouderpress', 'shoulder-press-machine', 'staande-dumbbell-press']),
  o('dumbbell-schouderpress', 'Seated dumbbell shoulder press', 'verticaal duwen', ['voorkant schouder', 'zijkant schouder'],
    ['triceps'], ['dumbbells', 'bank'], ['schouder', 'elleboog'], ['shoulder-press-machine', 'arnold-press', 'overhead-press']),
  o('staande-dumbbell-press', 'Standing dumbbell press', 'verticaal duwen', ['voorkant schouder', 'zijkant schouder'],
    ['triceps', 'buik'], ['dumbbells'], ['schouder', 'onderrug'], ['dumbbell-schouderpress', 'arnold-press', 'pike-push-up']),
  o('arnold-press', 'Arnold press', 'verticaal duwen', ['voorkant schouder', 'zijkant schouder'], ['triceps'],
    ['dumbbells', 'bank'], ['schouder'], ['dumbbell-schouderpress', 'shoulder-press-machine', 'staande-dumbbell-press'],
    { niveau: G }),
  o('shoulder-press-machine', 'Machine shoulder press', 'verticaal duwen', ['voorkant schouder', 'zijkant schouder'],
    ['triceps'], ['machine'], ['schouder', 'elleboog'], ['dumbbell-schouderpress', 'overhead-press', 'arnold-press']),
  o('pike-push-up', 'Pike push-up', 'verticaal duwen', ['voorkant schouder'], ['triceps', 'borst'], ['lichaamsgewicht'],
    ['schouder', 'pols'], ['staande-dumbbell-press', 'handstand-push-up', 'dumbbell-schouderpress'], { reps: [6, 15] }),
  o('handstand-push-up', 'Wall handstand push-up', 'verticaal duwen', ['voorkant schouder', 'triceps'], ['bovenrug'],
    ['lichaamsgewicht'], ['schouder', 'pols', 'nek'], ['pike-push-up', 'overhead-press'], { niveau: E, reps: [3, 10] }),

  // ---------- horizontaal trekken ----------
  o('barbell-row', 'Barbell row', 'horizontaal trekken', ['bovenrug', 'lats'], ['achterkant schouder', 'biceps', 'onderrug'],
    ['stang'], ['onderrug', 'elleboog'], ['dumbbell-row', 'seated-cable-row', 't-bar-row', 'seated-row-machine']),
  o('t-bar-row', 'T-bar row', 'horizontaal trekken', ['bovenrug', 'lats'], ['biceps', 'onderrug'], ['stang'],
    ['onderrug', 'elleboog'], ['barbell-row', 'seated-row-machine', 'dumbbell-row'], { niveau: G }),
  o('dumbbell-row', 'One-arm dumbbell row', 'horizontaal trekken', ['lats', 'bovenrug'], ['biceps', 'achterkant schouder'],
    ['dumbbells', 'bank'], ['elleboog'], ['seated-cable-row', 'dumbbell-bent-over-row', 'barbell-row']),
  o('dumbbell-bent-over-row', 'Dumbbell bent-over row', 'horizontaal trekken', ['bovenrug', 'lats'], ['biceps', 'onderrug'],
    ['dumbbells'], ['onderrug', 'elleboog'], ['dumbbell-row', 'barbell-row', 'inverted-row']),
  o('seated-cable-row', 'Seated cable row', 'horizontaal trekken', ['bovenrug', 'lats'], ['biceps', 'achterkant schouder'],
    ['kabel'], ['elleboog'], ['seated-row-machine', 'dumbbell-row', 'barbell-row']),
  o('seated-row-machine', 'Machine row', 'horizontaal trekken', ['bovenrug', 'lats'], ['biceps'], ['machine'],
    ['elleboog'], ['seated-cable-row', 'dumbbell-row', 't-bar-row']),
  o('renegade-row', 'Renegade row', 'horizontaal trekken', ['lats', 'bovenrug'], ['buik', 'biceps'], ['dumbbells'],
    ['pols', 'schouder'], ['dumbbell-row', 'dumbbell-bent-over-row'], { niveau: G }),
  o('inverted-row', 'Inverted row', 'horizontaal trekken', ['bovenrug', 'lats'], ['biceps', 'achterkant schouder'],
    ['lichaamsgewicht'], ['elleboog'], ['dumbbell-bent-over-row', 'seated-cable-row', 'dumbbell-row'], { reps: [6, 15] }),

  // ---------- verticaal trekken ----------
  o('pull-up', 'Pull-up', 'verticaal trekken', ['lats'], ['biceps', 'bovenrug'], ['lichaamsgewicht', 'rek'],
    ['schouder', 'elleboog'], ['lat-pulldown', 'assisted-pull-up', 'chin-up'], { niveau: G, reps: [4, 10] }),
  o('chin-up', 'Chin-up', 'verticaal trekken', ['lats', 'biceps'], ['bovenrug'], ['lichaamsgewicht', 'rek'],
    ['elleboog', 'schouder'], ['close-grip-lat-pulldown', 'pull-up', 'assisted-pull-up'], { niveau: G, reps: [4, 10] }),
  o('assisted-pull-up', 'Assisted pull-up', 'verticaal trekken', ['lats'], ['biceps', 'bovenrug'], ['machine'],
    ['schouder', 'elleboog'], ['lat-pulldown', 'pull-up', 'close-grip-lat-pulldown'], { reps: [6, 12] }),
  o('lat-pulldown', 'Lat pulldown', 'verticaal trekken', ['lats'], ['biceps', 'bovenrug'], ['kabel'],
    ['schouder', 'elleboog'], ['assisted-pull-up', 'close-grip-lat-pulldown', 'pull-up']),
  o('close-grip-lat-pulldown', 'Close-grip lat pulldown', 'verticaal trekken', ['lats'], ['biceps'], ['kabel'],
    ['elleboog'], ['lat-pulldown', 'chin-up', 'assisted-pull-up']),

  // ---------- isolatie: borst ----------
  o('dumbbell-flyes', 'Dumbbell fly', 'isolatie', ['borst'], ['voorkant schouder'], ['dumbbells', 'bank'],
    ['schouder'], ['cable-crossover', 'pec-deck', 'dumbbell-pullover']),
  o('cable-crossover', 'Cable crossover', 'isolatie', ['borst'], ['voorkant schouder'], ['kabel'],
    ['schouder'], ['pec-deck', 'dumbbell-flyes']),
  o('pec-deck', 'Pec deck', 'isolatie', ['borst'], [], ['machine'],
    ['schouder'], ['cable-crossover', 'dumbbell-flyes']),
  o('dumbbell-pullover', 'Dumbbell pullover', 'isolatie', ['borst', 'lats'], ['triceps'], ['dumbbells', 'bank'],
    ['schouder'], ['dumbbell-flyes', 'straight-arm-pulldown', 'cable-crossover']),

  // ---------- isolatie: schouders ----------
  o('lateral-raises', 'Lateral raise', 'isolatie', ['zijkant schouder'], ['voorkant schouder'], ['dumbbells'],
    ['schouder'], ['cable-lateral-raise', 'lateral-raise-machine', 'upright-row'], { reps: [12, 20] }),
  o('cable-lateral-raise', 'Cable lateral raise', 'isolatie', ['zijkant schouder'], ['voorkant schouder'], ['kabel'],
    ['schouder'], ['lateral-raises', 'lateral-raise-machine'], { reps: [12, 20] }),
  o('lateral-raise-machine', 'Machine lateral raise', 'isolatie', ['zijkant schouder'], [], ['machine'],
    ['schouder'], ['lateral-raises', 'cable-lateral-raise'], { reps: [12, 20] }),
  o('upright-row', 'Upright row', 'isolatie', ['zijkant schouder'], ['bovenrug', 'biceps'], ['stang'],
    ['schouder', 'pols'], ['lateral-raises', 'cable-lateral-raise'], { niveau: G }),
  o('front-raises', 'Front raise', 'isolatie', ['voorkant schouder'], [], ['dumbbells'],
    ['schouder'], ['lateral-raises', 'cable-lateral-raise']),
  o('reverse-pec-deck', 'Reverse pec deck', 'isolatie', ['achterkant schouder'], ['bovenrug'], ['machine'],
    ['schouder'], ['face-pulls', 'dumbbell-rear-delt-fly'], { reps: [12, 20] }),
  o('face-pulls', 'Face pull', 'isolatie', ['achterkant schouder'], ['bovenrug'], ['kabel'],
    ['schouder'], ['reverse-pec-deck', 'dumbbell-rear-delt-fly'], { reps: [12, 20] }),
  o('dumbbell-rear-delt-fly', 'Rear delt fly', 'isolatie', ['achterkant schouder'], ['bovenrug'], ['dumbbells'],
    ['schouder'], ['face-pulls', 'reverse-pec-deck'], { reps: [12, 20] }),
  o('shrugs', 'Shrug', 'isolatie', ['bovenrug'], ['onderarmen'], ['dumbbells'],
    ['nek'], ['upright-row', 'face-pulls']),
  o('straight-arm-pulldown', 'Straight-arm pulldown', 'isolatie', ['lats'], ['achterkant schouder'], ['kabel'],
    ['schouder'], ['dumbbell-pullover', 'shrugs']),

  // ---------- isolatie: biceps ----------
  o('barbell-curl', 'Barbell curl', 'isolatie', ['biceps'], ['onderarmen'], ['stang'],
    ['elleboog', 'pols'], ['ez-bar-curl', 'dumbbell-curl', 'cable-curl'], { reps: [8, 12] }),
  o('ez-bar-curl', 'EZ-bar curl', 'isolatie', ['biceps'], ['onderarmen'], ['stang'],
    ['elleboog'], ['barbell-curl', 'dumbbell-curl', 'preacher-curl'], { reps: [8, 12] }),
  o('dumbbell-curl', 'Dumbbell curl', 'isolatie', ['biceps'], ['onderarmen'], ['dumbbells'],
    ['elleboog'], ['hammer-curl', 'cable-curl', 'incline-dumbbell-curl']),
  o('hammer-curl', 'Hammer curl', 'isolatie', ['biceps', 'onderarmen'], [], ['dumbbells'],
    ['elleboog'], ['dumbbell-curl', 'reverse-curl', 'cable-curl']),
  o('preacher-curl', 'Preacher curl', 'isolatie', ['biceps'], [], ['stang', 'bank'],
    ['elleboog'], ['concentration-curl', 'cable-curl', 'ez-bar-curl']),
  o('cable-curl', 'Cable curl', 'isolatie', ['biceps'], ['onderarmen'], ['kabel'],
    ['elleboog'], ['dumbbell-curl', 'barbell-curl', 'preacher-curl']),
  o('incline-dumbbell-curl', 'Incline dumbbell curl', 'isolatie', ['biceps'], [], ['dumbbells', 'bank'],
    ['elleboog', 'schouder'], ['dumbbell-curl', 'cable-curl', 'concentration-curl'], { niveau: G }),
  o('concentration-curl', 'Concentration curl', 'isolatie', ['biceps'], [], ['dumbbells'],
    ['elleboog'], ['preacher-curl', 'dumbbell-curl', 'incline-dumbbell-curl']),
  o('reverse-curl', 'Reverse curl', 'isolatie', ['onderarmen', 'biceps'], [], ['stang'],
    ['pols', 'elleboog'], ['hammer-curl', 'ez-bar-curl']),

  // ---------- isolatie: triceps ----------
  o('triceps-pushdown', 'Triceps pushdown', 'isolatie', ['triceps'], [], ['kabel'],
    ['elleboog'], ['triceps-pushdown-touw', 'overhead-cable-extension', 'dumbbell-kickback']),
  o('triceps-pushdown-touw', 'Rope pushdown', 'isolatie', ['triceps'], [], ['kabel'],
    ['elleboog'], ['triceps-pushdown', 'overhead-cable-extension', 'skullcrusher']),
  o('overhead-triceps-extension', 'Overhead triceps extension', 'isolatie', ['triceps'], [], ['dumbbells'],
    ['elleboog', 'schouder'], ['overhead-cable-extension', 'skullcrusher', 'liggende-dumbbell-triceps-extension']),
  o('overhead-cable-extension', 'Overhead cable extension', 'isolatie', ['triceps'], [], ['kabel'],
    ['elleboog', 'schouder'], ['overhead-triceps-extension', 'triceps-pushdown-touw', 'skullcrusher']),
  o('skullcrusher', 'Skullcrusher', 'isolatie', ['triceps'], [], ['stang', 'bank'],
    ['elleboog'], ['liggende-dumbbell-triceps-extension', 'overhead-triceps-extension', 'triceps-pushdown'],
    { reps: [8, 12] }),
  o('liggende-dumbbell-triceps-extension', 'Lying dumbbell triceps extension', 'isolatie', ['triceps'], [], ['dumbbells'],
    ['elleboog'], ['skullcrusher', 'overhead-triceps-extension', 'dumbbell-kickback']),
  o('dumbbell-kickback', 'Dumbbell kickback', 'isolatie', ['triceps'], [], ['dumbbells'],
    ['elleboog'], ['triceps-pushdown', 'liggende-dumbbell-triceps-extension', 'bench-dips']),
  o('bench-dips', 'Bench dips', 'isolatie', ['triceps'], ['borst', 'voorkant schouder'], ['lichaamsgewicht', 'bank'],
    ['schouder', 'elleboog', 'pols'], ['dumbbell-kickback', 'triceps-pushdown', 'overhead-triceps-extension'],
    { reps: [8, 20] }),

  // ---------- isolatie: benen ----------
  o('leg-extension', 'Leg extension', 'isolatie', ['quadriceps'], [], ['machine'],
    ['knie'], ['sissy-squat', 'hip-adduction']),
  o('sissy-squat', 'Sissy squat', 'isolatie', ['quadriceps'], [], ['lichaamsgewicht'],
    ['knie'], ['leg-extension', 'hip-adduction'], { niveau: G, reps: [8, 15] }),
  o('leg-curl', 'Lying leg curl', 'isolatie', ['hamstrings'], ['kuiten'], ['machine'],
    ['knie'], ['seated-leg-curl', 'dumbbell-leg-curl', 'nordic-curl']),
  o('seated-leg-curl', 'Seated leg curl', 'isolatie', ['hamstrings'], [], ['machine'],
    ['knie'], ['leg-curl', 'dumbbell-leg-curl']),
  o('dumbbell-leg-curl', 'Dumbbell leg curl', 'isolatie', ['hamstrings'], [], ['dumbbells', 'bank'],
    ['knie'], ['leg-curl', 'seated-leg-curl', 'nordic-curl']),
  o('nordic-curl', 'Nordic curl', 'isolatie', ['hamstrings'], ['billen'], ['lichaamsgewicht'],
    ['knie'], ['leg-curl', 'dumbbell-leg-curl'], { niveau: E, reps: [3, 8] }),
  o('kuitheffen', 'Standing calf raise', 'isolatie', ['kuiten'], [], ['machine'],
    ['knie'], ['kuitheffen-zittend', 'single-leg-calf-raise'], { reps: [10, 20] }),
  o('kuitheffen-zittend', 'Seated calf raise', 'isolatie', ['kuiten'], [], ['machine'],
    ['knie'], ['kuitheffen', 'single-leg-calf-raise'], { reps: [12, 20] }),
  o('single-leg-calf-raise', 'Single-leg calf raise', 'isolatie', ['kuiten'], [], ['lichaamsgewicht'],
    ['knie'], ['kuitheffen', 'kuitheffen-zittend'], { reps: [10, 20] }),
  o('hip-adduction', 'Hip adduction machine', 'isolatie', ['adductoren'], ['billen'], ['machine'],
    ['heup'], ['leg-extension', 'leg-curl']),
  o('hip-abduction', 'Hip abduction machine', 'isolatie', ['billen'], [], ['machine'],
    ['heup'], ['cable-glute-kickback', 'hip-adduction'], { reps: [12, 20] }),
  o('cable-glute-kickback', 'Cable glute kickback', 'isolatie', ['billen'], ['hamstrings'], ['kabel'],
    ['heup'], ['hip-abduction', 'hip-adduction']),

  // ---------- core ----------
  o('plank', 'Plank', 'core', ['buik'], ['voorkant schouder'], ['lichaamsgewicht'],
    [], ['zijplank', 'dead-bug', 'hollow-hold'], { eenheid: 'sec', reps: [30, 60] }),
  o('zijplank', 'Side plank', 'core', ['schuine buikspieren'], ['billen'], ['lichaamsgewicht'],
    ['schouder'], ['plank', 'pallof-press', 'russian-twist'], { eenheid: 'sec', reps: [20, 45] }),
  o('hollow-hold', 'Hollow hold', 'core', ['buik'], [], ['lichaamsgewicht'],
    ['onderrug'], ['plank', 'dead-bug'], { eenheid: 'sec', reps: [20, 45], niveau: G }),
  o('dead-bug', 'Dead bug', 'core', ['buik'], [], ['lichaamsgewicht'],
    [], ['bird-dog', 'plank', 'hollow-hold'], { reps: [8, 16] }),
  o('bird-dog', 'Bird dog', 'core', ['buik', 'onderrug'], ['billen'], ['lichaamsgewicht'],
    [], ['dead-bug', 'plank'], { reps: [8, 16] }),
  o('crunch', 'Crunch', 'core', ['buik'], [], ['lichaamsgewicht'],
    ['nek'], ['cable-crunch', 'bicycle-crunch', 'dead-bug'], { reps: [12, 25] }),
  o('sit-up', 'Sit-up', 'core', ['buik'], [], ['lichaamsgewicht'],
    ['onderrug', 'nek'], ['crunch', 'lying-leg-raise'], { reps: [10, 20] }),
  o('bicycle-crunch', 'Bicycle crunch', 'core', ['schuine buikspieren', 'buik'], [], ['lichaamsgewicht'],
    ['nek'], ['russian-twist', 'crunch'], { reps: [12, 24] }),
  o('cable-crunch', 'Cable crunch', 'core', ['buik'], [], ['kabel'],
    [], ['crunch', 'hanging-leg-raise', 'ab-wheel-rollout']),
  o('lying-leg-raise', 'Lying leg raise', 'core', ['buik'], [], ['lichaamsgewicht'],
    ['onderrug'], ['hanging-leg-raise', 'dead-bug', 'crunch'], { reps: [10, 20] }),
  o('hanging-leg-raise', 'Hanging leg raise', 'core', ['buik'], ['onderarmen'], ['lichaamsgewicht', 'rek'],
    ['schouder'], ['lying-leg-raise', 'cable-crunch'], { niveau: G, reps: [8, 15] }),
  o('ab-wheel-rollout', 'Ab wheel rollout', 'core', ['buik'], ['lats'], ['lichaamsgewicht'],
    ['onderrug', 'schouder'], ['plank', 'cable-crunch', 'hollow-hold'], { niveau: G, reps: [6, 15] }),
  o('mountain-climbers', 'Mountain climbers', 'core', ['buik'], ['quadriceps'], ['lichaamsgewicht'],
    ['pols', 'schouder'], ['plank', 'dead-bug'], { reps: [20, 40] }),
  o('pallof-press', 'Pallof press', 'core', ['schuine buikspieren', 'buik'], [], ['kabel'],
    [], ['zijplank', 'russian-twist', 'dead-bug']),
  o('russian-twist', 'Russian twist', 'core', ['schuine buikspieren'], ['buik'], ['dumbbells'],
    ['onderrug'], ['pallof-press', 'bicycle-crunch', 'zijplank'], { reps: [12, 24] }),
];

export const COACH_BY_ID = new Map(COACH_OEFENINGEN.map((c) => [c.id, c]));

// ---------- beschikbaar materiaal ----------

export type MateriaalKeuze = 'volledige gym' | 'kleine gym' | 'thuis met dumbbells' | 'alleen lichaamsgewicht';

export const MATERIAAL_PER_KEUZE: Record<MateriaalKeuze, Materiaal[]> = {
  'volledige gym': ['stang', 'dumbbells', 'machine', 'kabel', 'lichaamsgewicht', 'bank', 'rek'],
  'kleine gym': ['stang', 'dumbbells', 'kabel', 'lichaamsgewicht', 'bank', 'rek'],
  'thuis met dumbbells': ['dumbbells', 'lichaamsgewicht', 'bank'],
  'alleen lichaamsgewicht': ['lichaamsgewicht'],
};

/** Kun je de oefening doen met dit materiaal? Alles wat de oefening nodig heeft moet er zijn. */
export function kanMet(oef: Pick<CoachOefening, 'materiaal'>, beschikbaar: Materiaal[]): boolean {
  return oef.materiaal.every((m) => beschikbaar.includes(m));
}

const NIVEAU_RANG: Record<Niveau, number> = { beginner: 0, gevorderd: 1, ervaren: 2 };

/** Past de oefening bij dit niveau? Een ervaren sporter mag alles, een beginner alleen beginner-oefeningen. */
export function geschiktVoor(oef: Pick<CoachOefening, 'niveau'>, niveau: Niveau): boolean {
  return NIVEAU_RANG[oef.niveau] <= NIVEAU_RANG[niveau];
}

/** Belast de oefening een van deze (geblesseerde) gewrichten? */
export function belast(oef: Pick<CoachOefening, 'gewrichten'>, blessures: Gewricht[]): boolean {
  return oef.gewrichten.some((g) => blessures.includes(g));
}

// ---------- oefeningen van de gebruiker ----------

/** Wat een gebruiker bij een eigen oefening kan invullen. */
export interface EigenCoachInfo {
  patroon?: Patroon;
  materiaal?: Materiaal[];
  gewrichten?: Gewricht[];
  primair?: Spier[];
}

/** Minimale vorm van een oefening in de logger; zo hangt deze module niet van de database af. */
export interface LoggerOefening {
  slug?: string;
  name: string;
  muscle: Muscle | string;
  equipment: Equipment;
  coach?: EigenCoachInfo;
}

const MATERIAAL_VAN: Record<Equipment, Materiaal> = {
  barbell: 'stang',
  dumbbell: 'dumbbells',
  machine: 'machine',
  cable: 'kabel',
  bodyweight: 'lichaamsgewicht',
  kettlebell: 'dumbbells',
  other: 'machine',
};

const SPIER_VAN: Record<Muscle, Spier> = {
  Borst: 'borst',
  Rug: 'bovenrug',
  Schouders: 'zijkant schouder',
  Benen: 'quadriceps',
  Billen: 'billen',
  Armen: 'biceps',
  Core: 'buik',
  'Hele lichaam': 'quadriceps',
};

const PATROON_VAN: Partial<Record<string, Patroon>> = { Core: 'core' };

/**
 * Coach-gegevens voor elke oefening in de logger. Bibliotheekoefeningen komen uit de database;
 * voor eigen oefeningen gebruiken we wat de gebruiker invulde en vullen we de rest aan op basis
 * van spiergroep en materiaal.
 */
export function coachInfo(ex: LoggerOefening): CoachOefening {
  const bekend = ex.slug ? COACH_BY_ID.get(ex.slug) : undefined;
  if (bekend) return bekend;
  const eigen = ex.coach ?? {};
  const materiaal = eigen.materiaal?.length ? eigen.materiaal : [MATERIAAL_VAN[ex.equipment]];
  const patroon = eigen.patroon ?? PATROON_VAN[ex.muscle] ?? 'isolatie';
  const primair = eigen.primair?.length ? eigen.primair : [SPIER_VAN[ex.muscle as Muscle] ?? 'quadriceps'];
  const hoofd = hoofdMateriaal(materiaal);
  const progressie: Progressie = hoofd === 'lichaamsgewicht' ? 'reps' : 'gewicht';
  return {
    id: ex.slug ?? `eigen:${ex.name}`,
    naam: ex.name,
    naamEn: ex.name,
    primair,
    secundair: [],
    patroon,
    materiaal,
    niveau: 'beginner',
    progressie,
    reps: standaardReps(patroon, hoofd, progressie),
    rust: standaardRust(patroon, hoofd),
    stap: stapVoor({ materiaal, primair, patroon }),
    gewrichten: eigen.gewrichten ?? [],
    alternatieven: [],
    tip: '',
  };
}

/**
 * Alternatieven voor een oefening, het best passende eerst: eerst de vaste alternatieven uit de
 * database, daarna andere oefeningen met hetzelfde patroon (en bij isolatie dezelfde spier).
 * Optioneel gefilterd op materiaal, niveau en blessures.
 */
export function alternatievenVoor(
  oef: CoachOefening,
  filter: { materiaal?: Materiaal[]; niveau?: Niveau; blessures?: Gewricht[] } = {},
): CoachOefening[] {
  const ok = (c: CoachOefening) =>
    c.id !== oef.id &&
    (!filter.materiaal || kanMet(c, filter.materiaal)) &&
    (!filter.niveau || geschiktVoor(c, filter.niveau)) &&
    (!filter.blessures || !belast(c, filter.blessures));
  const vast = oef.alternatieven.map((id) => COACH_BY_ID.get(id)).filter((c): c is CoachOefening => !!c && ok(c));
  const zelfdeSpier = (c: CoachOefening) => c.primair[0] === oef.primair[0];
  const rest = COACH_OEFENINGEN.filter(
    (c) => ok(c) && !vast.includes(c) && c.patroon === oef.patroon && (oef.patroon !== 'isolatie' || zelfdeSpier(c)),
  ).sort((a, b) => Number(zelfdeSpier(b)) - Number(zelfdeSpier(a)));
  return [...vast, ...rest];
}

export const PATROON_LABEL: Record<Patroon, string> = {
  squat: 'Squat',
  hinge: 'Heupscharnier',
  'horizontaal duwen': 'Horizontaal duwen',
  'verticaal duwen': 'Verticaal duwen',
  'horizontaal trekken': 'Horizontaal trekken',
  'verticaal trekken': 'Verticaal trekken',
  lunge: 'Lunge',
  isolatie: 'Isolatie',
  core: 'Core',
};
