// Het profiel uit de vragenlijst (fase 2).
//
// Alleen gegevens en rekenregels, geen schermcode. Het scherm (screens/Onboarding.tsx) en de
// schemagenerator gebruiken deze functies.

import {
  GEWRICHTEN,
  MATERIAAL_PER_KEUZE,
  MATERIALEN,
  NIVEAUS,
  SPIERGROEPEN,
  type Gewricht,
  type Materiaal,
  type MateriaalKeuze,
  type Niveau,
  type Spiergroep,
} from './exercises';

export type Doel = 'spiermassa' | 'sterker' | 'vet verliezen' | 'fitheid';
export const DOELEN: Doel[] = ['spiermassa', 'sterker', 'vet verliezen', 'fitheid'];

export const TIJDEN = [30, 45, 60, 75, 90] as const;
export type Tijd = (typeof TIJDEN)[number];

/** De drie basisoefeningen waarvan je optioneel je huidige kracht invult. */
export type Basislift = 'squat' | 'bankdrukken' | 'deadlift';
export const BASISLIFTS: Basislift[] = ['squat', 'bankdrukken', 'deadlift'];

export interface Krachtmeting {
  kg: number;
  reps: number;
}

export interface Profiel {
  versie: 1;
  doel: Doel;
  niveau: Niveau;
  /** Trainingsdagen: 0 = maandag ... 6 = zondag. Het aantal (2 t/m 6) is de lengte. */
  dagen: number[];
  tijd: Tijd;
  /** De gekozen snelkeuze, of 'zelf' als je zelf hebt aangevinkt. */
  materiaalKeuze: MateriaalKeuze | 'zelf';
  materiaal: Materiaal[];
  prioriteit: Spiergroep[]; // maximaal 2
  blessures: Gewricht[];
  kracht: Partial<Record<Basislift, Krachtmeting>>;
  lichaamsgewicht?: number;
}

export const MAX_PRIORITEIT = 2;
export const MIN_DAGEN = 2;
export const MAX_DAGEN = 6;

export const DAG_NAMEN = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
export const DAG_KORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

/** Een logische spreiding over de week, met rustdagen ertussen waar dat kan. */
export function standaardDagen(aantal: number): number[] {
  const n = Math.min(MAX_DAGEN, Math.max(MIN_DAGEN, Math.round(aantal)));
  const spreiding: Record<number, number[]> = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
  };
  return spreiding[n];
}

export function standaardProfiel(): Profiel {
  return {
    versie: 1,
    doel: 'spiermassa',
    niveau: 'beginner',
    dagen: standaardDagen(3),
    tijd: 60,
    materiaalKeuze: 'volledige gym',
    materiaal: [...MATERIAAL_PER_KEUZE['volledige gym']],
    prioriteit: [],
    blessures: [],
    kracht: {},
  };
}

/**
 * Leest een getal zoals mensen het typen: "82,5" en "82.5" zijn allebei goed, spaties en "kg"
 * mogen erbij. Geeft undefined bij lege of ongeldige invoer of een negatief getal.
 */
export function leesGetal(tekst: string | number | undefined | null): number | undefined {
  if (tekst == null) return undefined;
  if (typeof tekst === 'number') return Number.isFinite(tekst) && tekst >= 0 ? tekst : undefined;
  const schoon = tekst.trim().toLowerCase().replace(/kg$/, '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(schoon)) return undefined;
  return Number(schoon);
}

/** Zet een dag aan of uit; houdt de lijst gesorteerd en nooit meer dan het maximum. */
export function wisselDag(dagen: number[], dag: number): number[] {
  if (dagen.includes(dag)) return dagen.filter((d) => d !== dag);
  if (dagen.length >= MAX_DAGEN) return dagen;
  return [...dagen, dag].sort((a, b) => a - b);
}

/** Zet een spiergroep aan of uit als prioriteit; bij een derde valt de oudste keuze weg. */
export function wisselPrioriteit(prioriteit: Spiergroep[], groep: Spiergroep): Spiergroep[] {
  if (prioriteit.includes(groep)) return prioriteit.filter((g) => g !== groep);
  return [...prioriteit, groep].slice(-MAX_PRIORITEIT);
}

/** Welk materiaal hoort bij een keuze; bij 'zelf' blijft je eigen selectie staan. */
export function kiesMateriaal(profiel: Profiel, keuze: MateriaalKeuze | 'zelf'): Profiel {
  if (keuze === 'zelf') return { ...profiel, materiaalKeuze: 'zelf' };
  return { ...profiel, materiaalKeuze: keuze, materiaal: [...MATERIAAL_PER_KEUZE[keuze]] };
}

/** Zet één stuk materiaal aan of uit. Lichaamsgewicht heb je altijd. */
export function wisselMateriaal(profiel: Profiel, m: Materiaal): Profiel {
  if (m === 'lichaamsgewicht') return profiel;
  const materiaal = profiel.materiaal.includes(m)
    ? profiel.materiaal.filter((x) => x !== m)
    : MATERIALEN.filter((x) => x === m || profiel.materiaal.includes(x));
  return { ...profiel, materiaalKeuze: 'zelf', materiaal };
}

/** Is het profiel compleet genoeg om een schema te maken? Geeft de reden als het niet zo is. */
export function controleer(p: Profiel): string | null {
  if (p.dagen.length < MIN_DAGEN) return `Kies minstens ${MIN_DAGEN} dagen.`;
  if (p.dagen.length > MAX_DAGEN) return `Kies hoogstens ${MAX_DAGEN} dagen.`;
  if (!p.materiaal.includes('lichaamsgewicht')) return 'Lichaamsgewicht hoort er altijd bij.';
  if (p.prioriteit.length > MAX_PRIORITEIT) return `Kies hoogstens ${MAX_PRIORITEIT} spiergroepen.`;
  return null;
}

/**
 * Maakt van opgeslagen (of geïmporteerde) gegevens een geldig profiel, of null als het niet te
 * redden is. Onbekende waarden vallen terug op de standaard, zodat een oud of half bestand niet
 * de hele app breekt.
 */
export function normaliseerProfiel(raw: unknown): Profiel | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const basis = standaardProfiel();
  const doel = DOELEN.includes(r.doel as Doel) ? (r.doel as Doel) : null;
  const niveau = NIVEAUS.includes(r.niveau as Niveau) ? (r.niveau as Niveau) : null;
  if (!doel || !niveau) return null;
  const dagen = Array.isArray(r.dagen)
    ? [...new Set(r.dagen.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
    : [];
  const tijd = TIJDEN.includes(r.tijd as Tijd) ? (r.tijd as Tijd) : basis.tijd;
  const keuzes = [...Object.keys(MATERIAAL_PER_KEUZE), 'zelf'];
  const materiaalKeuze = keuzes.includes(r.materiaalKeuze as string)
    ? (r.materiaalKeuze as Profiel['materiaalKeuze'])
    : basis.materiaalKeuze;
  const materiaal = Array.isArray(r.materiaal)
    ? MATERIALEN.filter((m) => m === 'lichaamsgewicht' || (r.materiaal as unknown[]).includes(m))
    : basis.materiaal;
  const prioriteit = Array.isArray(r.prioriteit)
    ? SPIERGROEPEN.filter((g) => (r.prioriteit as unknown[]).includes(g)).slice(0, MAX_PRIORITEIT)
    : [];
  const blessures = Array.isArray(r.blessures) ? GEWRICHTEN.filter((g) => (r.blessures as unknown[]).includes(g)) : [];
  const kracht: Profiel['kracht'] = {};
  const rk = (r.kracht ?? {}) as Record<string, { kg?: unknown; reps?: unknown }>;
  for (const lift of BASISLIFTS) {
    const kg = leesGetal(rk[lift]?.kg as number);
    const reps = leesGetal(rk[lift]?.reps as number);
    if (kg && reps && Number.isInteger(reps)) kracht[lift] = { kg, reps };
  }
  const lichaamsgewicht = leesGetal(r.lichaamsgewicht as number) || undefined;
  const p: Profiel = {
    versie: 1,
    doel,
    niveau,
    dagen: dagen.length >= MIN_DAGEN && dagen.length <= MAX_DAGEN ? dagen : standaardDagen(dagen.length || 3),
    tijd,
    materiaalKeuze,
    materiaal,
    prioriteit,
    blessures,
    kracht,
    lichaamsgewicht,
  };
  return p;
}

// ---------- overstap vanaf het oude schemaformulier ----------

/** Het oude formulier (plan/generator.ts) zoals het in localStorage staat. */
export interface OudeInvoer {
  doel: 'kracht' | 'spiermassa' | 'fitheid' | 'vetverlies';
  niveau: 'beginner' | 'gevorderd';
  dagen: number;
  tijd: number;
  apparatuur: 'gym' | 'dumbbells' | 'thuis';
}

const OUD_DOEL: Record<OudeInvoer['doel'], Doel> = {
  kracht: 'sterker',
  spiermassa: 'spiermassa',
  fitheid: 'fitheid',
  vetverlies: 'vet verliezen',
};

const OUD_MATERIAAL: Record<OudeInvoer['apparatuur'], MateriaalKeuze> = {
  gym: 'volledige gym',
  dumbbells: 'thuis met dumbbells',
  thuis: 'alleen lichaamsgewicht',
};

/** Vult een nieuw profiel met wat iemand al in het oude formulier had ingevuld. */
export function vanOudeInvoer(oud: OudeInvoer): Profiel {
  const keuze = OUD_MATERIAAL[oud.apparatuur];
  const tijd = (TIJDEN as readonly number[]).includes(oud.tijd) ? (oud.tijd as Tijd) : 60;
  return {
    ...standaardProfiel(),
    doel: OUD_DOEL[oud.doel],
    niveau: oud.niveau,
    dagen: standaardDagen(oud.dagen),
    tijd,
    materiaalKeuze: keuze,
    materiaal: [...MATERIAAL_PER_KEUZE[keuze]],
  };
}

// ---------- teksten ----------

export const DOEL_TEKST: Record<Doel, [string, string]> = {
  spiermassa: ['Spiermassa', 'Groter en voller worden'],
  sterker: ['Sterker worden', 'Zwaarder tillen op de basisoefeningen'],
  'vet verliezen': ['Vet verliezen', 'Strakker worden en spieren behouden'],
  fitheid: ['Fitheid', 'Je fit en energiek voelen'],
};

export const NIVEAU_TEKST: Record<Niveau, [string, string]> = {
  beginner: ['Beginner', 'Minder dan 1 jaar'],
  gevorderd: ['Gevorderd', '1 tot 3 jaar'],
  ervaren: ['Ervaren', 'Meer dan 3 jaar'],
};

export const MATERIAAL_TEKST: Record<MateriaalKeuze, [string, string]> = {
  'volledige gym': ['Volledige gym', 'Stangen, machines, kabels'],
  'kleine gym': ['Kleine gym', 'Stang en dumbbells, weinig machines'],
  'thuis met dumbbells': ['Thuis met dumbbells', 'Dumbbells en een bankje'],
  'alleen lichaamsgewicht': ['Alleen lichaamsgewicht', 'Geen spullen nodig'],
};

export const LIFT_NAAM: Record<Basislift, string> = {
  squat: 'Squat',
  bankdrukken: 'Bankdrukken',
  deadlift: 'Deadlift',
};

const hoofdletter = (s: string) => s[0].toUpperCase() + s.slice(1);
const lijst = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} en ${xs.at(-1)}`);
const kg = (n: number) => String(n).replace('.', ',');

/** De regels van de samenvatting, in volgorde van de vragen. `stap` is de vraag die je aanpast. */
export function samenvatting(p: Profiel): { label: string; waarde: string; stap: Stap }[] {
  const materiaal =
    p.materiaalKeuze === 'zelf' ? lijst(p.materiaal.map((m) => m)) : MATERIAAL_TEKST[p.materiaalKeuze][0];
  const kracht = BASISLIFTS.filter((l) => p.kracht[l]).map(
    (l) => `${LIFT_NAAM[l]} ${kg(p.kracht[l]!.kg)} kg × ${p.kracht[l]!.reps}`,
  );
  return [
    { label: 'Doel', waarde: DOEL_TEKST[p.doel][0], stap: 'doel' },
    {
      label: 'Ervaring',
      waarde: `${NIVEAU_TEKST[p.niveau][0]} (${NIVEAU_TEKST[p.niveau][1].toLowerCase()})`,
      stap: 'niveau',
    },
    {
      label: 'Dagen',
      waarde: `${p.dagen.length}× per week: ${lijst(p.dagen.map((d) => DAG_KORT[d]))}`,
      stap: 'dagen',
    },
    { label: 'Tijd', waarde: `${p.tijd} minuten per training`, stap: 'tijd' },
    { label: 'Materiaal', waarde: hoofdletter(materiaal), stap: 'materiaal' },
    {
      label: 'Prioriteit',
      waarde: p.prioriteit.length ? hoofdletter(lijst(p.prioriteit)) : 'Geen, alles gelijk',
      stap: 'prioriteit',
    },
    {
      label: 'Blessures',
      waarde: p.blessures.length ? hoofdletter(lijst(p.blessures)) : 'Geen',
      stap: 'blessures',
    },
    {
      label: 'Kracht',
      waarde:
        (kracht.length ? kracht.join(', ') : 'Niet ingevuld') +
        (p.lichaamsgewicht ? ` · ${kg(p.lichaamsgewicht)} kg lichaamsgewicht` : ''),
      stap: 'kracht',
    },
  ];
}

// ---------- stappen van de vragenlijst ----------

export type Stap =
  | 'doel'
  | 'niveau'
  | 'dagen'
  | 'tijd'
  | 'materiaal'
  | 'prioriteit'
  | 'blessures'
  | 'kracht'
  | 'samenvatting';

export const STAPPEN: Stap[] = [
  'doel',
  'niveau',
  'dagen',
  'tijd',
  'materiaal',
  'prioriteit',
  'blessures',
  'kracht',
  'samenvatting',
];

/** Stappen die je mag overslaan (de rest heeft altijd een geldige keuze). */
export const OPTIONEEL: Stap[] = ['prioriteit', 'blessures', 'kracht'];

/** Voortgang van 0 tot 1 voor de balk bovenin. */
export function voortgang(stap: Stap): number {
  return (STAPPEN.indexOf(stap) + 1) / STAPPEN.length;
}

/**
 * Tijdelijk (tot de nieuwe generator er is): vertaalt het profiel naar het oude schemaformulier,
 * zodat "Maak mijn schema" nu al werkt. Waarden die het oude formulier niet kent worden afgerond
 * naar de dichtstbijzijnde die het wel kent.
 */
export function naarOudeInvoer(p: Profiel): OudeInvoer {
  const doel = (Object.keys(OUD_DOEL) as OudeInvoer['doel'][]).find((k) => OUD_DOEL[k] === p.doel)!;
  const apparatuur: OudeInvoer['apparatuur'] =
    p.materiaal.includes('machine') || p.materiaal.includes('stang') || p.materiaal.includes('kabel')
      ? 'gym'
      : p.materiaal.includes('dumbbells')
        ? 'dumbbells'
        : 'thuis';
  return {
    doel,
    niveau: p.niveau === 'beginner' ? 'beginner' : 'gevorderd',
    dagen: Math.min(5, p.dagen.length),
    tijd: Math.min(75, p.tijd),
    apparatuur,
  };
}
