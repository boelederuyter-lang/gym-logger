// Oefeningendatabase.
//
// Velden per oefening:
//   id           unieke sleutel
//   naam         weergavenaam
//   spiergroep   belangrijkste spiergroep
//   patroon      bewegingspatroon; de generator vult hiermee de "slots" van een trainingsdag
//   apparatuur   wat je nodig hebt (zie APPARATUUR hieronder)
//   type         'compound' (meerdere gewrichten) of 'isolatie'
//   deel         'boven', 'onder' of 'core' (bepaalt het gewichtsadvies in week 3)
//   tip          korte uitvoeringstip
//   niveau       optioneel: 'beginner' = alleen voor beginners, 'gevorderd' = alleen voor gevorderden
//   basis        optioneel: standaardoefening die vaker gekozen wordt
//   eenheid      optioneel: 'sec' voor oefeningen die je op tijd doet (plank e.d.)

import { LIBRARY, type Equipment, type Muscle } from '../library/exercises';

export type Apparatuur = 'barbell' | 'machine' | 'kabel' | 'optrekstang' | 'bank' | 'dumbbells' | 'lichaamsgewicht';
export type Patroon =
  | 'squat' | 'lunge' | 'hinge' | 'heup' | 'hpush' | 'vpush' | 'hpull' | 'vpull' | 'borst-iso'
  | 'schouder-iso' | 'achterschouder' | 'biceps' | 'triceps' | 'quad-iso' | 'ham-iso' | 'kuiten' | 'core';
export type ApparatuurKeuze = 'gym' | 'dumbbells' | 'thuis';

export interface PlanOefening {
  id: string;
  naam: string;
  spiergroep: string;
  patroon: Patroon;
  apparatuur: Apparatuur;
  type: 'compound' | 'isolatie';
  deel: 'boven' | 'onder' | 'core';
  tip: string;
  niveau?: 'beginner' | 'gevorderd';
  basis?: boolean;
  eenheid?: 'sec';
}

export interface CardioOptie {
  id: string;
  naam: string;
  apparatuur: Apparatuur;
  soorten: ('rustig' | 'interval')[];
  niveau?: 'beginner' | 'gevorderd';
  tip: string;
}

export const APPARATUUR: Record<Apparatuur, string> = {
  barbell: 'Barbell',
  machine: 'Machine',
  kabel: 'Kabel',
  optrekstang: 'Optrekstang',
  bank: 'Dumbbells + bank',
  dumbbells: 'Dumbbells',
  lichaamsgewicht: 'Lichaamsgewicht',
};

/** Welke apparatuur bij elke keuze in het formulier beschikbaar is. */
export const BESCHIKBAAR: Record<ApparatuurKeuze, Apparatuur[]> = {
  gym: ['barbell', 'machine', 'kabel', 'optrekstang', 'bank', 'dumbbells', 'lichaamsgewicht'],
  dumbbells: ['dumbbells', 'lichaamsgewicht'],
  thuis: ['lichaamsgewicht'],
};

const DATABASE: PlanOefening[] = [
  // ---------- Squat (knie-dominant) ----------
  { id: 'back-squat', naam: 'Back squat', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'barbell', type: 'compound', deel: 'onder', basis: true,
    tip: 'Stang op je bovenrug, voeten schouderbreed. Zak tot je heupen onder knieniveau zijn en houd je borst omhoog.' },
  { id: 'front-squat', naam: 'Front squat', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'barbell', type: 'compound', deel: 'onder', niveau: 'gevorderd',
    tip: 'Stang op je voorste schouders, ellebogen hoog. Blijf rechtop en zak diep tussen je knieën.' },
  { id: 'leg-press', naam: 'Leg press', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'machine', type: 'compound', deel: 'onder', basis: true,
    tip: 'Voeten heupbreed midden op het platform. Zak tot ~90° in de knie en strek niet helemaal op slot.' },
  { id: 'hack-squat', naam: 'Hack squat', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'machine', type: 'compound', deel: 'onder',
    tip: 'Rug plat tegen het kussen, knieën in lijn met je tenen. Gecontroleerd zakken, krachtig omhoog.' },
  { id: 'goblet-squat', naam: 'Goblet squat', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'dumbbells', type: 'compound', deel: 'onder', basis: true,
    tip: 'Houd één dumbbell rechtop tegen je borst. Zak diep met je ellebogen tussen je knieën.' },
  { id: 'db-squat', naam: 'Dumbbell squat', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'dumbbells', type: 'compound', deel: 'onder',
    tip: 'Dumbbells langs je zij, armen ontspannen. Hielen aan de grond en knieën naar buiten duwen.' },
  { id: 'bw-squat', naam: 'Squat (lichaamsgewicht)', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder', basis: true,
    tip: 'Armen naar voren voor balans. Zak zo diep als je met een rechte rug kunt en duw via je hielen omhoog.' },
  { id: 'tempo-squat', naam: 'Tempo squat (3 sec omlaag)', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder',
    tip: 'Tel 3 seconden tijdens het zakken, pauzeer 1 seconde onderin en kom explosief omhoog.' },
  { id: 'jump-squat', naam: 'Jump squat', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder',
    tip: 'Zak tot halve squat en spring explosief omhoog. Land zacht op je voorvoeten en ga direct door.' },
  { id: 'box-pistol', naam: 'Pistol squat naar stoel', spiergroep: 'Benen (quadriceps)', patroon: 'squat', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder', niveau: 'gevorderd',
    tip: 'Op één been, ander been gestrekt naar voren. Zak gecontroleerd tot je de stoel raakt en kom op één been omhoog.' },

  // ---------- Lunge (unilateraal been) ----------
  { id: 'bulgarian-db', naam: 'Bulgarian split squat (dumbbells)', spiergroep: 'Benen (quadriceps/billen)', patroon: 'lunge', apparatuur: 'dumbbells', type: 'compound', deel: 'onder', basis: true,
    tip: 'Achterste voet op een bank of stoel. Zak recht naar beneden tot je achterste knie bijna de grond raakt.' },
  { id: 'walking-lunge-db', naam: 'Walking lunge (dumbbells)', spiergroep: 'Benen (quadriceps/billen)', patroon: 'lunge', apparatuur: 'dumbbells', type: 'compound', deel: 'onder',
    tip: 'Grote stap vooruit, beide knieën ~90°. Duw af via je voorste hiel en stap door met het andere been.' },
  { id: 'reverse-lunge-db', naam: 'Reverse lunge (dumbbells)', spiergroep: 'Benen (quadriceps/billen)', patroon: 'lunge', apparatuur: 'dumbbells', type: 'compound', deel: 'onder',
    tip: 'Stap achteruit en zak tot je achterste knie net boven de grond is. Gewicht op je voorste been.' },
  { id: 'step-up-db', naam: 'Step-up (dumbbells)', spiergroep: 'Benen (quadriceps/billen)', patroon: 'lunge', apparatuur: 'dumbbells', type: 'compound', deel: 'onder',
    tip: 'Stap op een stevige verhoging en duw jezelf omhoog met je bovenste been, niet afzetten met het onderste.' },
  { id: 'reverse-lunge-bw', naam: 'Reverse lunge (lichaamsgewicht)', spiergroep: 'Benen (quadriceps/billen)', patroon: 'lunge', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder', basis: true,
    tip: 'Stap ver genoeg achteruit zodat je voorste knie boven je enkel blijft. Romp rechtop.' },
  { id: 'bulgarian-bw', naam: 'Bulgarian split squat (lichaamsgewicht)', spiergroep: 'Benen (quadriceps/billen)', patroon: 'lunge', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder',
    tip: 'Achterste voet op een stoel of bank. Zak langzaam en houd je voorste knie stabiel boven je voet.' },
  { id: 'step-up-bw', naam: 'Step-up op stoel', spiergroep: 'Benen (quadriceps/billen)', patroon: 'lunge', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder',
    tip: 'Gebruik een stevige stoel of traptrede. Duw jezelf volledig omhoog en zak langzaam terug.' },
  { id: 'jump-lunge', naam: 'Jumping lunge', spiergroep: 'Benen (quadriceps/billen)', patroon: 'lunge', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder', niveau: 'gevorderd',
    tip: 'Vanuit een lunge explosief omhoog springen en in de lucht van been wisselen. Zacht landen.' },

  // ---------- Hinge (heup-dominant) ----------
  { id: 'deadlift', naam: 'Deadlift', spiergroep: 'Hamstrings/onderrug', patroon: 'hinge', apparatuur: 'barbell', type: 'compound', deel: 'onder', basis: true,
    tip: 'Stang boven je middenvoet, rug neutraal. Duw de vloer weg en houd de stang dicht langs je benen.' },
  { id: 'rdl', naam: 'Romanian deadlift', spiergroep: 'Hamstrings', patroon: 'hinge', apparatuur: 'barbell', type: 'compound', deel: 'onder', basis: true,
    tip: 'Lichte buiging in de knie, heupen naar achteren duwen tot je rek in je hamstrings voelt. Rug blijft recht.' },
  { id: 'good-morning', naam: 'Good morning', spiergroep: 'Hamstrings/onderrug', patroon: 'hinge', apparatuur: 'barbell', type: 'compound', deel: 'onder', niveau: 'gevorderd',
    tip: 'Stang op je bovenrug, knieën licht gebogen. Buig vanuit je heupen tot je romp bijna horizontaal is.' },
  { id: 'back-extension', naam: 'Back extension', spiergroep: 'Onderrug/billen', patroon: 'hinge', apparatuur: 'machine', type: 'isolatie', deel: 'onder',
    tip: 'Buig vanuit je heupen en kom omhoog tot je lichaam een rechte lijn vormt. Niet overstrekken.' },
  { id: 'db-rdl', naam: 'Dumbbell Romanian deadlift', spiergroep: 'Hamstrings', patroon: 'hinge', apparatuur: 'dumbbells', type: 'compound', deel: 'onder', basis: true,
    tip: 'Dumbbells langs je dijen naar beneden laten glijden terwijl je heupen naar achteren gaan. Rug recht.' },
  { id: 'sl-rdl-db', naam: 'Single-leg RDL (dumbbell)', spiergroep: 'Hamstrings/billen', patroon: 'hinge', apparatuur: 'dumbbells', type: 'compound', deel: 'onder',
    tip: 'Op één been, ander been gaat gestrekt naar achteren. Heupen blijven recht naar de grond gericht.' },
  { id: 'db-swing', naam: 'Dumbbell swing', spiergroep: 'Billen/hamstrings', patroon: 'hinge', apparatuur: 'dumbbells', type: 'compound', deel: 'onder',
    tip: 'Eén dumbbell met twee handen. Zwaai tussen je benen en stuw explosief met je heupen naar voren tot borsthoogte.' },
  { id: 'sl-rdl-bw', naam: 'Single-leg RDL (lichaamsgewicht)', spiergroep: 'Hamstrings/billen', patroon: 'hinge', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder', basis: true,
    tip: 'Kantel langzaam voorover op één been tot je romp en achterste been horizontaal zijn. Beheerst terug.' },
  { id: 'superman', naam: 'Superman', spiergroep: 'Onderrug/billen', patroon: 'hinge', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'onder',
    tip: 'Op je buik, til armen en benen tegelijk een paar centimeter op. Houd 2 seconden vast en zak rustig.' },

  // ---------- Heup / billen ----------
  { id: 'hip-thrust', naam: 'Barbell hip thrust', spiergroep: 'Billen', patroon: 'heup', apparatuur: 'barbell', type: 'compound', deel: 'onder', basis: true,
    tip: 'Bovenrug tegen een bank, stang op je heupen. Duw omhoog tot je lichaam recht is en knijp je billen samen.' },
  { id: 'cable-pull-through', naam: 'Cable pull-through', spiergroep: 'Billen/hamstrings', patroon: 'heup', apparatuur: 'kabel', type: 'compound', deel: 'onder',
    tip: 'Met je rug naar de kabel, touw tussen je benen. Heupen naar achteren en krachtig naar voren stuwen.' },
  { id: 'db-hip-thrust', naam: 'Dumbbell hip thrust', spiergroep: 'Billen', patroon: 'heup', apparatuur: 'bank', type: 'compound', deel: 'onder',
    tip: 'Bovenrug tegen een bank, dumbbell op je heupen. Kin licht naar je borst en duw via je hielen omhoog.' },
  { id: 'db-glute-bridge', naam: 'Glute bridge met dumbbell', spiergroep: 'Billen', patroon: 'heup', apparatuur: 'dumbbells', type: 'compound', deel: 'onder',
    tip: 'Op je rug, dumbbell op je heupen. Duw je heupen omhoog en houd bovenin 1 seconde vast.' },
  { id: 'glute-bridge', naam: 'Glute bridge', spiergroep: 'Billen', patroon: 'heup', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder', basis: true,
    tip: 'Op je rug, voeten dicht bij je billen. Duw je heupen omhoog en knijp bovenin je billen samen.' },
  { id: 'sl-glute-bridge', naam: 'Single-leg glute bridge', spiergroep: 'Billen', patroon: 'heup', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder',
    tip: 'Eén voet op de grond, ander been gestrekt omhoog. Houd je heupen recht tijdens het omhoog duwen.' },
  { id: 'bw-hip-thrust', naam: 'Hip thrust tegen bank', spiergroep: 'Billen', patroon: 'heup', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'onder',
    tip: 'Bovenrug tegen de bank of bed. Duw omhoog tot je heupen gestrekt zijn en pauzeer bovenin.' },

  // ---------- Horizontaal duwen (borst) ----------
  { id: 'bench-press', naam: 'Bench press', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'barbell', type: 'compound', deel: 'boven', basis: true,
    tip: 'Schouderbladen samen en omlaag, voeten stevig aan de grond. Laat de stang gecontroleerd zakken tot je onderborst.' },
  { id: 'incline-bench', naam: 'Incline bench press', spiergroep: 'Borst (boven)', patroon: 'hpush', apparatuur: 'barbell', type: 'compound', deel: 'boven',
    tip: 'Bank op 30–45°. Stang zakt naar je bovenborst, ellebogen iets naar binnen.' },
  { id: 'db-bench', naam: 'Dumbbell bench press', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'bank', type: 'compound', deel: 'boven', basis: true,
    tip: 'Dumbbells zakken tot naast je borst, ellebogen ~45° van je lichaam. Duw ze omhoog naar elkaar toe.' },
  { id: 'incline-db', naam: 'Incline dumbbell press', spiergroep: 'Borst (boven)', patroon: 'hpush', apparatuur: 'bank', type: 'compound', deel: 'boven',
    tip: 'Bank op 30°. Zak diep met gecontroleerd tempo en duw recht boven je schouders uit.' },
  { id: 'chest-press', naam: 'Chest press machine', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'machine', type: 'compound', deel: 'boven',
    tip: 'Handgrepen op borsthoogte. Duw uit zonder je schouders naar voren te laten komen.' },
  { id: 'dips', naam: 'Dips', spiergroep: 'Borst/triceps', patroon: 'hpush', apparatuur: 'optrekstang', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'Leun iets voorover en zak tot je bovenarmen horizontaal zijn. Duw jezelf volledig omhoog.' },
  { id: 'db-floor-press', naam: 'Dumbbell floor press', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'dumbbells', type: 'compound', deel: 'boven', basis: true,
    tip: 'Op je rug op de vloer. Zak tot je bovenarmen de grond raken, pauzeer kort en duw omhoog.' },
  { id: 'push-up', naam: 'Push-up', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', basis: true,
    tip: 'Handen iets breder dan je schouders, lichaam in één rechte lijn. Borst bijna tot de grond.' },
  { id: 'knee-push-up', naam: 'Push-up op knieën', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', niveau: 'beginner',
    tip: 'Op je knieën met een rechte lijn van knie tot hoofd. Lukt dit makkelijk? Ga naar gewone push-ups.' },
  { id: 'incline-push-up', naam: 'Incline push-up (handen op tafel)', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', niveau: 'beginner',
    tip: 'Handen op een tafel of aanrecht. Hoe lager het steunpunt, hoe zwaarder de oefening.' },
  { id: 'decline-push-up', naam: 'Decline push-up (voeten op stoel)', spiergroep: 'Borst (boven)/schouders', patroon: 'hpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'Voeten op een stoel, handen op de grond. Houd je core strak zodat je heupen niet doorzakken.' },
  { id: 'wide-push-up', naam: 'Brede push-up', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven',
    tip: 'Handen ruim buiten schouderbreedte. Zak langzaam en voel de rek in je borst.' },
  { id: 'archer-push-up', naam: 'Archer push-up', spiergroep: 'Borst', patroon: 'hpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'Handen heel breed. Zak naar één kant terwijl de andere arm gestrekt blijft, wissel per rep.' },

  // ---------- Verticaal duwen (schouders) ----------
  { id: 'ohp', naam: 'Overhead press', spiergroep: 'Schouders', patroon: 'vpush', apparatuur: 'barbell', type: 'compound', deel: 'boven', basis: true,
    tip: 'Staand, billen en buik aangespannen. Druk de stang recht omhoog en breng je hoofd onder de stang door.' },
  { id: 'seated-db-press', naam: 'Seated dumbbell shoulder press', spiergroep: 'Schouders', patroon: 'vpush', apparatuur: 'bank', type: 'compound', deel: 'boven',
    tip: 'Rugleuning bijna rechtop. Dumbbells zakken tot oorhoogte en druk ze omhoog zonder je rug hol te trekken.' },
  { id: 'machine-press', naam: 'Shoulder press machine', spiergroep: 'Schouders', patroon: 'vpush', apparatuur: 'machine', type: 'compound', deel: 'boven',
    tip: 'Handgrepen op schouderhoogte. Duw omhoog tot bijna gestrekt en laat langzaam zakken.' },
  { id: 'db-press', naam: 'Staande dumbbell shoulder press', spiergroep: 'Schouders', patroon: 'vpush', apparatuur: 'dumbbells', type: 'compound', deel: 'boven', basis: true,
    tip: 'Dumbbells op schouderhoogte, polsen recht. Druk omhoog en houd je ribben omlaag.' },
  { id: 'arnold-press', naam: 'Arnold press', spiergroep: 'Schouders', patroon: 'vpush', apparatuur: 'dumbbells', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'Start met handpalmen naar je toe en draai tijdens het drukken naar voren. Rustig terugdraaien.' },
  { id: 'pike-push-up', naam: 'Pike push-up', spiergroep: 'Schouders', patroon: 'vpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', basis: true,
    tip: 'Heupen hoog in een omgekeerde V. Laat je hoofd tussen je handen naar de grond zakken.' },
  { id: 'elevated-pike', naam: 'Pike push-up (voeten op stoel)', spiergroep: 'Schouders', patroon: 'vpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'Voeten op een stoel, heupen boven je schouders. Zak gecontroleerd met je hoofd richting de grond.' },
  { id: 'wall-hspu', naam: 'Handstand push-up tegen muur', spiergroep: 'Schouders', patroon: 'vpush', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'In handstand met je voeten tegen de muur. Zak tot je hoofd bijna de grond raakt en duw terug.' },

  // ---------- Horizontaal trekken (rug) ----------
  { id: 'barbell-row', naam: 'Barbell row', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'barbell', type: 'compound', deel: 'boven', basis: true,
    tip: 'Romp voorover op ~45°, rug recht. Trek de stang naar je navel en knijp je schouderbladen samen.' },
  { id: 'cable-row', naam: 'Seated cable row', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'kabel', type: 'compound', deel: 'boven', basis: true,
    tip: 'Borst vooruit, trek het handvat naar je buik. Laat je schouders aan het eind naar voren komen voor een volle rek.' },
  { id: 'machine-row', naam: 'Chest-supported row machine', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'machine', type: 'compound', deel: 'boven',
    tip: 'Borst tegen het kussen. Trek met je ellebogen naar achteren en pauzeer kort.' },
  { id: 't-bar-row', naam: 'T-bar row', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'machine', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'Heupen naar achteren, rug neutraal. Trek de handgrepen naar je borst zonder te zwaaien.' },
  { id: 'one-arm-row', naam: 'One-arm dumbbell row', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'dumbbells', type: 'compound', deel: 'boven', basis: true,
    tip: 'Steun met één hand op een bank, stoel of je knie. Trek de dumbbell naar je heup, elleboog langs je lichaam.' },
  { id: 'db-bent-row', naam: 'Dumbbell bent-over row', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'dumbbells', type: 'compound', deel: 'boven',
    tip: 'Voorover gebogen met rechte rug. Trek beide dumbbells naar je onderbuik en zak beheerst.' },
  { id: 'renegade-row', naam: 'Renegade row', spiergroep: 'Rug/core', patroon: 'hpull', apparatuur: 'dumbbells', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'In plankpositie op de dumbbells. Roei afwisselend links en rechts zonder je heupen te draaien.' },
  { id: 'table-row', naam: 'Inverted row onder tafel', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven', basis: true,
    tip: 'Lig onder een stevige tafel en pak de rand vast. Trek je borst naar de tafel met je lichaam in een rechte lijn.' },
  { id: 'towel-row', naam: 'Handdoek-row aan deur', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven',
    tip: 'Handdoek om beide deurklinken van een gesloten deur. Leun achterover en trek jezelf naar de deur toe.' },
  { id: 'doorframe-row', naam: 'Deurpost-row (één arm)', spiergroep: 'Rug', patroon: 'hpull', apparatuur: 'lichaamsgewicht', type: 'compound', deel: 'boven',
    tip: 'Pak een deurpost met één hand, leun achterover en trek jezelf terug. Hoe verder je leunt, hoe zwaarder.' },

  // ---------- Verticaal trekken (rug) ----------
  { id: 'pull-up', naam: 'Pull-up', spiergroep: 'Rug (lats)', patroon: 'vpull', apparatuur: 'optrekstang', type: 'compound', deel: 'boven', basis: true, niveau: 'gevorderd',
    tip: 'Bovenhandse greep, iets breder dan je schouders. Trek je borst naar de stang zonder te zwaaien.' },
  { id: 'chin-up', naam: 'Chin-up', spiergroep: 'Rug/biceps', patroon: 'vpull', apparatuur: 'optrekstang', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'Onderhandse greep op schouderbreedte. Trek tot je kin boven de stang is en zak volledig uit.' },
  { id: 'lat-pulldown', naam: 'Lat pulldown', spiergroep: 'Rug (lats)', patroon: 'vpull', apparatuur: 'kabel', type: 'compound', deel: 'boven', basis: true,
    tip: 'Leun iets achterover en trek de stang naar je bovenborst. Denk aan je ellebogen naar je zij trekken.' },
  { id: 'close-pulldown', naam: 'Close-grip pulldown', spiergroep: 'Rug (lats)', patroon: 'vpull', apparatuur: 'kabel', type: 'compound', deel: 'boven',
    tip: 'Smalle V-greep. Trek naar je borst en laat de lats bovenin volledig rekken.' },
  { id: 'assisted-pull-up', naam: 'Assisted pull-up machine', spiergroep: 'Rug (lats)', patroon: 'vpull', apparatuur: 'machine', type: 'compound', deel: 'boven', niveau: 'beginner',
    tip: 'Kies genoeg ondersteuning voor nette reps. Trek je borst naar de stang en zak gecontroleerd.' },
  { id: 'db-pullover', naam: 'Dumbbell pullover', spiergroep: 'Rug (lats)/borst', patroon: 'vpull', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven',
    tip: 'Op je rug, één dumbbell met gestrekte armen boven je borst. Laat hem achter je hoofd zakken en trek terug.' },
  { id: 'prone-lat-pull', naam: 'Liggende lat pull', spiergroep: 'Rug (lats)', patroon: 'vpull', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven',
    tip: 'Op je buik, armen gestrekt voor je. Til je borst iets op en trek je ellebogen naar je zij alsof je een stang omlaag trekt.' },

  // ---------- Borst isolatie ----------
  { id: 'cable-fly', naam: 'Cable fly', spiergroep: 'Borst', patroon: 'borst-iso', apparatuur: 'kabel', type: 'isolatie', deel: 'boven', basis: true,
    tip: 'Lichte buiging in je ellebogen. Breng je handen in een boog naar elkaar toe voor je borst.' },
  { id: 'pec-deck', naam: 'Pec deck', spiergroep: 'Borst', patroon: 'borst-iso', apparatuur: 'machine', type: 'isolatie', deel: 'boven',
    tip: 'Schouders tegen de rugleuning. Breng de armen samen en laat ze langzaam terug open gaan.' },
  { id: 'db-fly', naam: 'Dumbbell fly', spiergroep: 'Borst', patroon: 'borst-iso', apparatuur: 'bank', type: 'isolatie', deel: 'boven',
    tip: 'Op een bank, armen licht gebogen. Laat de dumbbells zijwaarts zakken tot je rek voelt.' },
  { id: 'floor-fly', naam: 'Dumbbell fly op de vloer', spiergroep: 'Borst', patroon: 'borst-iso', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven',
    tip: 'Op je rug op de vloer. Laat de dumbbells zijwaarts zakken tot je ellebogen de grond raken.' },
  { id: 'sliding-fly', naam: 'Sliding fly met handdoeken', spiergroep: 'Borst', patroon: 'borst-iso', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven', niveau: 'gevorderd',
    tip: 'Op een gladde vloer in push-up houding (op knieën mag), handen op handdoeken. Schuif je handen uit elkaar en weer terug.' },

  // ---------- Schouder isolatie ----------
  { id: 'lateral-raise', naam: 'Dumbbell lateral raise', spiergroep: 'Schouders (zij)', patroon: 'schouder-iso', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven', basis: true,
    tip: 'Til de dumbbells zijwaarts tot schouderhoogte met licht gebogen ellebogen. Langzaam zakken.' },
  { id: 'cable-lateral', naam: 'Cable lateral raise', spiergroep: 'Schouders (zij)', patroon: 'schouder-iso', apparatuur: 'kabel', type: 'isolatie', deel: 'boven',
    tip: 'Kabel laag, sta zijwaarts. Til je arm zijwaarts tot schouderhoogte, de spanning blijft constant.' },
  { id: 'machine-lateral', naam: 'Lateral raise machine', spiergroep: 'Schouders (zij)', patroon: 'schouder-iso', apparatuur: 'machine', type: 'isolatie', deel: 'boven',
    tip: 'Duw met je ellebogen naar buiten tot schouderhoogte, niet met je handen.' },
  { id: 'front-raise', naam: 'Dumbbell front raise', spiergroep: 'Schouders (voor)', patroon: 'schouder-iso', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven',
    tip: 'Til de dumbbells voor je uit tot schouderhoogte. Niet zwaaien met je romp.' },

  // ---------- Achterkant schouders ----------
  { id: 'face-pull', naam: 'Face pull', spiergroep: 'Schouders (achter)', patroon: 'achterschouder', apparatuur: 'kabel', type: 'isolatie', deel: 'boven', basis: true,
    tip: 'Touw op ooghoogte. Trek naar je gezicht en draai je handen naar buiten, ellebogen hoog.' },
  { id: 'reverse-pec-deck', naam: 'Reverse pec deck', spiergroep: 'Schouders (achter)', patroon: 'achterschouder', apparatuur: 'machine', type: 'isolatie', deel: 'boven',
    tip: 'Borst tegen het kussen. Breng je armen in een boog naar achteren en knijp je schouderbladen samen.' },
  { id: 'rear-delt-fly', naam: 'Dumbbell rear delt fly', spiergroep: 'Schouders (achter)', patroon: 'achterschouder', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven',
    tip: 'Voorover gebogen, armen licht gebogen. Til de dumbbells zijwaarts op tot schouderhoogte.' },
  { id: 'ytw', naam: 'Y-T-W raises', spiergroep: 'Schouders (achter)/bovenrug', patroon: 'achterschouder', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven', basis: true,
    tip: 'Op je buik. Til je armen op in een Y-, T- en W-vorm; dat is één rep. Duimen omhoog.' },
  { id: 'snow-angel', naam: 'Reverse snow angels', spiergroep: 'Schouders (achter)/bovenrug', patroon: 'achterschouder', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven',
    tip: 'Op je buik, armen net van de grond. Beweeg ze in een grote boog van je heupen tot boven je hoofd.' },

  // ---------- Biceps ----------
  { id: 'barbell-curl', naam: 'Barbell curl', spiergroep: 'Biceps', patroon: 'biceps', apparatuur: 'barbell', type: 'isolatie', deel: 'boven',
    tip: 'Ellebogen tegen je zij. Krul de stang omhoog zonder je romp mee te zwaaien.' },
  { id: 'cable-curl', naam: 'Cable curl', spiergroep: 'Biceps', patroon: 'biceps', apparatuur: 'kabel', type: 'isolatie', deel: 'boven',
    tip: 'Kabel laag. Krul omhoog en knijp bovenin, laat langzaam zakken tot je armen gestrekt zijn.' },
  { id: 'preacher-curl', naam: 'Preacher curl machine', spiergroep: 'Biceps', patroon: 'biceps', apparatuur: 'machine', type: 'isolatie', deel: 'boven',
    tip: 'Bovenarmen plat op het kussen. Strek je armen bijna volledig voor elke rep.' },
  { id: 'incline-curl', naam: 'Incline dumbbell curl', spiergroep: 'Biceps', patroon: 'biceps', apparatuur: 'bank', type: 'isolatie', deel: 'boven',
    tip: 'Bank op 45°, armen hangen recht naar beneden. Krul omhoog zonder je ellebogen naar voren te brengen.' },
  { id: 'db-curl', naam: 'Dumbbell curl', spiergroep: 'Biceps', patroon: 'biceps', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven', basis: true,
    tip: 'Draai je handpalmen naar boven tijdens het krullen. Ellebogen blijven stil langs je lichaam.' },
  { id: 'hammer-curl', naam: 'Hammer curl', spiergroep: 'Biceps/onderarm', patroon: 'biceps', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven',
    tip: 'Duimen omhoog (neutrale greep). Krul gecontroleerd en zak langzaam.' },
  { id: 'concentration-curl', naam: 'Concentration curl', spiergroep: 'Biceps', patroon: 'biceps', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven',
    tip: 'Zittend, elleboog tegen de binnenkant van je dij. Krul langzaam en knijp bovenin.' },
  { id: 'towel-curl', naam: 'Handdoek-curl', spiergroep: 'Biceps', patroon: 'biceps', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven',
    tip: 'Handdoek onder je voet, uiteinden in je handen. Krul omhoog terwijl je met je voet tegenwerkt.' },
  { id: 'chin-table-row', naam: 'Onderhandse tafel-row', spiergroep: 'Biceps/rug', patroon: 'biceps', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven',
    tip: 'Onder een tafel met je handpalmen naar je toe. Trek jezelf op met de focus op je biceps.' },

  // ---------- Triceps ----------
  { id: 'pushdown', naam: 'Triceps pushdown', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'kabel', type: 'isolatie', deel: 'boven', basis: true,
    tip: 'Ellebogen vast tegen je zij. Duw de kabel naar beneden tot je armen gestrekt zijn.' },
  { id: 'overhead-cable', naam: 'Overhead cable extension', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'kabel', type: 'isolatie', deel: 'boven',
    tip: 'Met je rug naar de kabel, touw achter je hoofd. Strek je armen naar voren-boven.' },
  { id: 'skull-crusher', naam: 'Skull crusher', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'bank', type: 'isolatie', deel: 'boven',
    tip: 'Op een bank, dumbbells boven je borst. Buig alleen in je ellebogen en laat ze naast je hoofd zakken.' },
  { id: 'close-grip-bench', naam: 'Close-grip bench press', spiergroep: 'Triceps/borst', patroon: 'triceps', apparatuur: 'barbell', type: 'compound', deel: 'boven', niveau: 'gevorderd',
    tip: 'Handen op schouderbreedte, ellebogen dicht langs je lichaam. Stang zakt naar je onderborst.' },
  { id: 'db-overhead-ext', naam: 'Dumbbell overhead extension', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven', basis: true,
    tip: 'Eén dumbbell met twee handen boven je hoofd. Laat hem achter je hoofd zakken, ellebogen wijzen omhoog.' },
  { id: 'kickback', naam: 'Dumbbell kickback', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven',
    tip: 'Voorover gebogen, bovenarm langs je lichaam. Strek je onderarm naar achteren en knijp.' },
  { id: 'floor-skull', naam: 'Liggende dumbbell triceps extension', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'dumbbells', type: 'isolatie', deel: 'boven',
    tip: 'Op je rug op de vloer. Buig alleen in je ellebogen en laat de dumbbells naast je hoofd zakken.' },
  { id: 'chair-dips', naam: 'Stoeldips', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven', basis: true,
    tip: 'Handen op de rand van een stevige stoel, billen er net voor. Zak tot ~90° in je ellebogen.' },
  { id: 'diamond-push-up', naam: 'Diamond push-up', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven',
    tip: 'Handen dicht bij elkaar onder je borst (duimen en wijsvingers raken). Op je knieën mag ook.' },
  { id: 'table-triceps', naam: 'Triceps extension tegen tafel', spiergroep: 'Triceps', patroon: 'triceps', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'boven', niveau: 'gevorderd',
    tip: 'Handen op de tafelrand, lichaam schuin. Buig alleen je ellebogen tot je voorhoofd bij je handen is en strek terug.' },

  // ---------- Quadriceps isolatie ----------
  { id: 'leg-extension', naam: 'Leg extension', spiergroep: 'Quadriceps', patroon: 'quad-iso', apparatuur: 'machine', type: 'isolatie', deel: 'onder', basis: true,
    tip: 'Knie in lijn met het draaipunt. Strek volledig, knijp 1 seconde en laat langzaam zakken.' },
  { id: 'wall-sit', naam: 'Wall sit', spiergroep: 'Quadriceps', patroon: 'quad-iso', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'onder', eenheid: 'sec',
    tip: 'Rug tegen de muur, knieën op 90°. Houd vol en druk je onderrug tegen de muur.' },
  { id: 'sissy-squat', naam: 'Sissy squat', spiergroep: 'Quadriceps', patroon: 'quad-iso', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'onder', niveau: 'gevorderd',
    tip: 'Houd je vast aan een deurpost. Kom op je tenen en laat je knieën naar voren zakken terwijl je heupen gestrekt blijven.' },

  // ---------- Hamstrings isolatie ----------
  { id: 'lying-leg-curl', naam: 'Lying leg curl', spiergroep: 'Hamstrings', patroon: 'ham-iso', apparatuur: 'machine', type: 'isolatie', deel: 'onder', basis: true,
    tip: 'Heupen plat op het kussen. Krul je hielen naar je billen en laat langzaam terugzakken.' },
  { id: 'seated-leg-curl', naam: 'Seated leg curl', spiergroep: 'Hamstrings', patroon: 'ham-iso', apparatuur: 'machine', type: 'isolatie', deel: 'onder',
    tip: 'Leun iets voorover voor extra rek. Trek je hielen onder de stoel en pauzeer kort.' },
  { id: 'db-leg-curl', naam: 'Dumbbell leg curl', spiergroep: 'Hamstrings', patroon: 'ham-iso', apparatuur: 'bank', type: 'isolatie', deel: 'onder',
    tip: 'Op je buik op een bank, dumbbell tussen je voeten geklemd. Krul langzaam omhoog.' },
  { id: 'sliding-leg-curl', naam: 'Sliding leg curl met handdoek', spiergroep: 'Hamstrings', patroon: 'ham-iso', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'onder',
    tip: 'Op je rug, hielen op een handdoek op een gladde vloer. Heupen omhoog en trek je hielen naar je billen.' },
  { id: 'nordic-curl', naam: 'Nordic curl', spiergroep: 'Hamstrings', patroon: 'ham-iso', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'onder', niveau: 'gevorderd',
    tip: 'Op je knieën, voeten onder de bank of laten vasthouden. Laat je zo langzaam mogelijk voorover zakken.' },

  // ---------- Kuiten ----------
  { id: 'standing-calf', naam: 'Standing calf raise machine', spiergroep: 'Kuiten', patroon: 'kuiten', apparatuur: 'machine', type: 'isolatie', deel: 'onder', basis: true,
    tip: 'Zak diep met je hielen voor een volle rek en kom zo hoog mogelijk op je tenen.' },
  { id: 'seated-calf', naam: 'Seated calf raise', spiergroep: 'Kuiten', patroon: 'kuiten', apparatuur: 'machine', type: 'isolatie', deel: 'onder',
    tip: 'Pauzeer onderin 1 seconde om veren te voorkomen. Knijp bovenin.' },
  { id: 'db-calf', naam: 'Dumbbell calf raise', spiergroep: 'Kuiten', patroon: 'kuiten', apparatuur: 'dumbbells', type: 'isolatie', deel: 'onder', basis: true,
    tip: 'Op een traptrede met dumbbell in je hand. Zak diep en kom helemaal op je tenen.' },
  { id: 'step-calf', naam: 'Calf raise op traptrede', spiergroep: 'Kuiten', patroon: 'kuiten', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'onder', basis: true,
    tip: 'Voorvoeten op de rand van een trede. Zak langzaam en kom zo hoog mogelijk op je tenen.' },
  { id: 'sl-calf', naam: 'Single-leg calf raise', spiergroep: 'Kuiten', patroon: 'kuiten', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'onder',
    tip: 'Op één been, houd je licht vast aan de muur. Volle beweging, rustig tempo.' },

  // ---------- Core ----------
  { id: 'plank', naam: 'Plank', spiergroep: 'Core', patroon: 'core', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'core', eenheid: 'sec', basis: true,
    tip: 'Op je onderarmen, lichaam in één rechte lijn. Billen en buik aanspannen, blijf ademen.' },
  { id: 'side-plank', naam: 'Zijplank (per kant)', spiergroep: 'Core (zij)', patroon: 'core', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'core', eenheid: 'sec',
    tip: 'Op één onderarm, heupen hoog. Houd je lichaam in een rechte lijn van hoofd tot voeten.' },
  { id: 'dead-bug', naam: 'Dead bug', spiergroep: 'Core', patroon: 'core', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'core',
    tip: 'Op je rug, armen en knieën omhoog. Strek tegengestelde arm en been terwijl je onderrug op de grond blijft.' },
  { id: 'bird-dog', naam: 'Bird dog', spiergroep: 'Core/onderrug', patroon: 'core', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'core',
    tip: 'Op handen en knieën. Strek tegengestelde arm en been, houd 2 seconden vast zonder je heup te draaien.' },
  { id: 'hollow-hold', naam: 'Hollow hold', spiergroep: 'Core', patroon: 'core', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'core', eenheid: 'sec', niveau: 'gevorderd',
    tip: 'Op je rug, onderrug tegen de grond. Til schouders en gestrekte benen net van de grond en houd vast.' },
  { id: 'mountain-climber', naam: 'Mountain climbers (per been)', spiergroep: 'Core', patroon: 'core', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'core',
    tip: 'In push-up houding, trek afwisselend je knieën snel naar je borst. Heupen laag houden.' },
  { id: 'leg-raise', naam: 'Liggende beenheffing', spiergroep: 'Core (onderbuik)', patroon: 'core', apparatuur: 'lichaamsgewicht', type: 'isolatie', deel: 'core',
    tip: 'Op je rug, handen onder je billen. Til gestrekte benen omhoog en laat ze langzaam zakken zonder de grond te raken.' },
  { id: 'hanging-knee-raise', naam: 'Hanging knee raise', spiergroep: 'Core (onderbuik)', patroon: 'core', apparatuur: 'optrekstang', type: 'isolatie', deel: 'core',
    tip: 'Hang aan de stang en trek je knieën naar je borst. Niet zwaaien, rustig laten zakken.' },
  { id: 'cable-crunch', naam: 'Cable crunch', spiergroep: 'Core', patroon: 'core', apparatuur: 'kabel', type: 'isolatie', deel: 'core',
    tip: 'Geknield, touw naast je hoofd. Rol je romp naar beneden door je buikspieren aan te spannen.' },
  { id: 'pallof-press', naam: 'Pallof press', spiergroep: 'Core (anti-rotatie)', patroon: 'core', apparatuur: 'kabel', type: 'isolatie', deel: 'core',
    tip: 'Zijwaarts naast de kabel. Duw het handvat recht voor je uit en weersta de draaiing.' },
  { id: 'russian-twist', naam: 'Russian twist met dumbbell', spiergroep: 'Core (zij)', patroon: 'core', apparatuur: 'dumbbells', type: 'isolatie', deel: 'core',
    tip: 'Zittend, leun iets achterover. Draai de dumbbell van links naar rechts; elke kant telt als één rep.' },
  { id: 'farmers-walk', naam: "Farmer's walk", spiergroep: 'Core/grip', patroon: 'core', apparatuur: 'dumbbells', type: 'isolatie', deel: 'core', eenheid: 'sec',
    tip: 'Zware dumbbells in beide handen. Loop rechtop met kleine passen, schouders laag.' },
];

// Cardio voor het doel vetverlies. `soorten` zegt of een activiteit geschikt is voor
// rustige duurcardio ('rustig') en/of intervallen ('interval').
export const CARDIO: CardioOptie[] = [
  { id: 'loopband-helling', naam: 'Loopband op helling', apparatuur: 'machine', soorten: ['rustig'],
    tip: 'Stevig wandelen op 8–12% helling, 5–6 km/u. Niet vasthouden aan de leuningen.' },
  { id: 'crosstrainer', naam: 'Crosstrainer', apparatuur: 'machine', soorten: ['rustig', 'interval'],
    tip: 'Rechtop staan, niet op de handgrepen leunen, en actief duwen en trekken met je armen.' },
  { id: 'hometrainer', naam: 'Hometrainer', apparatuur: 'machine', soorten: ['rustig', 'interval'],
    tip: 'Zadel op heuphoogte: onderin is je knie bijna gestrekt. Hard = weerstand omhoog, niet alleen sneller trappen.' },
  { id: 'roeitoestel', naam: 'Roeitoestel', apparatuur: 'machine', soorten: ['rustig', 'interval'],
    tip: 'Eerst benen, dan achterover leunen, dan armen. Terug in omgekeerde volgorde. Kracht komt uit je benen.' },
  { id: 'wandelen', naam: 'Stevig wandelen', apparatuur: 'lichaamsgewicht', soorten: ['rustig'],
    tip: 'Tempo waarbij je nog kunt praten maar niet kunt zingen. Zwaai je armen actief mee. Binnen kan ook op de plek.' },
  { id: 'traplopen', naam: 'Traplopen', apparatuur: 'lichaamsgewicht', soorten: ['rustig', 'interval'],
    tip: 'Elke tree, hele voet op de trede. Omlaag rustig lopen en houd de leuning vast als dat nodig is.' },
  { id: 'low-impact', naam: 'Low-impact cardio', apparatuur: 'lichaamsgewicht', soorten: ['rustig'],
    tip: 'Wissel elke minuut af: marcheren met hoge knieën, step jacks (zijwaarts tikken), squat met armen omhoog, schaduwboksen.' },
  { id: 'schaduwboksen', naam: 'Schaduwboksen', apparatuur: 'lichaamsgewicht', soorten: ['rustig', 'interval'],
    tip: 'Licht op je voorvoeten, handen voor je gezicht. Stoot vanuit je heup en blijf bewegen tussen de combinaties.' },
  { id: 'hiit-circuit', naam: 'HIIT-circuit', apparatuur: 'lichaamsgewicht', soorten: ['interval'], niveau: 'gevorderd',
    tip: 'Wissel per interval: jumping jacks, high knees, mountain climbers, burpees. Zacht landen en ga voor tempo met goede techniek.' },
];

// ---------------------------------------------------------------------------
// Koppeling met de oefeningenbibliotheek van de Gym Logger. Gekoppelde oefeningen
// delen hun geschiedenis, PR's en animatie met de logger en krijgen de bibliotheeknaam.
// Elke bibliotheekoefening komt hoogstens één keer voor, zodat een training nooit twee
// keer dezelfde oefening in de logger krijgt.
export const BIBLIOTHEEK: Record<string, string> = {
  'back-squat': 'squat',
  'front-squat': 'front-squat',
  'leg-press': 'leg-press',
  'hack-squat': 'hack-squat',
  'goblet-squat': 'goblet-squat',
  'bulgarian-db': 'bulgarian-split-squat',
  'walking-lunge-db': 'lunges',
  deadlift: 'deadlift',
  rdl: 'romanian-deadlift',
  'good-morning': 'good-morning',
  'back-extension': 'back-extension',
  'hip-thrust': 'hip-thrust',
  'glute-bridge': 'glute-bridge',
  'bench-press': 'bankdrukken',
  'incline-bench': 'incline-bankdrukken',
  'db-bench': 'dumbbell-bankdrukken',
  'incline-db': 'incline-dumbbell-press',
  'chest-press': 'chest-press-machine',
  dips: 'dips',
  'push-up': 'push-up',
  ohp: 'overhead-press',
  'seated-db-press': 'dumbbell-schouderpress',
  'arnold-press': 'arnold-press',
  'machine-press': 'shoulder-press-machine',
  'barbell-row': 'barbell-row',
  'cable-row': 'seated-cable-row',
  'machine-row': 'seated-row-machine',
  't-bar-row': 't-bar-row',
  'one-arm-row': 'dumbbell-row',
  'pull-up': 'pull-up',
  'chin-up': 'chin-up',
  'lat-pulldown': 'lat-pulldown',
  'close-pulldown': 'close-grip-lat-pulldown',
  'cable-fly': 'cable-crossover',
  'pec-deck': 'pec-deck',
  'db-fly': 'dumbbell-flyes',
  'lateral-raise': 'lateral-raises',
  'cable-lateral': 'cable-lateral-raise',
  'front-raise': 'front-raises',
  'face-pull': 'face-pulls',
  'reverse-pec-deck': 'reverse-pec-deck',
  'barbell-curl': 'barbell-curl',
  'cable-curl': 'cable-curl',
  'db-curl': 'dumbbell-curl',
  'hammer-curl': 'hammer-curl',
  pushdown: 'triceps-pushdown',
  'close-grip-bench': 'close-grip-bankdrukken',
  'db-overhead-ext': 'overhead-triceps-extension',
  'leg-extension': 'leg-extension',
  'lying-leg-curl': 'leg-curl',
  'seated-leg-curl': 'seated-leg-curl',
  'standing-calf': 'kuitheffen',
  'seated-calf': 'kuitheffen-zittend',
  plank: 'plank',
  'hanging-knee-raise': 'hanging-leg-raise',
  'leg-raise': 'lying-leg-raise',
  'cable-crunch': 'cable-crunch',
  'mountain-climber': 'mountain-climbers',
};

const LIB_NAAM = new Map(LIBRARY.map((l) => [l.slug, l.name]));

export const OEFENINGEN: PlanOefening[] = DATABASE.map((o) => {
  const slug = BIBLIOTHEEK[o.id];
  return slug && LIB_NAAM.has(slug) ? { ...o, naam: LIB_NAAM.get(slug)! } : o;
});

/** Spiergroep-categorie en apparatuur zoals de logger ze kent, voor oefeningen buiten de bibliotheek. */
export const LOGGER_SPIER: Record<Patroon, Muscle> = {
  squat: 'Benen', lunge: 'Benen', hinge: 'Benen', 'quad-iso': 'Benen', 'ham-iso': 'Benen', kuiten: 'Benen',
  heup: 'Billen', hpush: 'Borst', 'borst-iso': 'Borst', vpush: 'Schouders', 'schouder-iso': 'Schouders',
  achterschouder: 'Schouders', hpull: 'Rug', vpull: 'Rug', biceps: 'Armen', triceps: 'Armen', core: 'Core',
};

export const LOGGER_APPARATUUR: Record<Apparatuur, Equipment> = {
  barbell: 'barbell', machine: 'machine', kabel: 'cable', optrekstang: 'bodyweight',
  bank: 'dumbbell', dumbbells: 'dumbbell', lichaamsgewicht: 'bodyweight',
};
