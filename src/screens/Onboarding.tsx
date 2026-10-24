import { useState } from 'react';
import { Choices } from '../components/Choices';
import { Icon } from '../components/Icon';
import { GEWRICHTEN, MATERIALEN, SPIERGROEPEN, type Materiaal, type MateriaalKeuze } from '../coach/exercises';
import {
  BASISLIFTS,
  controleer,
  DAG_KORT,
  DOEL_TEKST,
  DOELEN,
  kiesMateriaal,
  leesGetal,
  LIFT_NAAM,
  MATERIAAL_TEKST,
  MAX_PRIORITEIT,
  NIVEAU_TEKST,
  OPTIONEEL,
  samenvatting,
  standaardDagen,
  standaardProfiel,
  STAPPEN,
  TIJDEN,
  voortgang,
  wisselDag,
  wisselMateriaal,
  wisselPrioriteit,
  type Basislift,
  type Profiel,
  type Stap,
} from '../coach/profile';
import { NIVEAUS } from '../coach/exercises';

interface Props {
  initial?: Profiel;
  /** Editing an existing profile: start at the summary and return there after each question. */
  editing?: boolean;
  onClose?: () => void;
  onDone: (profiel: Profiel) => void;
}

const TITELS: Record<Stap, [string, string]> = {
  doel: ['Wat is je doel?', 'Hierop stem ik je reps en sets af.'],
  niveau: ['Hoe lang train je al?', 'Zo kies ik oefeningen die bij je passen.'],
  dagen: ['Hoeveel dagen per week?', 'Tik de dagen aan waarop je traint.'],
  tijd: ['Hoeveel tijd per training?', 'Inclusief rust, zonder omkleden.'],
  materiaal: ['Waar train je?', 'Ik kies alleen oefeningen die je kunt doen.'],
  prioriteit: ['Wil je iets extra trainen?', `Optioneel. Kies hoogstens ${MAX_PRIORITEIT} spiergroepen.`],
  blessures: ['Heb je ergens last van?', 'Optioneel. Ik ontzie die plekken.'],
  kracht: ['Hoe sterk ben je nu?', 'Optioneel. Dan kan ik je startgewichten voorstellen.'],
  samenvatting: ['Klopt dit?', 'Tik op een regel om iets aan te passen.'],
};

const MATERIAAL_LABEL: Record<Materiaal, string> = {
  stang: 'Stang',
  dumbbells: 'Dumbbells',
  machine: 'Machines',
  kabel: 'Kabels',
  lichaamsgewicht: 'Lichaamsgewicht',
  bank: 'Bank',
  rek: 'Rek of optrekstang',
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function Onboarding({ initial, editing = false, onClose, onDone }: Props) {
  const [p, setP] = useState<Profiel>(initial ?? standaardProfiel());
  const [stap, setStap] = useState<Stap>(editing ? 'samenvatting' : 'doel');
  const [terugNaarOverzicht, setTerugNaarOverzicht] = useState(editing);
  const index = STAPPEN.indexOf(stap);
  const fout = stap === 'dagen' || stap === 'samenvatting' ? controleer(p) : null;

  function volgende() {
    if (fout) return;
    if (stap === 'samenvatting') return onDone(p);
    setStap(terugNaarOverzicht ? 'samenvatting' : STAPPEN[index + 1]);
    window.scrollTo({ top: 0 });
  }

  function terug() {
    if (terugNaarOverzicht && stap !== 'samenvatting') setStap('samenvatting');
    else if (index > 0) setStap(STAPPEN[index - 1]);
    else onClose?.();
  }

  function openStap(s: Stap) {
    setTerugNaarOverzicht(true);
    setStap(s);
  }

  const leeg =
    (stap === 'prioriteit' && p.prioriteit.length === 0) ||
    (stap === 'blessures' && p.blessures.length === 0) ||
    (stap === 'kracht' && Object.keys(p.kracht).length === 0 && !p.lichaamsgewicht);
  const knop =
    stap === 'samenvatting'
      ? editing
        ? 'Bewaar en maak nieuw schema'
        : 'Maak mijn schema'
      : terugNaarOverzicht
        ? 'Klaar'
        : OPTIONEEL.includes(stap) && leeg
          ? 'Overslaan'
          : 'Volgende';

  const [titel, uitleg] = TITELS[stap];

  return (
    <div className="onboarding" role="dialog" aria-label="Vragenlijst">
      <header className="onboarding-top">
        <button
          className="icon-btn"
          onClick={terug}
          aria-label="Terug"
          disabled={index === 0 && !onClose}
          style={{ visibility: index === 0 && !onClose ? 'hidden' : undefined }}
        >
          <Icon name="back" />
        </button>
        <div className="progress-track" aria-label={`Vraag ${index + 1} van ${STAPPEN.length}`}>
          <div className="progress-fill" style={{ width: `${voortgang(stap) * 100}%` }} />
        </div>
        {onClose ? (
          <button className="link" onClick={onClose}>
            Sluiten
          </button>
        ) : (
          <span />
        )}
      </header>

      <main className="onboarding-body" key={stap}>
        <h1>{titel}</h1>
        <p className="muted">{uitleg}</p>

        {stap === 'doel' && (
          <Choices
            label="Doel"
            columns={1}
            value={p.doel}
            onChange={(doel) => setP({ ...p, doel })}
            options={DOELEN.map((d) => [d, ...DOEL_TEKST[d]])}
          />
        )}

        {stap === 'niveau' && (
          <Choices
            label="Ervaring"
            columns={1}
            value={p.niveau}
            onChange={(niveau) => setP({ ...p, niveau })}
            options={NIVEAUS.map((n) => [n, ...NIVEAU_TEKST[n]])}
          />
        )}

        {stap === 'dagen' && (
          <>
            <Choices
              label="Aantal dagen"
              columns={5}
              value={p.dagen.length}
              onChange={(n) => setP({ ...p, dagen: standaardDagen(n) })}
              options={[2, 3, 4, 5, 6].map((n) => [n, String(n), 'dagen'])}
            />
            <div className="weekdays" role="group" aria-label="Welke dagen">
              {DAG_KORT.map((d, i) => (
                <button
                  key={d}
                  className={`weekday ${p.dagen.includes(i) ? 'active' : ''}`}
                  aria-pressed={p.dagen.includes(i)}
                  onClick={() => setP({ ...p, dagen: wisselDag(p.dagen, i) })}
                >
                  {d}
                </button>
              ))}
            </div>
            {fout && <p className="form-error">{fout}</p>}
          </>
        )}

        {stap === 'tijd' && (
          <Choices
            label="Tijd per training"
            columns={5}
            value={p.tijd}
            onChange={(tijd) => setP({ ...p, tijd })}
            options={TIJDEN.map((t) => [t, String(t), 'min'])}
          />
        )}

        {stap === 'materiaal' && (
          <>
            <Choices<MateriaalKeuze | 'zelf'>
              label="Materiaal"
              columns={1}
              value={p.materiaalKeuze}
              onChange={(k) => setP(kiesMateriaal(p, k))}
              options={[
                ...(Object.keys(MATERIAAL_TEKST) as MateriaalKeuze[]).map(
                  (k) => [k, ...MATERIAAL_TEKST[k]] as [MateriaalKeuze, string, string],
                ),
                ['zelf', 'Zelf aanvinken', 'Kies precies wat er is'],
              ]}
            />
            {p.materiaalKeuze === 'zelf' && (
              <div className="chips wrap">
                {MATERIALEN.map((m) => (
                  <button
                    key={m}
                    className={`chip ${p.materiaal.includes(m) ? 'active' : ''}`}
                    aria-pressed={p.materiaal.includes(m)}
                    disabled={m === 'lichaamsgewicht'}
                    onClick={() => setP(wisselMateriaal(p, m))}
                  >
                    {MATERIAAL_LABEL[m]}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {stap === 'prioriteit' && (
          <div className="chips wrap big-chips">
            {SPIERGROEPEN.map((g) => (
              <button
                key={g}
                className={`chip ${p.prioriteit.includes(g) ? 'active' : ''}`}
                aria-pressed={p.prioriteit.includes(g)}
                onClick={() => setP({ ...p, prioriteit: wisselPrioriteit(p.prioriteit, g) })}
              >
                {cap(g)}
              </button>
            ))}
          </div>
        )}

        {stap === 'blessures' && (
          <>
            <div className="chips wrap big-chips">
              {GEWRICHTEN.map((g) => (
                <button
                  key={g}
                  className={`chip ${p.blessures.includes(g) ? 'active' : ''}`}
                  aria-pressed={p.blessures.includes(g)}
                  onClick={() =>
                    setP({
                      ...p,
                      blessures: p.blessures.includes(g) ? p.blessures.filter((x) => x !== g) : [...p.blessures, g],
                    })
                  }
                >
                  {cap(g)}
                </button>
              ))}
            </div>
            <p className="disclaimer">
              Deze app vervangt geen fysiotherapeut of arts. Heb je pijn die niet weggaat, laat het dan onderzoeken
              voordat je zwaar gaat trainen.
            </p>
          </>
        )}

        {stap === 'kracht' && <KrachtVragen p={p} onChange={setP} />}

        {stap === 'samenvatting' && (
          <>
            <div className="summary-list">
              {samenvatting(p).map((r) => (
                <button key={r.label} className="summary-row" onClick={() => openStap(r.stap)}>
                  <span>{r.label}</span>
                  <strong>{r.waarde}</strong>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
            {fout && <p className="form-error">{fout}</p>}
          </>
        )}
      </main>

      <footer className="onboarding-footer">
        <button className="btn primary block big" onClick={volgende} disabled={!!fout}>
          {knop}
        </button>
      </footer>
    </div>
  );
}

/** Three base lifts (weight × reps) and bodyweight. Comma and point both work. */
function KrachtVragen({ p, onChange }: { p: Profiel; onChange: (p: Profiel) => void }) {
  const tekst = (n?: number) => (n == null ? '' : String(n).replace('.', ','));
  const [velden, setVelden] = useState(
    () =>
      Object.fromEntries(
        BASISLIFTS.flatMap((l) => [
          [`${l}-kg`, tekst(p.kracht[l]?.kg)],
          [`${l}-reps`, tekst(p.kracht[l]?.reps)],
        ]).concat([['gewicht', tekst(p.lichaamsgewicht)]]),
      ) as Record<string, string>,
  );

  function zet(veld: string, waarde: string) {
    const next = { ...velden, [veld]: waarde };
    setVelden(next);
    const kracht: Profiel['kracht'] = {};
    for (const l of BASISLIFTS) {
      const kg = leesGetal(next[`${l}-kg`]);
      const reps = leesGetal(next[`${l}-reps`]);
      if (kg && reps && Number.isInteger(reps)) kracht[l] = { kg, reps };
    }
    onChange({ ...p, kracht, lichaamsgewicht: leesGetal(next.gewicht) || undefined });
  }

  const half = (l: Basislift) => {
    const kg = velden[`${l}-kg`].trim();
    const reps = velden[`${l}-reps`].trim();
    return (kg || reps) && !p.kracht[l];
  };

  return (
    <div className="stack">
      <p className="small muted">Een set die je recent haalde, bijvoorbeeld 60 kg × 8. Weet je het niet? Laat leeg.</p>
      {BASISLIFTS.map((l) => (
        <div key={l} className="strength-row">
          <span>{LIFT_NAAM[l]}</span>
          <label>
            <input
              inputMode="decimal"
              value={velden[`${l}-kg`]}
              onChange={(e) => zet(`${l}-kg`, e.target.value)}
              aria-label={`${LIFT_NAAM[l]} gewicht in kg`}
            />
            <small>kg</small>
          </label>
          <span className="muted">×</span>
          <label>
            <input
              inputMode="numeric"
              value={velden[`${l}-reps`]}
              onChange={(e) => zet(`${l}-reps`, e.target.value)}
              aria-label={`${LIFT_NAAM[l]} herhalingen`}
            />
            <small>reps</small>
          </label>
          {half(l) && <small className="form-error">Vul gewicht én reps in</small>}
        </div>
      ))}
      <div className="strength-row">
        <span>Lichaamsgewicht</span>
        <label>
          <input
            inputMode="decimal"
            value={velden.gewicht}
            onChange={(e) => zet('gewicht', e.target.value)}
            aria-label="Lichaamsgewicht in kg"
          />
          <small>kg</small>
        </label>
      </div>
    </div>
  );
}
