// Parses one spoken (or typed) Dutch sentence into a workout command.
// Pure and synchronous so it can be unit-tested and reused by the text fallback.

export interface VoiceExercise {
  id: number;
  name: string;
  aliases: string[];
}

export interface ParseContext {
  exercises: VoiceExercise[];
  /** The last logged set, used for "nog een", "zelfde" and "plus 2,5". */
  lastSet?: { weight: number | null; reps: number | null };
}

export interface ParsedSet {
  weight: number | null;
  reps: number | null;
  failure?: boolean;
  warmup?: boolean;
  rir?: number;
  rpe?: number;
}

export type Command =
  | { type: 'sets'; exerciseId?: number; sets: ParsedSet[] }
  | { type: 'rest'; seconds: number }
  | { type: 'stopTimer' }
  | { type: 'nextExercise' }
  | { type: 'prevExercise' }
  | { type: 'addExercise'; query: string; exerciseId?: number }
  | { type: 'selectExercise'; exerciseId: number }
  | { type: 'undo' }
  | { type: 'stopListening' }
  | { type: 'unknown' };

// ---------- numbers ----------

const UNITS: Record<string, number> = {
  nul: 0,
  een: 1,
  twee: 2,
  drie: 3,
  vier: 4,
  vijf: 5,
  zes: 6,
  zeven: 7,
  acht: 8,
  negen: 9,
  tien: 10,
  elf: 11,
  twaalf: 12,
  dertien: 13,
  veertien: 14,
  vijftien: 15,
  zestien: 16,
  zeventien: 17,
  achttien: 18,
  negentien: 19,
};
const TENS: Record<string, number> = {
  twintig: 20,
  dertig: 30,
  veertig: 40,
  vijftig: 50,
  zestig: 60,
  zeventig: 70,
  tachtig: 80,
  negentig: 90,
};

/** "acht" → 8, "vijfenveertig" → 45, "honderdtwintig" → 120. */
export function wordToNumber(w: string): number | undefined {
  if (w in UNITS) return UNITS[w];
  if (w in TENS) return TENS[w];
  const h = w.indexOf('honderd');
  if (h >= 0) {
    const pre = w.slice(0, h);
    let post = w.slice(h + 7);
    if (post.startsWith('en') && wordToNumber(post.slice(2)) != null) post = post.slice(2); // honderdentwintig
    const mult = pre ? wordToNumber(pre) : 1;
    const rest = post ? wordToNumber(post) : 0;
    return mult == null || rest == null ? undefined : mult * 100 + rest;
  }
  const m = w.match(
    /^(een|twee|drie|vier|vijf|zes|zeven|acht|negen)en(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/,
  );
  if (m) return UNITS[m[1]] + TENS[m[2]];
  return undefined;
}

const WEIGHT_UNITS = new Set(['kilo', 'kilos', 'kg', 'kilogram']);
const REPS_UNITS = new Set(['reps', 'rep', 'keer', 'x', 'herhalingen', 'herhaling']);
const SET_UNITS = new Set(['sets', 'set', 'series', 'serie']);
const COUNT_WORDS = new Set([...WEIGHT_UNITS, ...REPS_UNITS, ...SET_UNITS, 'minuut', 'minuten']);

/** Lowercase, no accents, Dutch number words and decimals as digits. */
export function normalizeSpeech(text: string): string {
  let s = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2') // 62,5 → 62.5
    .replace(/(\d)\s*(x)\s*(?=\d)/g, '$1 x ') // 8x60 → 8 x 60
    .replace(/(\d)(kg|x)\b/g, '$1 $2') // 60kg → 60 kg
    .replace(/warming[\s-]?up|opwarm(set|en)?/g, 'warmingup')
    .replace(/[^a-z0-9.,\s]/g, ' ');

  const words = s.split(/\s+/).filter(Boolean);
  s = words
    .map((w, i) => {
      const bare = w.replace(/[.,]+$/, '');
      const suffix = w.slice(bare.length);
      // "een" is usually an article; only a number before a count word ("een set", "een rep")
      if (bare === 'een' && !COUNT_WORDS.has((words[i + 1] ?? '').replace(/[.,]+$/, ''))) return w;
      const n = wordToNumber(bare);
      return n == null ? w : `${n}${suffix}`;
    })
    .join(' ');

  return s
    .replace(/(\d+)\s+(komma|punt)\s+(\d+)/g, '$1.$3') // 62 komma 5
    .replace(/(\d+(?:\.\d+)?)\s+en\s+(een\s+)?(?:half|halve)\b/g, (_, n) => String(parseFloat(n) + 0.5)) // 60 en een half
    .replace(/\banderhalve?\b/g, '1.5')
    .replace(/\b(een\s+)?halve\s+(minuut)/g, '0.5 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- exercises ----------

interface Mention {
  exercise: VoiceExercise;
  start: number;
  end: number;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Longest exercise name or alias that appears as whole words in `text`. */
export function findExercise(text: string, exercises: VoiceExercise[]): Mention | undefined {
  const padded = ` ${text.replace(/[.,]/g, ' ')} `;
  let best: Mention | undefined;
  for (const exercise of exercises) {
    for (const label of [exercise.name, ...exercise.aliases]) {
      const n = norm(label);
      if (!n) continue;
      const at = padded.indexOf(` ${n} `);
      if (at >= 0 && (!best || n.length > best.end - best.start)) {
        best = { exercise, start: at, end: at + n.length };
      }
    }
  }
  return best;
}

function searchExercise(query: string, exercises: VoiceExercise[]): VoiceExercise | undefined {
  const q = norm(query);
  if (!q) return undefined;
  const exact = exercises.find((e) => [e.name, ...e.aliases].some((l) => norm(l) === q));
  if (exact) return exact;
  const mention = findExercise(q, exercises);
  if (mention) return mention.exercise;
  const words = q.split(' ');
  return exercises.find((e) => words.every((w) => norm([e.name, ...e.aliases].join(' ')).includes(w)));
}

// ---------- commands ----------

/** Rest duration in seconds from "rust 2 minuten 30", "rust 1.5 minuut", "rust 90". */
export function parseRest(s: string): number | undefined {
  const min = s.match(
    /(\d+(?:\.\d+)?)\s*(?:minuut|minuten|min)\b(?:\s*(?:en\s+)?(\d+)\s*(?:seconden|seconde|sec|s)?\b)?/,
  );
  if (min) return Math.round(parseFloat(min[1]) * 60 + (min[2] ? parseInt(min[2], 10) : 0));
  const sec = s.match(/(\d+)\s*(?:seconden|seconde|sec|s)\b/);
  if (sec) return parseInt(sec[1], 10);
  const bare = s.match(/rust\s+(\d+(?:\.\d+)?)/);
  if (bare) {
    const v = parseFloat(bare[1]);
    return Math.round(v <= 10 ? v * 60 : v);
  }
  return undefined;
}

type Role = 'weight' | 'reps' | 'sets' | 'rir' | 'rpe' | 'delta' | 'pair' | 'plain';
interface Num {
  v: number;
  role: Role;
  sign?: number;
}

const isNum = (t?: string) => t != null && /^\d+(\.\d+)?$/.test(t);

function classify(tokens: string[]): Num[] {
  const nums: Num[] = [];
  tokens.forEach((t, i) => {
    if (!isNum(t)) return;
    const v = parseFloat(t);
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const next2 = tokens[i + 2];
    const afterUnit = WEIGHT_UNITS.has(next ?? '') ? next2 : next;

    if (prev === 'rir') return void nums.push({ v, role: v <= 5 ? 'rir' : 'plain' });
    if (prev === 'rpe') return void nums.push({ v, role: 'rpe' });
    if (next === 'over' || (next === 'in' && next2 === 'reserve'))
      return void nums.push({ v, role: v <= 5 ? 'rir' : 'plain' });
    if (prev === 'plus' || afterUnit === 'erbij') return void nums.push({ v, role: 'delta', sign: 1 });
    if (prev === 'min' || prev === 'minus' || afterUnit === 'eraf' || afterUnit === 'minder')
      return void nums.push({ v, role: 'delta', sign: -1 });
    if (WEIGHT_UNITS.has(next ?? '')) return void nums.push({ v, role: 'weight' });
    // "10 keer 62,5" / "60 x 8": both bare, the larger one is the weight
    if (
      (next === 'x' || next === 'keer') &&
      isNum(next2) &&
      !WEIGHT_UNITS.has(tokens[i + 3] ?? '') &&
      !REPS_UNITS.has(tokens[i + 3] ?? '')
    )
      return void nums.push({ v, role: 'pair' });
    if (REPS_UNITS.has(next ?? '')) return void nums.push({ v, role: 'reps' });
    if (SET_UNITS.has(next ?? '')) return void nums.push({ v, role: 'sets' });
    if (prev === 'met' || prev === 'op') return void nums.push({ v, role: 'weight' });
    if (prev === 'voor' || prev === 'van') return void nums.push({ v, role: 'reps' });
    if ((prev === 'x' || prev === 'keer') && nums[nums.length - 1]?.role === 'pair')
      return void nums.push({ v, role: 'pair' });
    nums.push({ v, role: 'plain' });
  });
  return nums;
}

function parseSets(s: string, ctx: ParseContext): ParsedSet[] | undefined {
  const tokens = s.match(/\d+(?:\.\d+)?|[a-z]+/g) ?? [];
  const nums = classify(tokens);
  const repeat = /\b(nog een|nog eentje|nog 1|zelfde|hetzelfde|herhaal|again)\b/.test(s);

  let weight: number | null = nums.find((n) => n.role === 'weight')?.v ?? null;
  let reps: number[] = nums.filter((n) => n.role === 'reps').map((n) => n.v);
  const count = nums.find((n) => n.role === 'sets')?.v;
  const delta = nums.find((n) => n.role === 'delta');

  const pair = nums.filter((n) => n.role === 'pair').map((n) => n.v);
  if (pair.length === 2) {
    if (weight == null) weight = Math.max(...pair);
    if (!reps.length) reps = [Math.min(...pair)];
  }

  const plain = nums.filter((n) => n.role === 'plain').map((n) => n.v);
  if (plain.length) {
    if (weight == null && reps.length === 0) {
      if (plain.length === 1) {
        // A lone bare number: small whole numbers are reps, the rest is weight.
        if (plain[0] <= 30 && Number.isInteger(plain[0])) reps = [plain[0]];
        else weight = plain[0];
      } else {
        const max = Math.max(...plain);
        weight = max;
        const rest = [...plain];
        rest.splice(rest.indexOf(max), 1);
        reps = rest;
      }
    } else if (weight == null) {
      weight = Math.max(...plain);
    } else if (reps.length === 0) {
      reps = plain;
    }
  }

  const last = ctx.lastSet;
  if (delta) {
    weight = Math.round(((last?.weight ?? 0) + delta.sign! * delta.v) * 100) / 100;
    if (!reps.length && last?.reps != null) reps = [last.reps];
  }
  if (repeat && last) {
    weight ??= last.weight;
    if (!reps.length && last.reps != null) reps = [last.reps];
  }

  const failure = /\b(tot )?falen\b|\bfailure\b/.test(s);
  const warmup = /\bwarmingup\b/.test(s);
  const rir = nums.find((n) => n.role === 'rir')?.v;
  const rpe = nums.find((n) => n.role === 'rpe')?.v;

  if (weight == null && reps.length === 0) return undefined;

  let sets: ParsedSet[] = (reps.length ? reps : [null]).map((r) => ({
    weight,
    reps: r == null ? null : Math.round(r),
  }));
  if (count && count > 1 && sets.length === 1)
    sets = Array.from({ length: Math.min(count, 10) }, () => ({ ...sets[0] }));

  // Effort only applies to the last set.
  const lastSet = sets[sets.length - 1];
  if (failure) lastSet.failure = true;
  if (warmup) lastSet.warmup = true;
  if (rir != null) lastSet.rir = rir;
  if (rpe != null) lastSet.rpe = rpe;
  return sets;
}

export function parseUtterance(text: string, ctx: ParseContext): Command {
  const s = normalizeSpeech(text);
  if (!s) return { type: 'unknown' };

  if (/\bstop(pen)? (met )?luisteren\b|\bniet meer luisteren\b/.test(s)) return { type: 'stopListening' };
  if (/\bongedaan\b|\bundo\b|^terug$|\bvorige set weg\b/.test(s)) return { type: 'undo' };
  if (/\b(stop|skip|stopt?) (de )?timer\b|\btimer (stop|uit)\b|\brust overslaan\b|\bskip rust\b/.test(s))
    return { type: 'stopTimer' };
  if (/\bvolgende oefening\b|^(ga naar )?(de )?volgende$/.test(s)) return { type: 'nextExercise' };
  if (/\bvorige oefening\b|^(ga naar )?(de )?vorige$/.test(s)) return { type: 'prevExercise' };

  const add = s.match(/\bvoeg (.+?) toe\b/) ?? s.match(/^(.+?) toevoegen$/);
  if (add) {
    const query = add[1].replace(/^(de|het|een)\s+/, '').trim();
    return { type: 'addExercise', query, exerciseId: searchExercise(query, ctx.exercises)?.id };
  }

  if (/\brust\b/.test(s) && !/\b(kilo|kg|reps|keer|set|sets)\b/.test(s)) {
    const seconds = parseRest(s);
    if (seconds && seconds > 0) return { type: 'rest', seconds };
  }

  const mention = findExercise(s, ctx.exercises);
  const rest = mention ? `${s.slice(0, Math.max(0, mention.start - 1))} ${s.slice(mention.end)}` : s;
  const sets = parseSets(rest, ctx);
  if (sets) return { type: 'sets', exerciseId: mention?.exercise.id, sets };
  if (mention && !/\d/.test(rest)) return { type: 'selectExercise', exerciseId: mention.exercise.id };
  return { type: 'unknown' };
}

/** Picks the first recognition alternative that yields a usable command. */
export function parseAlternatives(alternatives: string[], ctx: ParseContext): { command: Command; transcript: string } {
  for (const t of alternatives) {
    const command = parseUtterance(t, ctx);
    if (command.type !== 'unknown' && !(command.type === 'addExercise' && command.exerciseId == null))
      return { command, transcript: t };
  }
  return { command: parseUtterance(alternatives[0] ?? '', ctx), transcript: alternatives[0] ?? '' };
}
