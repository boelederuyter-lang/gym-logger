import { describe, expect, it } from 'vitest';
import { genereerSchema, pasWisselsToe, varianten, wisselOefening, type Invoer } from '../plan/generator';
import { parseShareHash, shareLink, type PlanState } from '../plan/store';

const invoer: Invoer = { doel: 'spiermassa', niveau: 'gevorderd', dagen: 4, tijd: 60, apparatuur: 'gym' };
const schema = genereerSchema(invoer, 42);

describe('varianten', () => {
  it('offers exercises with the same movement pattern that are not on that day yet', () => {
    const eerste = schema.dagen[0].oefeningen[0];
    const opties = varianten(schema, 0, 0);
    expect(opties.length).toBeGreaterThan(1);
    const opDag = new Set(schema.dagen[0].oefeningen.map((o) => o.id));
    for (const o of opties) {
      expect(o.patroon).toBe(eerste.patroon);
      expect(opDag.has(o.id)).toBe(false);
    }
  });

  it('only offers what your equipment allows', () => {
    const thuis = genereerSchema({ ...invoer, apparatuur: 'thuis' }, 42);
    for (const o of varianten(thuis, 0, 0)) expect(o.apparatuur).toBe('lichaamsgewicht');
  });

  it('returns nothing for a spot that does not exist', () => {
    expect(varianten(schema, 9, 0)).toEqual([]);
  });
});

describe('wisselOefening', () => {
  it('replaces the exercise and keeps its sets', () => {
    const nieuw = varianten(schema, 0, 0)[0];
    const voor = schema.dagen[0].oefeningen[0];
    const na = wisselOefening(schema, { dag: 0, index: 0, id: nieuw.id });
    expect(na.dagen[0].oefeningen[0].id).toBe(nieuw.id);
    expect(na.dagen[0].oefeningen[0].sets).toBe(voor.sets);
    expect(na.dagen[1]).toBe(schema.dagen[1]);
    expect(schema.dagen[0].oefeningen[0].id).toBe(voor.id); // pure
  });

  it('ignores unknown exercises', () => {
    expect(wisselOefening(schema, { dag: 0, index: 0, id: 'bestaat-niet' })).toBe(schema);
  });
});

describe('share links carry swaps', () => {
  it('round-trips seed, answers and swaps', () => {
    const w = { dag: 1, index: 2, id: varianten(schema, 1, 2)[0].id };
    const plan: PlanState = {
      versie: 1,
      invoer,
      schema: pasWisselsToe(schema, [w]),
      blok: 1,
      week: 1,
      gedaan: {},
      gestart: '',
      wissels: [w],
    };
    const link = shareLink(plan, 'https://example.com/gym-logger/');
    const parsed = parseShareHash(new URL(link).hash)!;
    expect(parsed.seed).toBe(42);
    expect(parsed.wissels).toEqual([w]);
    expect(pasWisselsToe(genereerSchema(parsed.invoer, parsed.seed), parsed.wissels)).toEqual(plan.schema);
  });

  it('still reads links without swaps', () => {
    expect(parseShareHash('#s=kracht.beginner.3.45.gym.7')?.wissels).toEqual([]);
  });
});
