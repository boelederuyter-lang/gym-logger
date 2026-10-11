import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../library/exercises';
import {
  normalizeSpeech,
  parseAlternatives,
  parseRest,
  parseUtterance,
  wordToNumber,
  type ParseContext,
} from '../voice/parse';

const exercises = LIBRARY.map((e, i) => ({ id: i + 1, name: e.name, aliases: e.aliases }));
const idOf = (name: string) => exercises.find((e) => e.name === name)!.id;
const ctx: ParseContext = { exercises, lastSet: { weight: 60, reps: 8 } };
const parse = (t: string) => parseUtterance(t, ctx);

describe('the example sentences', () => {
  it('8 reps 60 kilo tot falen', () => {
    expect(parse('8 reps 60 kilo tot falen')).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8, failure: true }] });
  });

  it('60 kg voor 8', () => {
    expect(parse('60 kg voor 8')).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8 }] });
  });

  it('acht keer zestig kilo', () => {
    expect(parse('acht keer zestig kilo')).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8 }] });
  });

  it('3 sets van 8 met 60', () => {
    expect(parse('3 sets van 8 met 60')).toEqual({
      type: 'sets',
      sets: [
        { weight: 60, reps: 8 },
        { weight: 60, reps: 8 },
        { weight: 60, reps: 8 },
      ],
    });
  });

  it('8, 8 en 7 met 60 kilo', () => {
    expect(parse('8, 8 en 7 met 60 kilo')).toEqual({
      type: 'sets',
      sets: [
        { weight: 60, reps: 8 },
        { weight: 60, reps: 8 },
        { weight: 60, reps: 7 },
      ],
    });
  });

  it('nog een', () => {
    expect(parse('nog een')).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8 }] });
  });

  it('plus 2,5 voor 6', () => {
    expect(parse('plus 2,5 voor 6')).toEqual({ type: 'sets', sets: [{ weight: 62.5, reps: 6 }] });
  });

  it('10 keer 62,5 RIR 2', () => {
    expect(parse('10 keer 62,5 RIR 2')).toEqual({ type: 'sets', sets: [{ weight: 62.5, reps: 10, rir: 2 }] });
  });

  it('rust anderhalve minuut', () => {
    expect(parse('rust anderhalve minuut')).toEqual({ type: 'rest', seconds: 90 });
  });

  it('voeg dips toe', () => {
    expect(parse('voeg dips toe')).toEqual({ type: 'addExercise', query: 'dips', exerciseId: idOf('Dips') });
  });

  it('bankdrukken 5 reps 80', () => {
    expect(parse('bankdrukken 5 reps 80')).toEqual({
      type: 'sets',
      exerciseId: idOf('Bankdrukken'),
      sets: [{ weight: 80, reps: 5 }],
    });
  });
});

describe('numbers', () => {
  it('reads Dutch number words', () => {
    expect(wordToNumber('vijfenveertig')).toBe(45);
    expect(wordToNumber('tweeentwintig')).toBe(22);
    expect(wordToNumber('honderd')).toBe(100);
    expect(wordToNumber('honderdentwintig')).toBe(120);
    expect(wordToNumber('honderdvijfentwintig')).toBe(125);
    expect(wordToNumber('tweehonderd')).toBe(200);
  });

  it('handles decimals in every spoken form', () => {
    expect(normalizeSpeech('62 komma 5 kilo')).toBe('62.5 kilo');
    expect(normalizeSpeech('62,5 kilo')).toBe('62.5 kilo');
    expect(normalizeSpeech('zestig en een half kilo')).toBe('60.5 kilo');
    expect(normalizeSpeech('Tweeëntwintig en een halve kilo')).toBe('22.5 kilo');
  });

  it('keeps "een" as an article unless a count follows', () => {
    expect(normalizeSpeech('nog een')).toBe('nog een');
    expect(normalizeSpeech('een set van acht')).toBe('1 set van 8');
  });
});

describe('weights and reps', () => {
  it('treats two bare numbers as weight (largest) and reps', () => {
    expect(parse('60 8')).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8 }] });
    expect(parse('60 x 8')).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8 }] });
  });

  it('uses "op" and "herhalingen"', () => {
    expect(parse('12 herhalingen op 20')).toEqual({ type: 'sets', sets: [{ weight: 20, reps: 12 }] });
  });

  it('applies deltas to the previous weight', () => {
    expect(parse('2,5 kilo erbij')).toEqual({ type: 'sets', sets: [{ weight: 62.5, reps: 8 }] });
    expect(parse('min 5 voor 10')).toEqual({ type: 'sets', sets: [{ weight: 55, reps: 10 }] });
  });

  it('repeats the previous set with "zelfde"', () => {
    expect(parse('zelfde')).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8 }] });
    expect(parseUtterance('nog een', { exercises })).toEqual({ type: 'unknown' });
  });
});

describe('effort', () => {
  it('reads RIR in several forms, only up to 5', () => {
    expect(parse('8 reps 60 kilo 2 over')).toMatchObject({ sets: [{ rir: 2 }] });
    expect(parse('8 reps 60 kilo 1 in reserve')).toMatchObject({ sets: [{ rir: 1 }] });
    expect(parse('8 reps 60 kilo rir 8')).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8 }] });
  });

  it('reads RPE and warm-up', () => {
    expect(parse('5 reps 100 kilo rpe 8,5')).toMatchObject({ sets: [{ rpe: 8.5 }] });
    expect(parse('warming-up 10 keer 20 kilo')).toMatchObject({ sets: [{ warmup: true, weight: 20, reps: 10 }] });
  });

  it('only marks the last of several sets', () => {
    expect(parse('8, 8 en 6 met 60 kilo tot falen')).toMatchObject({
      sets: [{ reps: 8 }, { reps: 8 }, { reps: 6, failure: true }],
    });
    const cmd = parse('8, 8 en 6 met 60 kilo tot falen');
    expect(cmd.type === 'sets' && cmd.sets[0].failure).toBeFalsy();
  });
});

describe('commands', () => {
  it('parses rest durations', () => {
    expect(parse('rust 2 minuten')).toEqual({ type: 'rest', seconds: 120 });
    expect(parse('rust 90')).toEqual({ type: 'rest', seconds: 90 });
    expect(parse('rust twee minuten dertig')).toEqual({ type: 'rest', seconds: 150 });
    expect(parseRest('rust 45 seconden')).toBe(45);
  });

  it('parses navigation and control', () => {
    expect(parse('stop timer')).toEqual({ type: 'stopTimer' });
    expect(parse('volgende oefening')).toEqual({ type: 'nextExercise' });
    expect(parse('vorige oefening')).toEqual({ type: 'prevExercise' });
    expect(parse('ongedaan maken')).toEqual({ type: 'undo' });
    expect(parse('stop met luisteren')).toEqual({ type: 'stopListening' });
  });

  it('selects an exercise when only its name is said', () => {
    expect(parse('bench')).toEqual({ type: 'selectExercise', exerciseId: idOf('Bankdrukken') });
    expect(parse('dumbbell bench')).toEqual({ type: 'selectExercise', exerciseId: idOf('Dumbbell bankdrukken') });
  });

  it('adds exercises by alias', () => {
    expect(parse('voeg lat pulldown toe')).toMatchObject({ exerciseId: idOf('Lat pulldown') });
    expect(parse('voeg de beenpers toe')).toMatchObject({ exerciseId: idOf('Leg press') });
  });

  it('returns unknown for chatter', () => {
    expect(parse('hallo daar')).toEqual({ type: 'unknown' });
  });
});

describe('alternatives', () => {
  it('picks the first alternative that yields something usable', () => {
    const r = parseAlternatives(['hallo daar', 'acht keer zestig kilo', 'acht keer'], ctx);
    expect(r.transcript).toBe('acht keer zestig kilo');
    expect(r.command).toEqual({ type: 'sets', sets: [{ weight: 60, reps: 8 }] });
  });
});
