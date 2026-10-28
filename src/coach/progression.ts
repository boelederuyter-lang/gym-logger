// De progressie-engine van de coach (fase 4).
//
// Na elke training bepaalt de engine per oefening wat je de volgende keer doet: gewicht, reps
// per set en een korte reden in gewone taal. Hij kijkt alleen naar wat je gelogd hebt, dus hij
// werkt meteen op je bestaande trainingen. Geen AI, alleen deze regels:
//
//   1. Dubbele progressie: alle werksets bovenin het repbereik → gewicht + 1 stap.
//      Anders: zelfde gewicht, probeer per set 1 rep meer.
//   2. Een set onder de ondergrens → zelfde gewicht, eerst alle sets binnen het bereik.
//   3. Twee keer op rij vastgezeten → 10% lichter (deload voor die oefening).
//   4. Drie keer vastgezeten na zo'n deload → stel een ander repbereik of een alternatief voor.
//   5. RPE 10 op de eerste set → niet zwaarder. RPE 7 of lager op alle sets → een extra stap.
//   6. Lichaamsgewicht: meer reps; aan de top → zwaardere variant of extra gewicht.
//   7. Herstelweek voor alles: elke 5-6 weken, of als 3+ oefeningen tegelijk achteruitgaan.
//      Dan minder sets met hetzelfde gewicht.
//   8. Wat je zelf invult gaat altijd voor: de engine rekent verder vanaf wat je echt deed.

import { rondAf } from './generator';

/** Eén gelogde werkset (warming-up telt niet mee). */
export interface LogSet {
  gewicht: number | null;
  reps: number | null;
  rpe?: number;
}

/** Eén training met deze oefening. */
export interface Sessie {
  datum: number;
  sets: LogSet[];
  /** Het gewicht dat de coach die keer voorstelde (om te zien of je het zelf aanpaste). */
  advies?: number | null;
  /** Deze training was een herstelweek. */
  herstel?: boolean;
}

/** Wat de engine over de oefening moet weten. */
export interface OefInfo {
  naam: string;
  reps: [number, number];
  sets: number;
  stap: number;
  progressie: 'gewicht' | 'reps';
  eenheid?: 'sec' | 'reps';
  startgewicht?: number;
  /** Naam van een zwaardere variant, voor lichaamsgewicht-oefeningen. */
  zwaarder?: string;
  /** Een alternatief om naar te wisselen als je blijft vastzitten. */
  alternatief?: string;
  /** Is de stang/machine niet lichter te maken dan dit (bijv. 20 kg lege stang)? */
  minimum?: number;
  /** Dumbbells: gewichten gelden per hand. */
  perHand?: boolean;
}

export type Soort = 'start' | 'zwaarder' | 'meer reps' | 'herhalen' | 'deload' | 'wissel' | 'variant' | 'herstel';

export interface Advies {
  soort: Soort;
  gewicht: number | null;
  /** Doel-reps per set (lengte = aantal sets). */
  reps: number[];
  reden: string;
}

// ---------- hulpjes ----------

const kg = (n: number) => `${String(Math.round(n * 100) / 100).replace('.', ',')} kg`;

/** "3×10" als alle sets gelijk zijn, anders "10, 9 en 8". */
export function setsTekst(reps: number[], eenheid: 'sec' | 'reps' = 'reps'): string {
  const u = eenheid === 'sec' ? ' sec' : '';
  if (reps.length && reps.every((r) => r === reps[0])) return `${reps.length}×${reps[0]}${u}`;
  if (reps.length < 2) return `${reps.join('')}${u}`;
  return `${reps.slice(0, -1).join(', ')} en ${reps.at(-1)}${u}`;
}

const geldig = (s: LogSet) => s.reps != null && s.reps > 0;

/** Het werkgewicht van een sessie: het gewicht van de eerste werkset. */
export function werkgewicht(s: Sessie): number | null {
  return s.sets.find(geldig)?.gewicht ?? null;
}

const totaalReps = (s: Sessie) => s.sets.reduce((n, x) => n + (x.reps ?? 0), 0);
const zelfde = (a: number | null, b: number | null) => (a ?? 0) === (b ?? 0) || Math.abs((a ?? 0) - (b ?? 0)) < 0.01;

/** Beste geschatte 1RM (Epley) in een sessie; gebruikt om achteruitgang te herkennen. */
export function besteE1rm(s: Sessie): number {
  return Math.max(0, ...s.sets.filter(geldig).map((x) => (x.gewicht ?? 0) * (1 + (x.reps ?? 0) / 30)));
}

/**
 * Hoe vaak je op rij bent vastgelopen: sessies op hetzelfde gewicht waarin je niet méér reps
 * haalde dan de keer ervoor. Historie: nieuwste eerst. Herstelweken tellen niet mee.
 */
export function vastgelopen(historie: Sessie[]): number {
  const h = historie.filter((s) => !s.herstel && s.sets.some(geldig));
  let n = 0;
  for (let i = 0; i + 1 < h.length; i++) {
    if (!zelfde(werkgewicht(h[i]), werkgewicht(h[i + 1]))) break;
    if (totaalReps(h[i]) > totaalReps(h[i + 1])) break;
    n++;
  }
  return n;
}

/** Was er eerder een deload: een sessie waarin het gewicht minstens 5% omlaag ging? */
export function hadDeload(historie: Sessie[]): boolean {
  const h = historie.filter((s) => !s.herstel && s.sets.some(geldig));
  for (let i = 0; i + 1 < h.length && i < 12; i++) {
    const nu = werkgewicht(h[i]) ?? 0;
    const was = werkgewicht(h[i + 1]) ?? 0;
    if (was > 0 && nu <= was * 0.95) return true;
  }
  return false;
}

// ---------- het advies ----------

/** Wat je de volgende keer doet voor één oefening. Historie: nieuwste training eerst. */
export function adviseer(oef: OefInfo, historie: Sessie[]): Advies {
  const [lo, hi] = oef.reps;
  const sets = Math.max(1, oef.sets);
  const vul = (r: number) => Array.from({ length: sets }, () => r);
  const sec = oef.eenheid === 'sec';
  const laatste = historie.find((s) => s.sets.some(geldig));

  // Eerste keer: startgewicht uit je profiel, of uitleg hoe je er een kiest.
  if (!laatste) {
    if (oef.progressie === 'reps')
      return {
        soort: 'start',
        gewicht: null,
        reps: vul(lo),
        reden: sec
          ? `Eerste keer: houd ${lo} sec vol. Lukt ${hi} sec? Dan maken we het zwaarder.`
          : `Eerste keer: doe ${lo} tot ${hi} nette reps per set.`,
      };
    return oef.startgewicht != null
      ? {
          soort: 'start',
          gewicht: oef.startgewicht,
          reps: vul(lo),
          reden: `Startgewicht ${kg(oef.startgewicht)}${oef.perHand ? ' per hand' : ''}, berekend uit je kracht. Haal je ${hi} reps makkelijk? Dan gaat het volgende keer omhoog.`,
        }
      : {
          soort: 'start',
          gewicht: null,
          reps: vul(lo),
          reden: `Eerste keer: kies een gewicht waarmee je ${hi} reps net haalt.`,
        };
  }

  const werk = laatste.sets.filter(geldig);
  const reps = werk.map((s) => s.reps!);
  const w = werkgewicht(laatste);
  const allesTop = reps.length >= sets && reps.every((r) => r >= hi);
  const meerReps = (stap: number) =>
    Array.from({ length: sets }, (_, i) => Math.min(hi, Math.max(lo, (reps[i] ?? reps.at(-1) ?? lo) + stap)));

  // Lichaamsgewicht (of op tijd): reps omhoog; aan de top een zwaardere variant.
  if (oef.progressie === 'reps') {
    if (allesTop)
      return {
        soort: 'variant',
        gewicht: w,
        reps: vul(hi),
        reden: `Je haalt ${setsTekst(reps.slice(0, sets), oef.eenheid)}. Tijd voor ${
          oef.zwaarder ? `een zwaardere variant, zoals ${oef.zwaarder},` : 'een zwaardere variant'
        } of extra gewicht.`,
      };
    const plus = sec ? 5 : 1;
    return {
      soort: 'meer reps',
      gewicht: w,
      reps: meerReps(plus),
      reden: `Vorige keer ${setsTekst(reps, oef.eenheid)}. Probeer er per set ${sec ? '5 sec' : '1'} bij.`,
    };
  }

  // Wat je zelf koos gaat voor: we rekenen verder vanaf je echte gewicht.
  const zelf =
    laatste.advies != null && w != null && !zelfde(w, laatste.advies)
      ? `Je koos zelf ${kg(w)}; daar bouw ik op verder. `
      : '';
  const gewicht = w ?? oef.startgewicht ?? null;
  if (gewicht == null)
    return {
      soort: 'herhalen',
      gewicht: null,
      reps: vul(lo),
      reden: `Vul het gewicht in dat je gebruikt, dan kan ik je volgen.`,
    };

  // Vastgelopen: na een eerdere deload een ander plan, anders 10% lichter.
  const vast = vastgelopen(historie);
  if (vast >= 3 && hadDeload(historie))
    return {
      soort: 'wissel',
      gewicht,
      reps: meerReps(0),
      reden: `Je zit al ${vast} keer vast op ${kg(gewicht)}, ook na een lichtere periode. Probeer een ander repbereik (bijv. ${Math.max(3, lo - 2)}–${Math.max(5, hi - 2)}) of wissel naar ${oef.alternatief ?? 'een alternatief'}.`,
    };
  if (vast >= 2) {
    // 10% eraf, omlaag afgerond op de stap, en altijd minstens één stap lichter.
    const nieuw = Math.max(oef.minimum ?? 0, Math.min(rondAf(gewicht * 0.9, oef.stap), gewicht - oef.stap));
    return {
      soort: 'deload',
      gewicht: nieuw,
      reps: vul(hi),
      reden: `${vast} keer op rij vastgezeten op ${kg(gewicht)}. Even 10% lichter (${kg(nieuw)}), dan kom je sterker terug.`,
    };
  }

  // RPE 10 op de eerste set: al maximaal, dus niet zwaarder.
  if (werk[0]?.rpe != null && werk[0].rpe >= 10)
    return {
      soort: 'herhalen',
      gewicht,
      reps: meerReps(0),
      reden: `${zelf}Je eerste set was RPE 10, dus maximaal. Zelfde gewicht; probeer het met wat meer ruimte te halen.`,
    };

  // Een set onder de ondergrens: eerst alles binnen het bereik.
  if (reps.some((r) => r < lo))
    return {
      soort: 'herhalen',
      gewicht,
      reps: vul(lo),
      reden: `${zelf}Een set bleef onder de ${lo} reps. Zelfde gewicht tot je alle sets binnen ${lo}–${hi} haalt.`,
    };

  const licht = werk.length > 0 && werk.every((s) => s.rpe != null && s.rpe <= 7);
  if (allesTop) {
    const stap = oef.stap * (licht ? 2 : 1);
    return {
      soort: 'zwaarder',
      gewicht: Math.round((gewicht + stap) * 100) / 100,
      reps: vul(lo),
      reden: `${zelf}Vorige keer ${setsTekst(reps.slice(0, sets))} gehaald, dus +${kg(stap)}.${
        licht ? ' Het voelde licht (RPE 7 of minder), daarom een extra stap.' : ''
      }`,
    };
  }
  if (licht)
    return {
      soort: 'zwaarder',
      gewicht: Math.round((gewicht + oef.stap) * 100) / 100,
      reps: vul(lo),
      reden: `${zelf}Alle sets voelden licht (RPE 7 of minder), dus +${kg(oef.stap)}.`,
    };

  return {
    soort: 'meer reps',
    gewicht,
    reps: meerReps(1),
    reden: `${zelf}Vorige keer ${setsTekst(reps)} op ${kg(gewicht)}. Zelfde gewicht, probeer er per set 1 bij.`,
  };
}

// ---------- herstelweek voor alles ----------

export const WEKEN_TOT_HERSTEL = 5;

/**
 * Moet deze week een herstelweek zijn? Na 5 trainingsweken sinds de vorige herstelweek (dus de
 * 6e week), of als bij 3 of meer oefeningen je laatste training slechter ging dan de keer ervoor.
 */
export function herstelweek(input: { wekenGetraind: number; dalers: number }): { actief: boolean; reden?: string } {
  if (input.wekenGetraind >= WEKEN_TOT_HERSTEL)
    return {
      actief: true,
      reden: `Je traint al ${input.wekenGetraind} weken op rij. Deze week is een herstelweek: minder sets, zelfde gewicht. Daarna kun je weer verder bouwen.`,
    };
  if (input.dalers >= 3)
    return {
      actief: true,
      reden: `Bij ${input.dalers} oefeningen ging het vorige keer minder goed. Dat is een teken van vermoeidheid. Deze week: minder sets, zelfde gewicht.`,
    };
  return { actief: false };
}

/** Gaat een oefening achteruit? Beste 1RM van de laatste training minstens 3% lager dan de keer ervoor. */
export function gaatAchteruit(historie: Sessie[]): boolean {
  const h = historie.filter((s) => !s.herstel && s.sets.some(geldig));
  if (h.length < 2) return false;
  const nu = besteE1rm(h[0]);
  const was = besteE1rm(h[1]);
  return was > 0 && nu < was * 0.97;
}

/** Advies in een herstelweek: minder sets (ongeveer 60%), zelfde gewicht en reps als vorige keer. */
export function herstelAdvies(oef: OefInfo, historie: Sessie[]): Advies {
  const normaal = adviseer(oef, historie);
  const laatste = historie.find((s) => s.sets.some(geldig));
  const sets = Math.max(1, Math.round(oef.sets * 0.6));
  const w = laatste ? werkgewicht(laatste) : normaal.gewicht;
  const reps = laatste?.sets.filter(geldig).map((s) => s.reps!) ?? normaal.reps;
  return {
    soort: 'herstel',
    gewicht: oef.progressie === 'reps' ? w : (w ?? normaal.gewicht),
    reps: Array.from({ length: sets }, (_, i) => Math.min(oef.reps[1], reps[i] ?? reps.at(-1) ?? oef.reps[0])),
    reden: `Herstelweek: ${sets} in plaats van ${oef.sets} sets, zelfde gewicht. Rustig aan, volgende week weer vol.`,
  };
}

/** Maandag 00:00 (lokale tijd) van de week waarin `time` valt. */
export function maandagVan(time: number): number {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/**
 * Hoeveel weken je op rij hebt getraind, terugtellend vanaf vorige week. Een week zonder training
 * of een herstelweek breekt de reeks (een vakantie telt dus als rust).
 */
export function wekenOpRij(trainingen: number[], herstelWeken: number[], nu: number): number {
  const getraind = new Set(trainingen.map(maandagVan));
  const herstel = new Set(herstelWeken.map(maandagVan));
  const week = new Date(maandagVan(nu));
  let n = 0;
  while (n < 52) {
    week.setDate(week.getDate() - 7);
    const k = week.getTime();
    if (herstel.has(k) || !getraind.has(k)) break;
    n++;
  }
  return n;
}
