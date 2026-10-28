import { describe, expect, it } from 'vitest';
import {
  adviseer,
  gaatAchteruit,
  hadDeload,
  herstelAdvies,
  herstelweek,
  maandagVan,
  wekenOpRij,
  setsTekst,
  vastgelopen,
  type OefInfo,
  type Sessie,
} from '../coach/progression';

const bank: OefInfo = {
  naam: 'Bankdrukken',
  reps: [8, 10],
  sets: 3,
  stap: 2.5,
  progressie: 'gewicht',
  alternatief: 'Dumbbell bankdrukken',
};
const pushup: OefInfo = {
  naam: 'Push-up',
  reps: [8, 20],
  sets: 3,
  stap: 2.5,
  progressie: 'reps',
  zwaarder: 'Decline push-up',
};
const plank: OefInfo = { naam: 'Plank', reps: [30, 60], sets: 3, stap: 2.5, progressie: 'reps', eenheid: 'sec' };

let dag = 0;
/** Sessie met gewicht en reps per set; nieuwste moet je zelf eerst zetten. */
const s = (gewicht: number | null, reps: number[], extra: Partial<Sessie> & { rpe?: number[] } = {}): Sessie => ({
  datum: ++dag,
  sets: reps.map((r, i) => ({ gewicht, reps: r, rpe: extra.rpe?.[i] })),
  advies: extra.advies,
  herstel: extra.herstel,
});

describe('setsTekst', () => {
  it('schrijft sets kort op', () => {
    expect(setsTekst([10, 10, 10])).toBe('3×10');
    expect(setsTekst([10, 9, 8])).toBe('10, 9 en 8');
    expect(setsTekst([45, 45], 'sec')).toBe('2×45 sec');
  });
});

describe('eerste keer', () => {
  it('gebruikt het startgewicht als dat er is', () => {
    const a = adviseer({ ...bank, startgewicht: 60 }, []);
    expect(a).toMatchObject({ soort: 'start', gewicht: 60, reps: [8, 8, 8] });
    expect(a.reden).toMatch(/Startgewicht 60 kg, berekend/);
    expect(adviseer({ ...bank, startgewicht: 16, perHand: true }, []).reden).toMatch(/16 kg per hand/);
  });

  it('legt uit hoe je een gewicht kiest zonder startgewicht', () => {
    const a = adviseer(bank, []);
    expect(a.gewicht).toBeNull();
    expect(a.reden).toBe('Eerste keer: kies een gewicht waarmee je 10 reps net haalt.');
  });
});

describe('dubbele progressie', () => {
  it('alle sets bovenin → +1 stap, reps terug naar onder', () => {
    const a = adviseer(bank, [s(60, [10, 10, 10])]);
    expect(a).toMatchObject({ soort: 'zwaarder', gewicht: 62.5, reps: [8, 8, 8] });
    expect(a.reden).toBe('Vorige keer 3×10 gehaald, dus +2,5 kg.');
  });

  it('niet alle sets bovenin → zelfde gewicht, 1 rep meer per set (max de top)', () => {
    const a = adviseer(bank, [s(60, [10, 9, 8])]);
    expect(a).toMatchObject({ soort: 'meer reps', gewicht: 60, reps: [10, 10, 9] });
    expect(a.reden).toBe('Vorige keer 10, 9 en 8 op 60 kg. Zelfde gewicht, probeer er per set 1 bij.');
  });

  it('te weinig sets gedaan telt niet als "alles bovenin"', () => {
    expect(adviseer(bank, [s(60, [10, 10])]).soort).toBe('meer reps');
  });

  it('gebruikt de stapgrootte van de oefening', () => {
    expect(adviseer({ ...bank, stap: 5 }, [s(100, [10, 10, 10])]).gewicht).toBe(105);
    expect(adviseer({ ...bank, stap: 2 }, [s(24, [10, 10, 10])]).gewicht).toBe(26);
  });
});

describe('onder de ondergrens', () => {
  it('houdt het gewicht gelijk', () => {
    const a = adviseer(bank, [s(60, [9, 8, 6])]);
    expect(a).toMatchObject({ soort: 'herhalen', gewicht: 60, reps: [8, 8, 8] });
    expect(a.reden).toMatch(/onder de 8 reps/);
  });
});

describe('vastlopen en deload', () => {
  it('telt sessies op hetzelfde gewicht zonder vooruitgang', () => {
    expect(vastgelopen([s(60, [9, 8, 8]), s(60, [9, 8, 8]), s(60, [9, 9, 8])])).toBe(2);
    expect(vastgelopen([s(60, [9, 9, 8]), s(60, [9, 8, 8])])).toBe(0); // vooruitgang
    expect(vastgelopen([s(60, [9, 8, 8]), s(57.5, [10, 10, 10])])).toBe(0); // ander gewicht
  });

  it('twee keer vast → 10% lichter, afgerond op de stap', () => {
    const a = adviseer(bank, [s(60, [9, 8, 8]), s(60, [9, 8, 8]), s(60, [9, 9, 8])]);
    expect(a).toMatchObject({ soort: 'deload', gewicht: 52.5, reps: [10, 10, 10] });
    expect(a.reden).toMatch(/2 keer op rij vastgezeten op 60 kg. Even 10% lichter \(52,5 kg\)/);
  });

  it('deload is altijd minstens één stap lichter', () => {
    expect(adviseer({ ...bank, stap: 5 }, [s(20, [9, 8, 8]), s(20, [9, 8, 8]), s(20, [9, 9, 8])]).gewicht).toBe(15);
  });

  it('één keer vast is nog geen deload', () => {
    expect(adviseer(bank, [s(60, [9, 8, 8]), s(60, [9, 8, 8])]).soort).toBe('meer reps');
  });

  it('herkent een eerdere deload', () => {
    expect(hadDeload([s(55, [10, 10, 10]), s(60, [9, 8, 8])])).toBe(true);
    expect(hadDeload([s(60, [10, 10, 10]), s(57.5, [10, 10, 10])])).toBe(false);
  });

  it('drie keer vast na een deload → ander repbereik of alternatief', () => {
    const h = [
      s(60, [9, 8, 8]),
      s(60, [9, 8, 8]),
      s(60, [9, 8, 8]),
      s(60, [9, 8, 8]),
      s(57.5, [10, 10, 10]),
      s(55, [10, 10, 10]),
      s(62.5, [8, 8, 7]),
    ];
    const a = adviseer(bank, h);
    expect(a.soort).toBe('wissel');
    expect(a.gewicht).toBe(60);
    expect(a.reden).toMatch(/ander repbereik \(bijv\. 6–8\) of wissel naar Dumbbell bankdrukken/);
  });

  it('herstelweken tellen niet mee als vastlopen', () => {
    expect(vastgelopen([s(60, [9, 8, 8]), s(60, [9, 8], { herstel: true }), s(60, [9, 9, 8])])).toBe(1);
  });
});

describe('RPE', () => {
  it('RPE 10 op de eerste set → niet zwaarder, ook al haalde je de top', () => {
    const a = adviseer(bank, [s(60, [10, 10, 10], { rpe: [10, 9, 9] })]);
    expect(a).toMatchObject({ soort: 'herhalen', gewicht: 60 });
    expect(a.reden).toMatch(/RPE 10/);
  });

  it('RPE 7 of lager op alle sets + top → extra stap', () => {
    const a = adviseer(bank, [s(60, [10, 10, 10], { rpe: [7, 7, 6] })]);
    expect(a).toMatchObject({ soort: 'zwaarder', gewicht: 65 });
    expect(a.reden).toMatch(/\+5 kg\. Het voelde licht/);
  });

  it('RPE 7 of lager zonder de top → toch een stap', () => {
    expect(adviseer(bank, [s(60, [9, 9, 9], { rpe: [7, 6, 7] })])).toMatchObject({ soort: 'zwaarder', gewicht: 62.5 });
  });

  it('ontbrekende RPE op één set → geen extra stap', () => {
    expect(adviseer(bank, [s(60, [10, 10, 10], { rpe: [7, 7] })]).gewicht).toBe(62.5);
  });
});

describe('lichaamsgewicht en tijd', () => {
  it('meer reps tot de top', () => {
    const a = adviseer(pushup, [s(null, [12, 10, 9])]);
    expect(a).toMatchObject({ soort: 'meer reps', gewicht: null, reps: [13, 11, 10] });
  });

  it('aan de top → zwaardere variant of extra gewicht', () => {
    const a = adviseer(pushup, [s(null, [20, 20, 20])]);
    expect(a.soort).toBe('variant');
    expect(a.reden).toBe('Je haalt 3×20. Tijd voor een zwaardere variant, zoals Decline push-up, of extra gewicht.');
  });

  it('op tijd: +5 sec', () => {
    const a = adviseer(plank, [s(null, [40, 35, 30])]);
    expect(a.reps).toEqual([45, 40, 35]);
    expect(a.reden).toMatch(/5 sec/);
  });

  it('eerste keer zonder gewicht', () => {
    expect(adviseer(pushup, []).reden).toBe('Eerste keer: doe 8 tot 20 nette reps per set.');
  });
});

describe('handmatige aanpassing gaat voor', () => {
  it('rekent verder vanaf wat je echt deed en zegt dat erbij', () => {
    const a = adviseer(bank, [s(65, [10, 10, 10], { advies: 62.5 })]);
    expect(a.gewicht).toBe(67.5);
    expect(a.reden).toMatch(/^Je koos zelf 65 kg; daar bouw ik op verder\. Vorige keer 3×10/);
  });

  it('zegt niets als je het advies volgde', () => {
    expect(adviseer(bank, [s(62.5, [10, 10, 10], { advies: 62.5 })]).reden).not.toMatch(/zelf/);
  });
});

describe('herstelweek', () => {
  it('na 5 trainingsweken of bij 3+ dalers', () => {
    expect(herstelweek({ wekenGetraind: 4, dalers: 2 }).actief).toBe(false);
    expect(herstelweek({ wekenGetraind: 5, dalers: 0 })).toMatchObject({ actief: true });
    expect(herstelweek({ wekenGetraind: 1, dalers: 3 }).reden).toMatch(/Bij 3 oefeningen/);
  });

  it('herkent achteruitgang via de geschatte 1RM', () => {
    expect(gaatAchteruit([s(60, [6, 6, 6]), s(60, [10, 10, 10])])).toBe(true);
    expect(gaatAchteruit([s(60, [10, 10, 9]), s(60, [10, 10, 10])])).toBe(false);
    expect(gaatAchteruit([s(60, [10, 10, 10])])).toBe(false);
  });

  it('minder sets, zelfde gewicht en reps als vorige keer', () => {
    const a = herstelAdvies({ ...bank, sets: 4 }, [s(60, [10, 9, 9, 8])]);
    expect(a).toMatchObject({ soort: 'herstel', gewicht: 60, reps: [10, 9] });
    expect(a.reden).toMatch(/2 in plaats van 4 sets/);
  });
});

describe('weken op rij', () => {
  const dagMs = 86400000;
  const nu = new Date(2026, 9, 28, 12).getTime(); // woensdag
  const wekenTerug = (n: number) => nu - n * 7 * dagMs;

  it('maandagVan geeft maandag 00:00', () => {
    const m = new Date(maandagVan(nu));
    expect(m.getDay()).toBe(1);
    expect(m.getHours()).toBe(0);
    expect(m.getDate()).toBe(26);
  });

  it('telt aaneengesloten trainingsweken vanaf vorige week', () => {
    expect(wekenOpRij([wekenTerug(1), wekenTerug(2), wekenTerug(3)], [], nu)).toBe(3);
    expect(wekenOpRij([nu, wekenTerug(1)], [], nu)).toBe(1); // deze week telt nog niet
  });

  it('een week overslaan of een herstelweek breekt de reeks', () => {
    expect(wekenOpRij([wekenTerug(1), wekenTerug(3), wekenTerug(4)], [], nu)).toBe(1);
    expect(wekenOpRij([wekenTerug(1), wekenTerug(2), wekenTerug(3)], [wekenTerug(2)], nu)).toBe(1);
  });
});
