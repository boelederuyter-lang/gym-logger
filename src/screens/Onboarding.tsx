import { useState } from 'react';
import { Choices } from '../components/Choices';
import { Icon } from '../components/Icon';
import {
  GEWRICHT_LABEL,
  GEWRICHTEN,
  GROEP_LABEL,
  MATERIALEN,
  SPIERGROEPEN,
  type Materiaal,
  type MateriaalKeuze,
} from '../coach/exercises';
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
import { decimal, tr } from '../i18n';

interface Props {
  initial?: Profiel;
  /** Editing an existing profile: start at the summary and return there after each question. */
  editing?: boolean;
  onClose?: () => void;
  onDone: (profiel: Profiel) => void;
}

const TITELS: Record<Stap, [string, string]> = {
  doel: [
    tr('Wat is je doel?', "What's your goal?"),
    tr('Hierop stem ik je reps en sets af.', 'I match your reps and sets to it.'),
  ],
  niveau: [
    tr('Hoe lang train je al?', 'How long have you been training?'),
    tr('Zo kies ik oefeningen die bij je passen.', 'So I can pick exercises that suit you.'),
  ],
  dagen: [
    tr('Hoeveel dagen per week?', 'How many days a week?'),
    tr('Tik de dagen aan waarop je traint.', 'Tap the days you train.'),
  ],
  tijd: [
    tr('Hoeveel tijd per training?', 'How much time per session?'),
    tr('Inclusief rust, zonder omkleden.', 'Including rest, not counting changing.'),
  ],
  materiaal: [
    tr('Waar train je?', 'Where do you train?'),
    tr('Ik kies alleen oefeningen die je kunt doen.', 'I only pick exercises you can do.'),
  ],
  prioriteit: [
    tr('Wil je iets extra trainen?', 'Want to train something extra?'),
    tr(
      `Optioneel. Kies hoogstens ${MAX_PRIORITEIT} spiergroepen.`,
      `Optional. Pick at most ${MAX_PRIORITEIT} muscle groups.`,
    ),
  ],
  blessures: [
    tr('Heb je ergens last van?', 'Anything bothering you?'),
    tr('Optioneel. Ik ontzie die plekken.', "Optional. I'll go easy on those areas."),
  ],
  kracht: [
    tr('Hoe sterk ben je nu?', 'How strong are you now?'),
    tr('Optioneel. Dan kan ik je startgewichten voorstellen.', 'Optional. Then I can suggest starting weights.'),
  ],
  samenvatting: [
    tr('Klopt dit?', 'Is this right?'),
    tr('Tik op een regel om iets aan te passen.', 'Tap a line to change it.'),
  ],
};

const MATERIAAL_LABEL: Record<Materiaal, string> = {
  stang: tr('Stang', 'Barbell'),
  dumbbells: 'Dumbbells',
  machine: 'Machines',
  kabel: tr('Kabels', 'Cables'),
  lichaamsgewicht: tr('Lichaamsgewicht', 'Bodyweight'),
  bank: tr('Bank', 'Bench'),
  rek: tr('Rek of optrekstang', 'Rack or pull-up bar'),
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
        ? tr('Bewaar en maak nieuw schema', 'Save and make new plan')
        : tr('Maak mijn schema', 'Make my plan')
      : terugNaarOverzicht
        ? tr('Klaar', 'Done')
        : OPTIONEEL.includes(stap) && leeg
          ? tr('Overslaan', 'Skip')
          : tr('Volgende', 'Next');

  const [titel, uitleg] = TITELS[stap];

  return (
    <div className="onboarding" role="dialog" aria-label={tr('Vragenlijst', 'Questionnaire')}>
      <header className="onboarding-top">
        <button
          className="icon-btn"
          onClick={terug}
          aria-label={tr('Terug', 'Back')}
          disabled={index === 0 && !onClose}
          style={{ visibility: index === 0 && !onClose ? 'hidden' : undefined }}
        >
          <Icon name="back" />
        </button>
        <div
          className="progress-track"
          aria-label={tr(`Vraag ${index + 1} van ${STAPPEN.length}`, `Question ${index + 1} of ${STAPPEN.length}`)}
        >
          <div className="progress-fill" style={{ width: `${voortgang(stap) * 100}%` }} />
        </div>
        {onClose ? (
          <button className="link" onClick={onClose}>
            {tr('Sluiten', 'Close')}
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
              options={[2, 3, 4, 5, 6].map((n) => [n, String(n), tr('dagen', 'days')])}
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
                [
                  'zelf',
                  tr('Zelf aanvinken', 'Tick it yourself'),
                  tr('Kies precies wat er is', 'Pick exactly what you have'),
                ],
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
                {cap(GROEP_LABEL[g])}
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
                  {cap(GEWRICHT_LABEL[g])}
                </button>
              ))}
            </div>
            <p className="disclaimer">
              {tr(
                'Deze app vervangt geen fysiotherapeut of arts. Heb je pijn die niet weggaat, laat het dan onderzoeken voordat je zwaar gaat trainen.',
                "This app doesn't replace a physiotherapist or doctor. If you have pain that doesn't go away, get it checked before training heavy.",
              )}
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
  const tekst = (n?: number) => (n == null ? '' : decimal(n));
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
      <p className="small muted">
        {tr(
          'Een set die je recent haalde, bijvoorbeeld 60 kg × 8. Weet je het niet? Laat leeg.',
          "A set you did recently, for example 60 kg × 8. Don't know? Leave it empty.",
        )}
      </p>
      {BASISLIFTS.map((l) => (
        <div key={l} className="strength-row">
          <span>{LIFT_NAAM[l]}</span>
          <label>
            <input
              inputMode="decimal"
              value={velden[`${l}-kg`]}
              onChange={(e) => zet(`${l}-kg`, e.target.value)}
              aria-label={tr(`${LIFT_NAAM[l]} gewicht in kg`, `${LIFT_NAAM[l]} weight in kg`)}
            />
            <small>kg</small>
          </label>
          <span className="muted">×</span>
          <label>
            <input
              inputMode="numeric"
              value={velden[`${l}-reps`]}
              onChange={(e) => zet(`${l}-reps`, e.target.value)}
              aria-label={tr(`${LIFT_NAAM[l]} herhalingen`, `${LIFT_NAAM[l]} reps`)}
            />
            <small>reps</small>
          </label>
          {half(l) && <small className="form-error">{tr('Vul gewicht én reps in', 'Fill in weight and reps')}</small>}
        </div>
      ))}
      <div className="strength-row">
        <span>{tr('Lichaamsgewicht', 'Bodyweight')}</span>
        <label>
          <input
            inputMode="decimal"
            value={velden.gewicht}
            onChange={(e) => zet('gewicht', e.target.value)}
            aria-label={tr('Lichaamsgewicht in kg', 'Bodyweight in kg')}
          />
          <small>kg</small>
        </label>
      </div>
    </div>
  );
}
