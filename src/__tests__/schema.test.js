// Tests voor de trainingsschema-generator (public/schema). Plain JS, want de generator
// is vanilla JS zonder build-stap.
import { describe, expect, it } from 'vitest';
import { OEFENINGEN, CARDIO, BESCHIKBAAR, APPARATUUR } from '../../public/schema/js/exercises.js';
import {
  APPARATUUR_KEUZES,
  DAGEN,
  DOELEN,
  MIN_OEFENINGEN,
  NIVEAUS,
  TIJDEN,
  genereerSchema,
  normaliseerInvoer,
  schatMinuten,
  weekSchema,
} from '../../public/schema/js/generator.js';

const SEEDS = Array.from({ length: 15 }, (_, i) => i * 7919 + 1);

const combinaties = [];
for (const doel of Object.keys(DOELEN))
  for (const niveau of Object.keys(NIVEAUS))
    for (const dagen of DAGEN)
      for (const tijd of TIJDEN)
        for (const apparatuur of Object.keys(APPARATUUR_KEUZES)) combinaties.push({ doel, niveau, dagen, tijd, apparatuur });

const byId = new Map(OEFENINGEN.map((o) => [o.id, o]));
const sleutel = (dag) => dag.oefeningen.map((o) => o.id).sort().join('|');

describe('oefeningendatabase', () => {
  it('heeft unieke ids en alle verplichte velden', () => {
    expect(new Set(OEFENINGEN.map((o) => o.id)).size).toBe(OEFENINGEN.length);
    for (const o of OEFENINGEN) {
      expect(o.naam, o.id).toBeTruthy();
      expect(o.spiergroep, o.id).toBeTruthy();
      expect(o.tip.length, o.id).toBeGreaterThan(20);
      expect(Object.keys(APPARATUUR), o.id).toContain(o.apparatuur);
      expect(['compound', 'isolatie'], o.id).toContain(o.type);
      expect(['boven', 'onder', 'core'], o.id).toContain(o.deel);
      if (o.niveau) expect(['beginner', 'gevorderd'], o.id).toContain(o.niveau);
    }
  });
});

describe('generator: alle combinaties', () => {
  it(`dekt ${combinaties.length} combinaties`, () => {
    expect(combinaties.length).toBe(4 * 2 * 4 * 4 * 3);
  });

  for (const invoer of combinaties) {
    const naam = `${invoer.doel} · ${invoer.niveau} · ${invoer.dagen} dagen · ${invoer.tijd} min · ${invoer.apparatuur}`;
    it(naam, () => {
      for (const seed of SEEDS) {
        const schema = genereerSchema(invoer, seed);
        expect(schema.dagen).toHaveLength(invoer.dagen);

        const sleutels = new Set();
        for (const dag of schema.dagen) {
          const ctx = `${naam} · seed ${seed} · ${dag.naam}`;
          const ids = dag.oefeningen.map((o) => o.id);

          // Nooit leeg, nooit dubbele oefeningen binnen een training.
          expect(ids.length, ctx).toBeGreaterThanOrEqual(MIN_OEFENINGEN);
          expect(new Set(ids).size, ctx).toBe(ids.length);

          // Alleen oefeningen die bij apparatuur en niveau passen.
          for (const id of ids) {
            const o = byId.get(id);
            expect(BESCHIKBAAR[invoer.apparatuur], `${ctx} · ${id}`).toContain(o.apparatuur);
            if (o.niveau) expect(o.niveau, `${ctx} · ${id}`).toBe(invoer.niveau);
          }

          // Compound-oefeningen eerst.
          const types = dag.oefeningen.map((o) => o.type);
          const eersteIsolatie = types.indexOf('isolatie');
          if (eersteIsolatie >= 0) expect(types.slice(eersteIsolatie), ctx).not.toContain('compound');
          expect(types[0], ctx).toBe('compound');

          for (const o of dag.oefeningen) {
            expect(o.sets, ctx).toBeGreaterThanOrEqual(2);
            if (invoer.niveau === 'beginner') expect(o.sets, ctx).toBeLessThanOrEqual(3);
            expect(o.rust, ctx).toBeGreaterThan(0);
          }

          // Past binnen de tijd, tenzij het minimum al bereikt is.
          const budget = invoer.tijd === 75 ? 80 : invoer.tijd;
          const opMinimum = ids.length === MIN_OEFENINGEN && dag.oefeningen.every((o) => o.sets === 2);
          const cardioMinuten = dag.cardio?.minuten ?? 0;
          if (!opMinimum) expect(schatMinuten(dag.oefeningen) + cardioMinuten, ctx).toBeLessThanOrEqual(budget);

          // Cardio alleen bij vetverlies, passend bij apparatuur en niveau.
          if (invoer.doel === 'vetverlies') {
            const c = CARDIO.find((x) => x.id === dag.cardio?.id);
            expect(c, ctx).toBeTruthy();
            expect(BESCHIKBAAR[invoer.apparatuur], ctx).toContain(c.apparatuur);
            expect(c.soorten, ctx).toContain(dag.cardio.soort);
            if (invoer.niveau === 'beginner') expect(dag.cardio.soort, ctx).toBe('rustig');
            expect(dag.cardio.minuten, ctx).toBeGreaterThanOrEqual(8);
          } else {
            expect(dag.cardio, ctx).toBeNull();
          }

          sleutels.add(sleutel(dag));
        }
        // Nooit twee identieke trainingen in één schema.
        expect(sleutels.size, `${naam} · seed ${seed}`).toBe(invoer.dagen);
      }
    });
  }
});

describe('generator: schema-regels', () => {
  const basis = { doel: 'spiermassa', niveau: 'gevorderd', dagen: 4, tijd: 60, apparatuur: 'gym' };

  it('kiest de split op basis van het aantal dagen', () => {
    expect(genereerSchema({ ...basis, dagen: 2 }, 1).dagen.map((d) => d.naam)).toEqual(['Full body A', 'Full body B']);
    expect(genereerSchema({ ...basis, dagen: 3 }, 1).split).toBe('Full body');
    expect(genereerSchema({ ...basis, dagen: 4 }, 1).dagen.map((d) => d.naam)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B']);
    expect(genereerSchema({ ...basis, dagen: 5 }, 1).dagen.map((d) => d.naam)).toEqual(['Push', 'Pull', 'Legs', 'Upper B', 'Lower B']);
  });

  it('gebruikt reps en rust per doel', () => {
    const compound = (doel) => genereerSchema({ ...basis, doel }, 3).dagen[0].oefeningen[0];
    expect(compound('kracht').reps).toEqual([4, 6]);
    expect(compound('spiermassa').reps).toEqual([8, 12]);
    expect(compound('fitheid').reps).toEqual([12, 15]);
    expect(compound('kracht').rust).toBeGreaterThan(compound('spiermassa').rust);
    expect(compound('spiermassa').rust).toBeGreaterThan(compound('fitheid').rust);
  });

  it('geeft beginners minder volume dan gevorderden', () => {
    for (const tijd of TIJDEN) {
      const totaal = (niveau) =>
        genereerSchema({ ...basis, tijd, niveau }, 5).dagen.reduce((s, d) => s + d.oefeningen.reduce((t, o) => t + o.sets, 0), 0);
      // Bij 30 minuten is de tijd voor beide niveaus de beperkende factor.
      if (tijd === 30) expect(totaal('beginner')).toBeLessThanOrEqual(totaal('gevorderd'));
      else expect(totaal('beginner')).toBeLessThan(totaal('gevorderd'));
    }
  });

  it('geeft meer oefeningen bij meer tijd', () => {
    const aantal = (tijd) => genereerSchema({ ...basis, tijd }, 9).dagen[0].oefeningen.length;
    expect(aantal(30)).toBeLessThan(aantal(60));
    expect(aantal(60)).toBeLessThanOrEqual(aantal(75));
  });

  it('is deterministisch per seed en varieert tussen seeds', () => {
    expect(genereerSchema(basis, 123)).toEqual(genereerSchema(basis, 123));
    const varianten = new Set(SEEDS.map((s) => genereerSchema(basis, s).dagen.map(sleutel).join('#')));
    expect(varianten.size).toBeGreaterThan(5);
  });

  it('weigert ongeldige invoer', () => {
    expect(normaliseerInvoer({ ...basis, dagen: 6 })).toBeNull();
    expect(normaliseerInvoer({ ...basis, apparatuur: 'kettlebell' })).toBeNull();
    expect(() => genereerSchema({ ...basis, doel: 'x' }, 1)).toThrow();
    expect(normaliseerInvoer({ ...basis, dagen: '3', tijd: '45' })).toEqual({ ...basis, dagen: 3, tijd: 45 });
  });
});

describe('progressie over 4 weken', () => {
  const schema = genereerSchema({ doel: 'spiermassa', niveau: 'gevorderd', dagen: 3, tijd: 60, apparatuur: 'thuis' }, 77);
  const [w1, w2, w3, w4] = [1, 2, 3, 4].map((w) => weekSchema(schema, w));

  it('houdt elke week dezelfde oefeningen', () => {
    for (const w of [w2, w3, w4]) expect(w.map(sleutel)).toEqual(w1.map(sleutel));
  });

  it('week 2: +1 rep per set (of +5 sec)', () => {
    w1.forEach((dag, d) =>
      dag.oefeningen.forEach((o, i) => {
        const stap = o.eenheid === 'sec' ? 5 : 1;
        expect(w2[d].oefeningen[i].reps).toEqual([o.reps[0] + stap, o.reps[1] + stap]);
        expect(w2[d].oefeningen[i].sets).toBe(o.sets);
      }),
    );
  });

  it('week 3: reps terug naar week 1 met gewichtsadvies', () => {
    const gym = weekSchema(genereerSchema({ doel: 'kracht', niveau: 'gevorderd', dagen: 4, tijd: 60, apparatuur: 'gym' }, 4), 3);
    for (const dag of gym)
      for (const o of dag.oefeningen) {
        if (o.zonderGewicht) continue;
        expect(o.advies).toBe(o.deel === 'onder' ? '+5 kg' : '+2,5 kg');
      }
    w1.forEach((dag, d) => dag.oefeningen.forEach((o, i) => expect(w3[d].oefeningen[i].reps).toEqual(o.reps)));
    expect(w3[0].oefeningen.every((o) => o.advies)).toBe(true);
  });

  it('week 4: deload met ongeveer 40% minder sets', () => {
    const sets = (w) => w.reduce((s, d) => s + d.oefeningen.reduce((t, o) => t + o.sets, 0), 0);
    const verhouding = sets(w4) / sets(w1);
    expect(verhouding).toBeGreaterThan(0.45);
    expect(verhouding).toBeLessThan(0.75);
    for (const dag of w4) for (const o of dag.oefeningen) expect(o.sets).toBeGreaterThanOrEqual(1);
  });
});

describe('cardio bij vetverlies', () => {
  const invoer = { doel: 'vetverlies', niveau: 'gevorderd', dagen: 5, tijd: 60, apparatuur: 'gym' };
  const schema = genereerSchema(invoer, 11);
  const weken = [1, 2, 3, 4].map((w) => weekSchema(schema, w));

  it('maximaal twee intervaltrainingen per week voor gevorderden', () => {
    expect(schema.dagen.filter((d) => d.cardio.soort === 'interval').length).toBe(2);
  });

  it('kiest in de gym een cardiomachine en varieert tussen dagen', () => {
    expect(schema.dagen.every((d) => CARDIO.find((c) => c.id === d.cardio.id).apparatuur === 'machine')).toBe(true);
    expect(new Set(schema.dagen.map((d) => d.cardio.id)).size).toBeGreaterThan(2);
  });

  it('volgt dezelfde opbouw over het blok', () => {
    schema.dagen.forEach((dag, d) => {
      const [w1, w2, w3, w4] = weken.map((w) => w[d].cardio);
      if (dag.cardio.soort === 'rustig') {
        expect(w2.minuten).toBe(w1.minuten + 2);
        expect(w3.minuten).toBe(w1.minuten);
      } else {
        expect(w2.rondes).toBe(w1.rondes + 1);
        expect(w3.rondes).toBe(w1.rondes);
        expect(w3.werk).toBeGreaterThan(w1.werk);
      }
      expect(w4.minuten).toBeLessThan(w1.minuten);
      expect(w1.uitleg).toBeTruthy();
      expect(weken[0][d].minuten).toBe(schatMinuten(weken[0][d].oefeningen) + w1.minuten);
    });
  });
});
