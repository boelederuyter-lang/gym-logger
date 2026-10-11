import { plank, type Anim, type PoseSpec, type Prop, type V } from './poses';

export type Muscle = 'Borst' | 'Rug' | 'Schouders' | 'Benen' | 'Billen' | 'Armen' | 'Core' | 'Hele lichaam';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'other';

export const MUSCLES: Muscle[] = ['Borst', 'Rug', 'Schouders', 'Benen', 'Billen', 'Armen', 'Core', 'Hele lichaam'];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Stang',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Kabel',
  bodyweight: 'Lichaamsgewicht',
  kettlebell: 'Kettlebell',
  other: 'Overig',
};

export interface LibraryExercise {
  slug: string;
  name: string;
  aliases: string[];
  muscle: Muscle;
  equipment: Equipment;
  tip: string;
  anim: Anim;
}

// ---------- building blocks ----------

const line = (a: V, b: V, w = 2, m = false): Prop => ({ k: 'line', a, b, w, m });
const BAR: Prop = { k: 'bar' };
const DB: Prop = { k: 'db' };
const HANDLE: Prop = { k: 'plate', at: 'h', r: 2.5 };

const STAND: PoseSpec = { hip: [48, 58], t: 0, f: [50, 96], f2: [46, 96] };
const st = (o: PoseSpec = {}): PoseSpec => ({ ...STAND, ...o });

// Lying on a flat bench, head to the left, feet on the floor.
const FLAT_BENCH: Prop[] = [line([22, 75], [74, 75], 6), line([28, 75], [28, 96]), line([68, 75], [68, 96])];
const lie = (o: PoseSpec): PoseSpec => ({ hip: [62, 70], t: -90, f: [82, 96], ...o });
const LYING = { eh: [0, 1] as V, kh: [0, -1] as V };

const INCLINE_BENCH: Prop[] = [line([52, 78], [72, 78], 6), line([52, 78], [28, 48], 6), line([56, 78], [56, 96]), line([70, 78], [70, 96])];
const incline = (o: PoseSpec): PoseSpec => ({ hip: [58, 72], t: -55, f: [80, 96], ...o });

// Seated with a backrest (shoulder presses, machines).
const SEAT_BACK: Prop[] = [line([30, 72], [52, 72], 6), line([30, 72], [27, 34], 6), line([40, 72], [40, 96])];
const seated = (o: PoseSpec): PoseSpec => ({ hip: [38, 68], t: -4, f: [62, 96], f2: [58, 96], ...o });

// Front view.
const fr = (hipY: number, h: V, f: V = [57, 96]): PoseSpec => ({ hip: [50, hipY], h, f });
const CHAIR_FRONT: Prop[] = [line([36, 72], [64, 72], 5), line([40, 72], [40, 96], 2, false), line([60, 72], [60, 96])];
const MACHINE_FRONT: Prop[] = [line([90, 6], [90, 96], 2, true)];

const pushup = (sh: V): PoseSpec => plank(sh, [94, 94], { h: [27, 95], h2: [27, 95], f2: [94, 94] });
const mclimb = (f: V, f2: V): PoseSpec => plank([30, 70], [90, 94], { h: [30, 95], f, f2 });

const e = (
  slug: string,
  name: string,
  muscle: Muscle,
  equipment: Equipment,
  aliases: string[],
  tip: string,
  anim: Anim,
): LibraryExercise => ({ slug, name, muscle, equipment, aliases, tip, anim });

// ---------- library ----------

export const LIBRARY: LibraryExercise[] = [
  // Borst
  e('bankdrukken', 'Bankdrukken', 'Borst', 'barbell', ['bench', 'bench press', 'bankdruk', 'barbell bench press'],
    'Schouderbladen naar achteren en omlaag, laat de stang gecontroleerd zakken tot je borst.',
    { a: lie({ h: [37, 44] }), b: lie({ h: [38, 64] }), props: [...FLAT_BENCH, BAR], ...LYING }),
  e('dumbbell-bankdrukken', 'Dumbbell bankdrukken', 'Borst', 'dumbbell', ['dumbbell bench press', 'db bench', 'dumbbell bench'],
    'Laat de dumbbells diep zakken naast je borst en druk ze boven je schouders samen.',
    { a: lie({ h: [37, 44] }), b: lie({ h: [37, 64] }), props: [...FLAT_BENCH, DB], ...LYING }),
  e('smith-bankdrukken', 'Smith machine bankdrukken', 'Borst', 'machine', ['smith bench', 'smith bench press', 'smith bankdrukken'],
    'Leg de bank zo neer dat de stang precies boven je onderste borst zakt.',
    { a: lie({ h: [37, 44] }), b: lie({ h: [38, 64] }), props: [line([46, 2], [46, 96]), ...FLAT_BENCH, BAR], ...LYING }),
  e('incline-bankdrukken', 'Incline bankdrukken', 'Borst', 'barbell', ['incline bench', 'incline bench press', 'schuin bankdrukken'],
    'Zet de bank op 30 tot 45 graden en laat de stang zakken naar je bovenste borst.',
    { a: incline({ h: [39, 32] }), b: incline({ h: [41, 54] }), props: [...INCLINE_BENCH, BAR], ...LYING }),
  e('incline-dumbbell-press', 'Incline dumbbell press', 'Borst', 'dumbbell', ['incline db press', 'schuin dumbbell drukken', 'incline dumbbell bench'],
    'Houd je ellebogen iets onder schouderhoogte en druk de dumbbells boven je borst.',
    { a: incline({ h: [39, 32] }), b: incline({ h: [40, 54] }), props: [...INCLINE_BENCH, DB], ...LYING }),
  e('decline-bankdrukken', 'Decline bankdrukken', 'Borst', 'barbell', ['decline bench', 'decline bench press', 'decline'],
    'Haak je voeten goed vast en laat de stang zakken naar je onderste borst.',
    {
      a: { hip: [62, 64], t: -108, f: [80, 80], h: [38, 46] },
      b: { hip: [62, 64], t: -108, f: [80, 80], h: [39, 66] },
      props: [line([76, 66], [24, 82], 6), line([76, 82], [84, 78], 4), line([50, 74], [50, 96]), BAR],
      ...LYING,
    }),
  e('dumbbell-flyes', 'Dumbbell flyes', 'Borst', 'dumbbell', ['flyes', 'dumbbell fly', 'flys', 'vlinders'],
    'Houd een lichte buiging in je ellebogen en open je armen tot je een rek in je borst voelt.',
    { a: lie({ h: [37, 45] }), b: lie({ h: [38, 92] }), props: [...FLAT_BENCH, DB], eh: [1, 0], kh: [0, -1] }),
  e('cable-crossover', 'Cable crossover', 'Borst', 'cable', ['cable fly', 'crossover', 'kabel crossover'],
    'Breng je handen in een boog naar elkaar toe voor je heupen en knijp je borst samen.',
    { view: 'front', a: fr(58, [84, 30]), b: fr(58, [56, 58]), props: [{ k: 'cable', from: [96, 6] }, ...MACHINE_FRONT, DB], eh: [1, 0.3] }),
  e('pec-deck', 'Pec deck', 'Borst', 'machine', ['butterfly', 'chest fly machine', 'pec fly', 'vlinder machine'],
    'Zet de stoel zo dat de handvatten op borsthoogte zitten en breng ze rustig samen.',
    { view: 'front', a: fr(68, [86, 40], [60, 96]), b: fr(68, [56, 46], [60, 96]), props: [...CHAIR_FRONT, ...MACHINE_FRONT, HANDLE], eh: [1, 0.5] }),
  e('chest-press-machine', 'Chest press machine', 'Borst', 'machine', ['chest press', 'borstpress', 'borst press machine'],
    'Druk de handvatten naar voren zonder je schouders van de rugleuning te halen.',
    { a: seated({ h: [62, 44] }), b: seated({ h: [44, 46] }), props: [...SEAT_BACK, line([70, 30], [70, 96]), HANDLE], eh: [-0.2, 1] }),
  e('push-up', 'Push-up', 'Borst', 'bodyweight', ['opdrukken', 'pushups', 'push ups', 'opdruk'],
    'Span je buik en bilspieren aan zodat je lichaam van hoofd tot hielen één rechte lijn blijft.',
    { a: pushup([27, 70]), b: pushup([29, 86]), eh: [1, -0.6] }),
  e('dips', 'Dips', 'Borst', 'bodyweight', ['dip', 'parallel dips', 'brug dips'],
    'Leun iets voorover voor meer borst, zak tot je bovenarmen ongeveer horizontaal zijn.',
    {
      view: 'front',
      a: fr(52, [66, 52], [53, 88]),
      b: fr(68, [66, 52], [53, 96]),
      props: [line([60, 52], [78, 52], 4, true), line([74, 52], [74, 96], 2, true)],
      eh: [1, -1],
      kh: [0.3, 0],
    }),

  // Rug
  e('deadlift', 'Deadlift', 'Rug', 'barbell', ['deadlifts', 'conventional deadlift', 'dl', 'deadliften'],
    'Houd de stang tegen je benen, rug neutraal, en duw de vloer weg met je benen.',
    {
      a: { hip: [38, 72], t: 62, h: [58, 85], f: [52, 96], f2: [50, 96] },
      b: st({ h: [50, 58] }),
      props: [{ k: 'bar', r: 8, d: [0, 3] }],
      eh: [0, 1],
    }),
  e('pull-up', 'Pull-up', 'Rug', 'bodyweight', ['pullup', 'pull ups', 'optrekken', 'optrekker'],
    'Begin vanuit een dode hang en trek je borst richting de stang.',
    {
      view: 'front',
      a: fr(60, [68, 8], [54, 96]),
      b: fr(44, [68, 8], [54, 80]),
      props: [line([18, 8], [82, 8], 3), line([20, 8], [20, 96]), line([80, 8], [80, 96])],
      eh: [1, 0.6],
      kh: [0.3, 0],
    }),
  e('chin-up', 'Chin-up', 'Rug', 'bodyweight', ['chinup', 'chin ups', 'onderhandse pull-up'],
    'Handpalmen naar je toe, trek je kin over de stang en zak volledig uit.',
    {
      view: 'front',
      a: fr(60, [61, 8], [54, 96]),
      b: fr(44, [61, 8], [54, 80]),
      props: [line([18, 8], [82, 8], 3), line([20, 8], [20, 96]), line([80, 8], [80, 96])],
      eh: [1, 0.8],
      kh: [0.3, 0],
    }),
  e('lat-pulldown', 'Lat pulldown', 'Rug', 'cable', ['pulldown', 'lat pull down', 'lat pull', 'latpulldown'],
    'Trek de stang naar je bovenste borst en houd je borst omhoog.',
    {
      view: 'front',
      a: fr(70, [78, 16], [62, 96]),
      b: fr(70, [74, 40], [62, 96]),
      props: [...CHAIR_FRONT, { k: 'cable', from: [50, -4], at: 'hm' }, { k: 'bar', r: 0 }],
      eh: [1, 0.8],
    }),
  e('close-grip-lat-pulldown', 'Close grip lat pulldown', 'Rug', 'cable', ['close grip pulldown', 'smalle pulldown', 'v-bar pulldown'],
    'Trek het handvat naar je borstbeen en breng je ellebogen langs je lichaam omlaag.',
    {
      view: 'front',
      a: fr(70, [56, 14], [62, 96]),
      b: fr(70, [55, 40], [62, 96]),
      props: [...CHAIR_FRONT, { k: 'cable', from: [50, -4], at: 'hm' }, HANDLE],
      eh: [1, 1],
    }),
  e('seated-cable-row', 'Seated cable row', 'Rug', 'cable', ['cable row', 'seated row', 'kabel roeien', 'low row'],
    'Trek het handvat naar je navel en knijp je schouderbladen samen.',
    {
      a: { hip: [30, 76], t: 30, h: [70, 62], f: [66, 86], f2: [66, 86] },
      b: { hip: [30, 76], t: -10, h: [44, 62], f: [66, 86], f2: [66, 86] },
      props: [line([18, 80], [44, 80], 5), line([70, 74], [70, 94], 4), line([70, 94], [70, 96]), { k: 'cable', from: [98, 66] }, HANDLE],
      eh: [-1, 0.2],
      kh: [0, -1],
    }),
  e('seated-row-machine', 'Seated row machine', 'Rug', 'machine', ['row machine', 'roeimachine', 'machine row'],
    'Houd je borst tegen het kussen en trek met je ellebogen naar achteren.',
    {
      a: { hip: [32, 68], t: -5, h: [58, 48], f: [58, 96] },
      b: { hip: [32, 68], t: -5, h: [36, 50], f: [58, 96] },
      props: [line([22, 72], [44, 72], 5), line([33, 72], [33, 96]), line([62, 36], [62, 62], 5), line([66, 30], [66, 96]), HANDLE],
      eh: [-1, 0.2],
    }),
  e('barbell-row', 'Barbell row', 'Rug', 'barbell', ['bent over row', 'roeien met stang', 'bb row', 'barbell roeien'],
    'Buig voorover met een rechte rug en trek de stang naar je onderbuik.',
    {
      a: { hip: [40, 58], t: 70, h: [64, 76], f: [50, 96], f2: [48, 96] },
      b: { hip: [40, 58], t: 70, h: [52, 66], f: [50, 96], f2: [48, 96] },
      props: [BAR],
      eh: [-0.6, -1],
    }),
  e('dumbbell-row', 'Dumbbell row', 'Rug', 'dumbbell', ['one arm row', 'db row', 'eenarmig roeien', 'dumbbell roeien'],
    'Steun op de bank en trek de dumbbell langs je lichaam naar je heup.',
    {
      a: { hip: [44, 58], t: 82, h: [68, 80], h2: [72, 68], f: [38, 96], f2: [58, 68] },
      b: { hip: [44, 58], t: 82, h: [56, 60], h2: [72, 68], f: [38, 96], f2: [58, 68] },
      props: [line([40, 71], [86, 71], 5), line([48, 71], [48, 96]), line([80, 71], [80, 96]), { k: 'db', at: 'h' }],
      eh: [-0.5, -1],
    }),
  e('t-bar-row', 'T-bar row', 'Rug', 'barbell', ['tbar row', 't bar', 'landmine row'],
    'Houd je borst omhoog en trek de schijven richting je borst.',
    {
      a: { hip: [40, 58], t: 65, h: [62, 78], f: [50, 96], f2: [48, 96] },
      b: { hip: [40, 58], t: 65, h: [54, 66], f: [50, 96], f2: [48, 96] },
      props: [{ k: 'cable', from: [6, 96] }, { k: 'plate', at: 'h', r: 7, d: [4, 3] }],
      eh: [-0.6, -1],
    }),
  e('straight-arm-pulldown', 'Straight-arm pulldown', 'Rug', 'cable', ['straight arm pulldown', 'pullover cable', 'gestrekte arm pulldown'],
    'Houd je armen bijna gestrekt en duw de stang in een boog naar je dijen.',
    { a: st({ t: 18, h: [76, 18] }), b: st({ t: 18, h: [56, 58] }), props: [{ k: 'cable', from: [94, 4] }, { k: 'pad', at: 'h', len: 10, ang: 90 }], eh: [1, 0] }),
  e('back-extension', 'Back extension', 'Rug', 'bodyweight', ['hyperextension', 'rugstrekker', 'back extensions', 'hyper'],
    'Kom omhoog tot je lichaam een rechte lijn is, niet verder overstrekken.',
    {
      a: { hip: [46, 58], t: 145, hr: [-3, 4], f: [18, 84], f2: [18, 84] },
      b: { hip: [46, 58], t: 82, hr: [-3, 4], f: [18, 84], f2: [18, 84] },
      props: [line([42, 62], [56, 66], 6), line([14, 88], [20, 80], 4), line([50, 66], [32, 96]), line([18, 86], [32, 96])],
      eh: [0, 1],
      kh: [0, 1],
    }),

  // Schouders
  e('overhead-press', 'Overhead press', 'Schouders', 'barbell', ['military press', 'ohp', 'schouderdrukken', 'press'],
    'Span je billen en buik aan en druk de stang in een rechte lijn boven je hoofd.',
    { a: st({ h: [55, 33] }), b: st({ h: [50, 7] }), props: [BAR], eh: [0.6, 1] }),
  e('dumbbell-schouderpress', 'Dumbbell schouderpress', 'Schouders', 'dumbbell', ['dumbbell shoulder press', 'db shoulder press', 'schouderpress', 'shoulder press'],
    'Start met de dumbbells op oorhoogte en druk ze boven je hoofd naar elkaar toe.',
    { a: seated({ h: [44, 40] }), b: seated({ h: [40, 16] }), props: [...SEAT_BACK, DB], eh: [0.6, 1] }),
  e('arnold-press', 'Arnold press', 'Schouders', 'dumbbell', ['arnold', 'arnold presses'],
    'Draai je handpalmen tijdens het drukken van naar je toe naar voren.',
    { a: seated({ h: [48, 38] }), b: seated({ h: [40, 16] }), props: [...SEAT_BACK, DB], eh: [1, 1] }),
  e('shoulder-press-machine', 'Shoulder press machine', 'Schouders', 'machine', ['machine shoulder press', 'schouderpress machine', 'shoulder press'],
    'Zet de stoel zo dat de handvatten op schouderhoogte beginnen.',
    { a: seated({ h: [44, 40] }), b: seated({ h: [42, 16] }), props: [...SEAT_BACK, line([56, 2], [56, 96]), HANDLE], eh: [0.6, 1] }),
  e('lateral-raises', 'Lateral raises', 'Schouders', 'dumbbell', ['lateral raise', 'side raises', 'zijwaartse raises', 'zijheffen'],
    'Til de dumbbells zijwaarts tot schouderhoogte, ellebogen licht gebogen.',
    { view: 'front', a: fr(58, [64, 58]), b: fr(58, [84, 36]), props: [DB], eh: [0, 1] }),
  e('cable-lateral-raise', 'Cable lateral raise', 'Schouders', 'cable', ['kabel lateral raise', 'cable side raise', 'cable laterals'],
    'Til je arm zijwaarts tot schouderhoogte; de kabel houdt de spanning onderin.',
    { view: 'front', a: fr(58, [60, 60]), b: fr(58, [84, 36]), props: [{ k: 'cable', from: [30, 96] }, HANDLE], eh: [0, 1] }),
  e('front-raises', 'Front raises', 'Schouders', 'dumbbell', ['front raise', 'voorwaarts heffen', 'frontheffen'],
    'Til de dumbbells met gestrekte armen naar voren tot schouderhoogte.',
    { a: st({ h: [51, 58] }), b: st({ h: [73, 31] }), props: [DB], eh: [0, 1] }),
  e('reverse-pec-deck', 'Reverse pec deck', 'Schouders', 'machine', ['rear delt fly', 'reverse fly', 'reverse butterfly', 'achterkant schouder'],
    'Duw de handvatten met bijna gestrekte armen naar achteren en knijp je schouderbladen samen.',
    { view: 'front', a: fr(68, [56, 32], [60, 96]), b: fr(68, [86, 34], [60, 96]), props: [...CHAIR_FRONT, ...MACHINE_FRONT, HANDLE], eh: [0, 1] }),
  e('face-pulls', 'Face pulls', 'Schouders', 'cable', ['face pull', 'facepull', 'gezichtstrek'],
    'Trek het touw naar je gezicht en draai je handen naar buiten.',
    { a: st({ h: [72, 26] }), b: st({ h: [56, 22] }), props: [{ k: 'cable', from: [96, 22] }, HANDLE], eh: [-1, -0.3] }),
  e('upright-row', 'Upright row', 'Schouders', 'barbell', ['upright rows', 'rechtop roeien', 'kinheffen'],
    'Trek de stang langs je lichaam omhoog tot borsthoogte, ellebogen boven je handen.',
    { a: st({ h: [52, 58] }), b: st({ h: [53, 36] }), props: [{ k: 'bar', r: 6 }], eh: [-0.5, -1] }),
  e('shrugs', 'Shrugs', 'Schouders', 'dumbbell', ['shrug', 'schouders ophalen', 'trapezius shrugs'],
    'Trek je schouders recht omhoog naar je oren, houd kort vast en zak rustig.',
    { a: st({ h: [50, 58] }), b: st({ hip: [48, 55], h: [50, 51], f: [50, 96] }), props: [DB] }),

  // Benen
  e('squat', 'Squat', 'Benen', 'barbell', ['back squat', 'squats', 'kniebuiging', 'barbell squat', 'squatten'],
    'Knieën in de richting van je tenen, zak tot je heupen onder je knieën komen.',
    {
      a: st({ hr: [-4, 3] }),
      b: { hip: [36, 78], t: 40, hr: [-4, 3], f: [52, 96], f2: [50, 96] },
      props: [{ k: 'bar', at: 'sh', d: [-3, 0] }],
      eh: [0, 1],
    }),
  e('front-squat', 'Front squat', 'Benen', 'barbell', ['frontsquat', 'front squats', 'voorste squat'],
    'Ellebogen hoog, de stang rust op je voorste schouders terwijl je rechtop zakt.',
    {
      a: st({ hr: [5, 1] }),
      b: { hip: [38, 80], t: 25, hr: [5, 1], f: [52, 96], f2: [50, 96] },
      props: [{ k: 'bar', at: 'sh', d: [4, -1] }],
      eh: [1, 0.3],
    }),
  e('goblet-squat', 'Goblet squat', 'Benen', 'dumbbell', ['goblet', 'goblet squats', 'kelk squat'],
    'Houd de dumbbell tegen je borst en zak rechtop tussen je knieën.',
    {
      a: st({ hr: [7, 9] }),
      b: { hip: [38, 80], t: 25, hr: [7, 9], f: [52, 96], f2: [50, 96] },
      props: [{ k: 'db', at: 'h' }],
      eh: [0.2, 1],
    }),
  e('hack-squat', 'Hack squat', 'Benen', 'machine', ['hack squats', 'hack squat machine', 'hack'],
    'Houd je rug tegen het kussen en zak diep zonder dat je hielen loskomen.',
    {
      a: { hip: [44, 60], t: -22, hr: [2, 2], f: [60, 96] },
      b: { hip: [56, 80], t: -22, hr: [2, 2], f: [62, 96] },
      props: [line([24, 28], [58, 92], 5), line([50, 96], [76, 96], 4)],
      kh: [1, -0.2],
    }),
  e('smith-squat', 'Smith machine squat', 'Benen', 'machine', ['smith squat', 'smith squats', 'smith machine squats'],
    'Zet je voeten iets voor de stang zodat je recht kunt zakken.',
    {
      a: st({ hr: [-4, 3] }),
      b: { hip: [36, 78], t: 35, hr: [-4, 3], f: [54, 96], f2: [52, 96] },
      props: [line([42, 2], [42, 96]), { k: 'bar', at: 'sh', d: [-3, 0] }],
      eh: [0, 1],
    }),
  e('leg-press', 'Leg press', 'Benen', 'machine', ['beenpers', 'legpress', 'leg presses', 'beenpress'],
    'Zet je voeten op heupbreedte en laat het platform zakken zonder dat je onderrug loskomt.',
    {
      a: { hip: [40, 80], t: -55, h: [38, 86], f: [70, 56] },
      b: { hip: [40, 80], t: -55, h: [38, 86], f: [54, 60] },
      props: [line([14, 52], [34, 86], 6), line([34, 86], [52, 86], 6), line([40, 86], [40, 96]), { k: 'pad', at: 'f', len: 22, ang: 45, d: [3, 3] }, line([66, 40], [96, 10])],
      kh: [0, -1],
    }),
  e('lunges', 'Lunges', 'Benen', 'dumbbell', ['lunge', 'uitvalspas', 'walking lunges', 'uitvalpas'],
    'Stap ver genoeg uit zodat je voorste knie boven je enkel blijft.',
    {
      a: st({ hr: [1, 25] }),
      b: { hip: [44, 76], t: 4, hr: [1, 25], f: [64, 96], f2: [24, 96] },
      props: [DB],
      kh: [1, 0.2],
    }),
  e('bulgarian-split-squat', 'Bulgarian split squat', 'Benen', 'dumbbell', ['split squat', 'bulgarian', 'bulgaarse split squat', 'bss'],
    'Je achterste voet ligt op de bank; zak recht omlaag op je voorste been.',
    {
      a: { hip: [44, 58], t: 0, hr: [1, 25], f: [56, 96], f2: [22, 68] },
      b: { hip: [42, 76], t: 10, hr: [1, 25], f: [58, 96], f2: [22, 68] },
      props: [line([6, 72], [28, 72], 5), line([16, 72], [16, 96]), DB],
    }),
  e('romanian-deadlift', 'Romanian deadlift', 'Benen', 'barbell', ['rdl', 'roemeense deadlift', 'stiff leg deadlift', 'romanian deadlifts'],
    'Duw je heupen naar achteren met licht gebogen knieën tot je een rek in je hamstrings voelt.',
    { a: st({ h: [50, 58] }), b: { hip: [40, 60], t: 75, h: [62, 80], f: [50, 96], f2: [48, 96] }, props: [BAR], eh: [0, 1] }),
  e('good-morning', 'Good morning', 'Benen', 'barbell', ['good mornings', 'goedemorgen'],
    'Stang op je rug, buig vanuit je heupen voorover met een rechte rug.',
    {
      a: st({ hr: [-4, 3] }),
      b: { hip: [40, 60], t: 78, hr: [-3, 4], f: [50, 96], f2: [48, 96] },
      props: [{ k: 'bar', at: 'sh', d: [-2, -2] }],
      eh: [0, 1],
    }),
  e('leg-extension', 'Leg extension', 'Benen', 'machine', ['leg extensions', 'beenstrekker', 'quad extension'],
    'Strek je benen volledig en laat het gewicht langzaam terugzakken.',
    {
      a: { hip: [36, 66], t: -8, h: [46, 70], f: [56, 88] },
      b: { hip: [36, 66], t: -8, h: [46, 70], f: [74, 68] },
      props: [line([28, 70], [52, 70], 6), line([28, 70], [24, 38], 6), line([36, 70], [36, 96]), { k: 'plate', at: 'f', r: 3, d: [0, 2] }],
      eh: [0, 1],
      kh: [1, -1],
    }),
  e('leg-curl', 'Leg curl', 'Benen', 'machine', ['lying leg curl', 'hamstring curl', 'beenbuiger', 'liggende leg curl'],
    'Houd je heupen op het kussen en krul je hielen richting je billen.',
    {
      a: { hip: [50, 70], t: -90, h: [18, 82], f: [88, 72] },
      b: { hip: [50, 70], t: -90, h: [18, 82], f: [64, 48] },
      props: [line([14, 75], [72, 75], 6), line([20, 75], [20, 96]), line([66, 75], [66, 96]), { k: 'plate', at: 'f', r: 3, d: [0, -2] }],
      eh: [0, 1],
      kh: [0.2, 1],
    }),
  e('seated-leg-curl', 'Seated leg curl', 'Benen', 'machine', ['zittende leg curl', 'seated hamstring curl', 'zittende beenbuiger'],
    'Duw het kussen met je hielen omlaag en onder de stoel.',
    {
      a: { hip: [36, 66], t: -8, h: [46, 70], f: [74, 68] },
      b: { hip: [36, 66], t: -8, h: [46, 70], f: [52, 90] },
      props: [line([28, 70], [52, 70], 6), line([28, 70], [24, 38], 6), line([36, 70], [36, 96]), { k: 'plate', at: 'f', r: 3, d: [0, -2] }],
      eh: [0, 1],
      kh: [1, -1],
    }),
  e('kuitheffen', 'Kuitheffen', 'Benen', 'machine', ['calf raise', 'calf raises', 'standing calf raise', 'kuiten'],
    'Laat je hielen diep zakken en kom zo hoog mogelijk op je tenen.',
    {
      a: { hip: [48, 58], t: 0, hr: [1, 25], f: [48, 94], ft: [55, 95] },
      b: { hip: [48, 53], t: 0, hr: [1, 25], f: [49, 89], ft: [55, 95] },
      props: [line([44, 96], [64, 96], 4), DB],
    }),
  e('kuitheffen-zittend', 'Kuitheffen zittend', 'Benen', 'machine', ['seated calf raise', 'seated calf raises', 'zittend kuitheffen'],
    'Zet het kussen op je knieën en duw je hielen zo hoog mogelijk.',
    {
      a: { hip: [32, 62], t: 0, h: [50, 60], f: [52, 88], ft: [59, 90] },
      b: { hip: [32, 58], t: 0, h: [50, 56], f: [52, 84], ft: [59, 90] },
      props: [line([22, 66], [44, 66], 6), line([30, 66], [30, 96]), line([44, 58], [60, 58], 5), line([50, 92], [66, 92], 4)],
      kh: [1, -1],
    }),

  // Billen
  e('hip-thrust', 'Hip thrust', 'Billen', 'barbell', ['hipthrust', 'hip thrusts', 'heupstoot', 'barbell hip thrust'],
    'Schouders op de bank, duw je heupen omhoog tot je romp en dijen één lijn zijn.',
    {
      a: { sh: [24, 62], t: -45, hr: [16, 14], f: [64, 96] },
      b: { sh: [24, 62], t: -80, hr: [24, 2], f: [64, 96] },
      props: [line([4, 66], [26, 66], 6), line([12, 66], [12, 96]), { k: 'bar', at: 'hip', d: [1, -7] }],
      kh: [0, -1],
    }),
  e('glute-bridge', 'Glute bridge', 'Billen', 'bodyweight', ['bridge', 'bilbrug', 'glute bridges', 'heupbrug'],
    'Duw je hielen in de vloer en knijp je billen aan bovenin.',
    {
      a: { sh: [22, 90], t: -86, h: [40, 95], f: [62, 96] },
      b: { sh: [22, 90], t: -65, h: [40, 95], f: [62, 96] },
      kh: [0, -1],
    }),
  e('kettlebell-swing', 'Kettlebell swing', 'Billen', 'kettlebell', ['kb swing', 'swing', 'kettlebell swings', 'swings'],
    'De kracht komt uit je heupen: schiet ze naar voren, je armen sturen alleen.',
    {
      a: { hip: [40, 60], t: 55, h: [54, 74], f: [52, 96], f2: [48, 96] },
      b: st({ h: [72, 28] }),
      props: [{ k: 'kb' }],
      eh: [0, 1],
    }),

  // Armen
  e('close-grip-bankdrukken', 'Close grip bankdrukken', 'Armen', 'barbell', ['close grip bench', 'close grip bench press', 'smal bankdrukken', 'cgbp'],
    'Pak de stang op schouderbreedte en houd je ellebogen dicht langs je lichaam.',
    { a: lie({ h: [37, 44] }), b: lie({ h: [40, 64] }), props: [...FLAT_BENCH, BAR], eh: [0.5, 1], kh: [0, -1] }),
  e('barbell-curl', 'Barbell curl', 'Armen', 'barbell', ['biceps curl', 'bicep curl', 'stang curl', 'curl'],
    'Houd je ellebogen stil langs je zij en krul de stang naar je schouders.',
    { a: st({ h: [50, 58] }), b: st({ h: [58, 36] }), props: [{ k: 'bar', r: 6 }], eh: [-1, 0.2] }),
  e('dumbbell-curl', 'Dumbbell curl', 'Armen', 'dumbbell', ['db curl', 'dumbbell biceps curl', 'dumbbell curls', 'bicep curls'],
    'Draai je pink tijdens het omhoog krullen iets naar buiten.',
    { a: st({ h: [50, 58] }), b: st({ h: [58, 36] }), props: [DB], eh: [-1, 0.2] }),
  e('hammer-curl', 'Hammer curl', 'Armen', 'dumbbell', ['hammer curls', 'hamer curl', 'neutral curl'],
    'Duimen omhoog, krul de dumbbells zonder je ellebogen naar voren te bewegen.',
    { a: st({ h: [50, 58] }), b: st({ h: [57, 35] }), props: [DB], eh: [-1, 0.2] }),
  e('preacher-curl', 'Preacher curl', 'Armen', 'barbell', ['preacher curls', 'scott curl', 'larry scott curl'],
    'Laat je arm bijna volledig strekken op het kussen voor je weer omhoog krult.',
    {
      a: { hip: [38, 68], t: 15, h: [70, 66], f: [58, 96] },
      b: { hip: [38, 68], t: 15, h: [58, 38], f: [58, 96] },
      props: [line([28, 72], [48, 72], 6), line([38, 72], [38, 96]), line([54, 44], [66, 62], 5), line([60, 54], [60, 96]), { k: 'bar', r: 5 }],
      eh: [1, 1],
    }),
  e('cable-curl', 'Cable curl', 'Armen', 'cable', ['kabel curl', 'cable biceps curl', 'cable curls'],
    'De kabel houdt spanning over de hele beweging, laat hem niet terugschieten.',
    { a: st({ h: [52, 58] }), b: st({ h: [58, 36] }), props: [{ k: 'cable', from: [72, 94] }, { k: 'pad', at: 'h', len: 10, ang: 90 }], eh: [-1, 0.2] }),
  e('triceps-pushdown', 'Triceps pushdown', 'Armen', 'cable', ['pushdown', 'tricep pushdown', 'triceps pushdowns', 'kabel pushdown'],
    'Ellebogen tegen je zij, strek je armen volledig naar beneden.',
    { a: st({ t: 8, h: [62, 40] }), b: st({ t: 8, h: [58, 60] }), props: [{ k: 'cable', from: [66, 2] }, { k: 'pad', at: 'h', len: 10, ang: 90 }], eh: [-0.3, 1] }),
  e('triceps-pushdown-touw', 'Triceps pushdown met touw', 'Armen', 'cable', ['rope pushdown', 'tricep rope pushdown', 'touw pushdown'],
    'Trek het touw onderin uit elkaar voor een volledige samentrekking.',
    { a: st({ t: 8, h: [62, 40] }), b: st({ t: 8, h: [58, 62] }), props: [{ k: 'cable', from: [66, 2] }, { k: 'pad', at: 'h', len: 7, ang: 0 }], eh: [-0.3, 1] }),
  e('overhead-triceps-extension', 'Overhead triceps extension', 'Armen', 'dumbbell', ['overhead extension', 'french press', 'tricep extension', 'overhead tricep'],
    'Houd je ellebogen naar voren gericht en laat het gewicht achter je hoofd zakken.',
    { a: st({ h: [40, 22] }), b: st({ h: [50, 7] }), props: [{ k: 'db', at: 'h' }], eh: [0.3, -1] }),
  e('skullcrusher', 'Skullcrusher', 'Armen', 'barbell', ['skull crusher', 'skullcrushers', 'lying triceps extension', 'french press liggend'],
    'Laat de stang vanuit je ellebogen naar je voorhoofd zakken, bovenarmen stil.',
    { a: lie({ h: [37, 44] }), b: lie({ h: [26, 56] }), props: [...FLAT_BENCH, { k: 'bar', r: 6 }], eh: [0.4, -1], kh: [0, -1] }),

  // Core
  e('crunch', 'Crunch', 'Core', 'bodyweight', ['crunches', 'buikspieroefening', 'buikcrunch'],
    'Rol je schouders van de vloer en adem uit bovenin; je onderrug blijft liggen.',
    { a: { hip: [54, 91], t: -84, hr: [5, -2], f: [72, 96] }, b: { hip: [54, 91], t: -58, hr: [5, -2], f: [72, 96] }, eh: [0, -1], kh: [0, -1] }),
  e('sit-up', 'Sit-up', 'Core', 'bodyweight', ['situp', 'sit ups', 'buikspieren'],
    'Kom met een bolle rug omhoog tot je rechtop zit en rol rustig terug.',
    { a: { hip: [54, 91], t: -86, hr: [4, 3], f: [74, 96] }, b: { hip: [54, 91], t: -8, hr: [4, 3], f: [74, 96] }, eh: [1, 0], kh: [0, -1] }),
  e('plank', 'Plank', 'Core', 'bodyweight', ['planken', 'forearm plank', 'planking'],
    'Duw je ellebogen in de grond en houd een rechte lijn van hoofd tot hielen.',
    { a: plank([28, 82], [92, 94], { h: [42, 95] }), b: plank([28, 80], [92, 94], { h: [42, 95] }), eh: [-1, 1] }),
  e('hanging-leg-raise', 'Hanging leg raise', 'Core', 'bodyweight', ['leg raise', 'hanging leg raises', 'hangend benen heffen'],
    'Hang stil en til je benen zonder te zwaaien tot minstens heuphoogte.',
    {
      a: { hip: [48, 60], t: 0, h: [50, 7], f: [48, 96], f2: [48, 96] },
      b: { hip: [48, 60], t: 0, h: [50, 7], f: [86, 54], f2: [86, 54] },
      props: [line([30, 6], [70, 6], 3), line([32, 6], [32, 96]), line([68, 6], [68, 96])],
      eh: [0, 0],
      kh: [1, 0.2],
    }),
  e('lying-leg-raise', 'Lying leg raise', 'Core', 'bodyweight', ['leg raises', 'liggend benen heffen', 'lying leg raises'],
    'Druk je onderrug in de vloer en laat je benen langzaam zakken.',
    { a: { hip: [50, 92], t: -90, h: [36, 95], f: [88, 94] }, b: { hip: [50, 92], t: -90, h: [36, 95], f: [54, 54] }, eh: [0, 1], kh: [1, 0] }),
  e('cable-crunch', 'Cable crunch', 'Core', 'cable', ['kabel crunch', 'kneeling cable crunch', 'cable crunches'],
    'Kniel, houd het touw bij je hoofd en krul je romp naar beneden.',
    {
      a: { hip: [50, 72], t: 20, hr: [4, -3], f: [34, 96], f2: [34, 96] },
      b: { hip: [50, 72], t: 75, hr: [4, -3], f: [34, 96], f2: [34, 96] },
      props: [{ k: 'cable', from: [80, 0] }],
      eh: [1, 1],
      kh: [1, 0.6],
    }),
  e('ab-wheel-rollout', 'Ab wheel rollout', 'Core', 'other', ['ab wheel', 'buikroller', 'rollout', 'ab roller'],
    'Rol vanuit je knieën naar voren zo ver je je onderrug recht kunt houden.',
    {
      a: { hip: [34, 74], t: 60, h: [60, 90], f: [18, 96], f2: [18, 96] },
      b: { hip: [46, 84], t: 82, h: [94, 90], f: [18, 96], f2: [18, 96] },
      props: [{ k: 'plate', at: 'h', r: 5, d: [0, 1] }],
      eh: [1, 0],
      kh: [1, 1],
    }),
  e('mountain-climbers', 'Mountain climbers', 'Core', 'bodyweight', ['mountain climber', 'bergbeklimmers', 'climbers'],
    'Houd je heupen laag en trek je knieën om en om snel naar je borst.',
    { a: mclimb([90, 94], [58, 86]), b: mclimb([58, 86], [90, 94]), eh: [-1, 0], kh: [0.3, 1] }),

  // Hele lichaam
  e('farmers-walk', "Farmer's walk", 'Hele lichaam', 'dumbbell', ['farmers walk', 'farmer walk', 'boerenwandeling', 'farmers carry'],
    'Loop rechtop met korte, snelle passen en houd je schouders laag.',
    {
      a: { hip: [50, 58], t: 0, hr: [1, 25], f: [40, 96], f2: [60, 96] },
      b: { hip: [50, 60], t: 0, hr: [1, 25], f: [60, 96], f2: [40, 96] },
      props: [DB],
    }),
  e('jumping-jacks', 'Jumping jacks', 'Hele lichaam', 'bodyweight', ['jumping jack', 'springende sterren', 'stersprongen'],
    'Spring je benen uit elkaar terwijl je je armen boven je hoofd zwaait.',
    { view: 'front', a: fr(58, [64, 58], [56, 96]), b: fr(55, [72, 10], [68, 94]), eh: [1, 0] }),
];

export const LIBRARY_BY_SLUG = new Map(LIBRARY.map((x) => [x.slug, x]));

/** Fallback animation for custom exercises, based on their muscle group. */
const FALLBACK: Record<Muscle, string> = {
  Borst: 'bankdrukken',
  Rug: 'barbell-row',
  Schouders: 'overhead-press',
  Benen: 'squat',
  Billen: 'hip-thrust',
  Armen: 'dumbbell-curl',
  Core: 'crunch',
  'Hele lichaam': 'jumping-jacks',
};

export function animFor(ex: { slug?: string; muscle: string }): Anim {
  const lib = ex.slug ? LIBRARY_BY_SLUG.get(ex.slug) : undefined;
  return (lib ?? LIBRARY_BY_SLUG.get(FALLBACK[ex.muscle as Muscle] ?? 'squat')!).anim;
}

/** Names used by the first version of the app, mapped to library slugs. */
export const LEGACY_NAMES: Record<string, string> = {
  'Bench Press': 'bankdrukken',
  'Incline Bench Press': 'incline-bankdrukken',
  'Dumbbell Bench Press': 'dumbbell-bankdrukken',
  'Incline Dumbbell Press': 'incline-dumbbell-press',
  'Chest Fly (Machine)': 'pec-deck',
  'Cable Crossover': 'cable-crossover',
  Dips: 'dips',
  'Push-up': 'push-up',
  Deadlift: 'deadlift',
  'Barbell Row': 'barbell-row',
  'Dumbbell Row': 'dumbbell-row',
  'Pull-up': 'pull-up',
  'Chin-up': 'chin-up',
  'Lat Pulldown': 'lat-pulldown',
  'Seated Cable Row': 'seated-cable-row',
  'T-Bar Row': 't-bar-row',
  'Overhead Press': 'overhead-press',
  'Dumbbell Shoulder Press': 'dumbbell-schouderpress',
  'Lateral Raise': 'lateral-raises',
  'Cable Lateral Raise': 'cable-lateral-raise',
  'Face Pull': 'face-pulls',
  'Rear Delt Fly': 'reverse-pec-deck',
  'Barbell Curl': 'barbell-curl',
  'Dumbbell Curl': 'dumbbell-curl',
  'Hammer Curl': 'hammer-curl',
  'Cable Curl': 'cable-curl',
  'Preacher Curl': 'preacher-curl',
  'Triceps Pushdown': 'triceps-pushdown',
  'Overhead Triceps Extension': 'overhead-triceps-extension',
  'Skull Crusher': 'skullcrusher',
  'Close-Grip Bench Press': 'close-grip-bankdrukken',
  Squat: 'squat',
  'Front Squat': 'front-squat',
  'Leg Press': 'leg-press',
  'Bulgarian Split Squat': 'bulgarian-split-squat',
  Lunges: 'lunges',
  'Leg Extension': 'leg-extension',
  'Leg Curl': 'leg-curl',
  'Romanian Deadlift': 'romanian-deadlift',
  'Hip Thrust': 'hip-thrust',
  'Standing Calf Raise': 'kuitheffen',
  'Seated Calf Raise': 'kuitheffen-zittend',
  Plank: 'plank',
  'Hanging Leg Raise': 'hanging-leg-raise',
  'Cable Crunch': 'cable-crunch',
  'Ab Wheel': 'ab-wheel-rollout',
};

/** Muscle groups of the first version mapped to the new ones. */
export const LEGACY_MUSCLES: Record<string, Muscle> = {
  Biceps: 'Armen',
  Triceps: 'Armen',
  Kuiten: 'Benen',
  Overig: 'Hele lichaam',
};
