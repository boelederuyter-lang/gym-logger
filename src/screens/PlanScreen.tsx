import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type Workout } from '../db';
import { ActionSheet, type Action } from '../components/ActionSheet';
import { Icon } from '../components/Icon';
import { Thumb } from '../components/Thumb';
import { APPARATUUR, BIBLIOTHEEK } from '../plan/exercises';
import { Sheet } from '../components/Sheet';
import { Onboarding } from './Onboarding';
import { DAG_NAMEN, DOEL_TEKST, MATERIAAL_TEKST, NIVEAU_TEKST, vanOudeInvoer, type Profiel } from '../coach/profile';
import { saveProfiel, useProfiel } from '../coach/profileStore';
import {
  APPARATUUR_KEUZES,
  DOELEN,
  NIVEAUS,
  WEKEN,
  formatReps,
  formatRust,
  weekSchema,
  type Cardio,
  type Schema,
  type SchemaOefening,
  type WeekDag,
  varianten,
} from '../plan/generator';
import { currentWeek, loggedDays, startPlanDay } from '../plan/start';
import { coachVarianten } from '../coach/generator';
import { maandagVan } from '../coach/progression';
import { LIBRARY_BY_SLUG } from '../library/exercises';
import {
  createCoachPlan,
  regeneratePlan,
  setWeek,
  shareLink,
  startNewBlock,
  swapExercise,
  toggleDone,
  usePlan,
  type PlanState,
} from '../plan/store';
import { showToast } from '../toast';

interface Props {
  active?: Workout;
  onOpenWorkout: () => void;
}

export function PlanScreen({ active, onOpenWorkout }: Props) {
  const plan = usePlan();
  const profiel = useProfiel();
  const [vragen, setVragen] = useState(false);

  function klaar(p: Profiel) {
    saveProfiel(p);
    createCoachPlan(p);
    setVragen(false);
    window.scrollTo({ top: 0 });
    showToast('Je schema staat klaar 💪');
  }

  const vragenlijst = vragen && (
    <Onboarding
      initial={profiel ?? (plan ? vanOudeInvoer(plan.invoer) : undefined)}
      editing={!!plan}
      onClose={() => setVragen(false)}
      onDone={klaar}
    />
  );

  if (!plan) {
    return (
      <div className="screen">
        <header className="page-header home-header">
          <div>
            <span className="date">Je coach</span>
            <h1>Schema maken</h1>
          </div>
        </header>
        <main className="content">
          <section className="card coach-intro">
            <h2>Een schema dat met je meegroeit</h2>
            <p className="muted">
              Beantwoord een paar korte vragen. Je krijgt een schema dat past bij je doel, je tijd en je materiaal.
            </p>
            <ul className="coach-points">
              <li>Oefeningen die je kunt doen, ook met een blessure</li>
              <li>Elke training met één tik starten</li>
              <li>Duidelijk wanneer je zwaarder mag</li>
            </ul>
            <button className="btn primary block big" onClick={() => setVragen(true)}>
              Start de vragenlijst
            </button>
            <small className="muted center">Duurt ongeveer 2 minuten</small>
          </section>
        </main>
        {vragenlijst}
      </div>
    );
  }
  return (
    <>
      <PlanView plan={plan} active={active} onOpenWorkout={onOpenWorkout} onEdit={() => setVragen(true)} />
      {vragenlijst}
    </>
  );
}

// ---------------------------------------------------------------------------
// View

function PlanView({
  plan,
  active,
  onOpenWorkout,
  onEdit,
}: {
  plan: PlanState;
  active?: Workout;
  onOpenWorkout: () => void;
  onEdit: () => void;
}) {
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);
  const [confirm, setConfirm] = useState<{ title: string; actions: Action[] } | null>(null);
  const [swapping, setSwapping] = useState<{ dag: number; index: number } | null>(null);
  const { invoer, schema, blok, profiel } = plan;
  const coach = !!schema.coach;
  // Coach schemas follow the calendar week; old schemas the week of their 4-week block.
  const week = currentWeek(plan);
  const dagen = weekSchema(schema, coach ? 1 : week);
  const logged = loggedDays(plan, workouts ?? []);
  const isDone = (w: number, d: number) => logged.has(`${w}-${d}`) || !!plan.gedaan[`${w}-${d}`];
  const weekDone = (w: number) => schema.dagen.every((_, d) => isDone(w, d));
  const doneCount = schema.dagen.filter((_, d) => isDone(week, d)).length;

  async function start(d: number) {
    if (active) return onOpenWorkout();
    await startPlanDay(plan, d);
    onOpenWorkout();
  }

  async function share() {
    const url = shareLink(plan);
    const text = 'Dit is mijn trainingsschema. Open de link om het te bekijken, of maak je eigen schema.';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Trainingsschema', text, url });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link gekopieerd. Stuur hem naar je vrienden!');
    } catch {
      prompt('Kopieer deze link:', url);
    }
  }

  const askRegenerate = () =>
    setConfirm({
      title: 'Nieuwe oefeningen kiezen met dezelfde antwoorden? Je gelogde workouts blijven bewaard.',
      actions: [
        { label: 'Opnieuw genereren', onClick: () => (regeneratePlan(), showToast('Nieuwe oefeningen gekozen')) },
      ],
    });

  const newBlock = () => {
    startNewBlock();
    window.scrollTo({ top: 0 });
    showToast(`Blok ${blok + 1} gestart. De gewichten van week 3 staan alvast klaar.`);
  };
  const askNewBlock = () =>
    week === 4
      ? newBlock()
      : setConfirm({
          title: 'Nieuw blok starten? Je gaat terug naar week 1.',
          actions: [{ label: 'Nieuw blok starten', onClick: newBlock }],
        });

  return (
    <div className="screen">
      <header className="page-header home-header">
        <div>
          <span className="date">
            {coach ? 'Je coach · sinds' : `Blok ${blok} · gestart`}{' '}
            {new Date(plan.gestart).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
          </span>
          <h1>{schema.split}</h1>
        </div>
        <button className="icon-btn" onClick={share} aria-label="Schema delen">
          <Icon name="share" />
        </button>
      </header>
      <main className="content">
        {coach && profiel ? (
          <CoachTags profiel={profiel} />
        ) : (
          <div className="tag-row">
            <span className="tag">{DOELEN[invoer.doel]}</span>
            <span className="tag">{NIVEAUS[invoer.niveau]}</span>
            <span className="tag">{invoer.dagen}× per week</span>
            <span className="tag">{invoer.tijd === 75 ? '75+' : invoer.tijd} min</span>
            <span className="tag">{APPARATUUR_KEUZES[invoer.apparatuur]}</span>
          </div>
        )}
        {coach ? (
          <section className="week-note">
            <p>
              <strong>Deze week:</strong> {doneCount} van {schema.dagen.length} trainingen gedaan.
            </p>
            <div className="progress plan-progress">
              <div className="progress-fill" style={{ width: `${(doneCount / schema.dagen.length) * 100}%` }} />
            </div>
            {plan.herstelWeken?.includes(maandagVan(Date.now())) ? (
              <p className="small">
                🌙 <strong>Herstelweek:</strong> minder sets met hetzelfde gewicht. Volgende week bouw je weer verder.
              </p>
            ) : (
              <p className="small muted">
                Bij elke training staat klaar wat je doet, met de reden erbij: zwaarder als je alle sets bovenin het
                repbereik haalt, anders eerst meer reps.
              </p>
            )}
            {profiel && profiel.blessures.length > 0 && (
              <p className="small muted">
                Oefeningen die je {profiel.blessures.join(' of ')} belasten heb ik weggelaten.
              </p>
            )}
          </section>
        ) : (
          <>
            <div className="segmented week-tabs" role="tablist" aria-label="Week van het blok">
              {WEKEN.map((w) => (
                <button
                  key={w.nr}
                  role="tab"
                  aria-selected={w.nr === week}
                  className={w.nr === week ? 'active' : ''}
                  onClick={() => setWeek(w.nr)}
                >
                  <span>
                    Week {w.nr}
                    {weekDone(w.nr) ? ' ✓' : ''}
                  </span>
                  <small>{w.label}</small>
                </button>
              ))}
            </div>

            <section className="week-note">
              <p>{WEKEN[week - 1].uitleg}</p>
              {(week === 3 || week === 4 || (week === 1 && blok > 1)) && (
                <p className="small muted">Bij Start training staan de aangepaste gewichten al voor je klaar.</p>
              )}
              {invoer.doel === 'vetverlies' && (
                <p className="small muted">
                  Vetverlies: cardio doe je na de krachttraining. Op rustdagen helpt 30–45 min wandelen. Het meeste
                  resultaat komt van een klein calorietekort en genoeg eiwit.
                </p>
              )}
              {invoer.apparatuur !== 'gym' && (
                <p className="small muted">
                  Lichaamsgewicht te makkelijk? Kies een zwaardere variant of zak langzamer, zodat de laatste reps zwaar
                  zijn.
                </p>
              )}
              <div className="progress plan-progress">
                <div className="progress-fill" style={{ width: `${(doneCount / schema.dagen.length) * 100}%` }} />
              </div>
              <span className="small muted">
                {doneCount} van {schema.dagen.length} trainingen gedaan
              </span>
            </section>
          </>
        )}

        {dagen.map((dag, d) => (
          <DayCard
            key={d}
            dag={dag}
            index={d}
            done={isDone(week, d)}
            logged={logged.has(`${week}-${d}`)}
            active={active}
            onStart={() => start(d)}
            onToggle={() => toggleDone(week, d)}
            onSwap={(index) => setSwapping({ dag: d, index })}
          />
        ))}

        {!coach && week === 4 && (
          <button className="btn primary block big" onClick={askNewBlock}>
            Nieuw blok starten
          </button>
        )}
        <div className="plan-actions">
          <button className="btn ghost" onClick={askRegenerate}>
            Opnieuw genereren
          </button>
          <button className="btn ghost" onClick={onEdit}>
            Profiel aanpassen
          </button>
        </div>
        {!coach && week !== 4 && (
          <button className="link center" onClick={askNewBlock}>
            Nieuw blok starten
          </button>
        )}
      </main>
      {confirm && <ActionSheet title={confirm.title} actions={confirm.actions} onClose={() => setConfirm(null)} />}
      {swapping && <SwapSheet schema={schema} profiel={profiel} {...swapping} onClose={() => setSwapping(null)} />}
    </div>
  );
}

function DayCard({
  dag,
  index,
  done,
  logged,
  active,
  onStart,
  onToggle,
  onSwap,
}: {
  dag: WeekDag;
  index: number;
  done: boolean;
  logged: boolean;
  active?: Workout;
  onStart: () => void;
  onToggle: () => void;
  onSwap: (index: number) => void;
}) {
  return (
    <article className={`card plan-day ${done ? 'done' : ''}`}>
      <div className="plan-day-head">
        <div className="grow">
          <span className="eyebrow">
            {dag.weekdag != null ? DAG_NAMEN[dag.weekdag] : `Dag ${index + 1}`} · {dag.focus}
          </span>
          <strong className="card-title block">{dag.naam}</strong>
          <span className="small muted">
            ± {dag.minuten} min · {dag.oefeningen.length} oefeningen{dag.cardio ? ' + cardio' : ''}
          </span>
        </div>
        <button
          className={`done-toggle ${done ? 'on' : ''}`}
          onClick={onToggle}
          disabled={logged}
          aria-pressed={done}
          title={logged ? 'Gelogd als workout' : 'Afvinken als je deze training ergens anders deed'}
        >
          <Icon name="check" size={16} />
          {logged ? 'Gelogd' : done ? 'Gedaan' : 'Afvinken'}
        </button>
      </div>
      {dag.uitleg && <p className="small day-explain">{dag.uitleg}</p>}
      <ol className="plan-list">
        {dag.oefeningen.map((o, i) => (
          <li key={o.id}>
            <ExerciseRow o={o} nr={i + 1} onSwap={() => onSwap(i)} />
          </li>
        ))}
      </ol>
      {dag.cardio && <CardioRow c={dag.cardio} />}
      <button className={`btn block ${done ? 'ghost' : 'primary'}`} onClick={onStart}>
        {active ? 'Workout bezig: openen' : done ? 'Nog een keer trainen' : 'Start training'}
      </button>
    </article>
  );
}

function Badge({ text }: { text?: string | null }) {
  if (!text) return null;
  return <span className={`plan-badge ${text === 'Deload' ? 'quiet' : ''}`}>{text}</span>;
}

function ExerciseRow({ o, nr, onSwap }: { o: SchemaOefening; nr: number; onSwap: () => void }) {
  return (
    <details className="plan-ex">
      <summary>
        {o.slug ? (
          <Thumb exercise={{ slug: o.slug, muscle: LIBRARY_BY_SLUG.get(o.slug)?.muscle ?? '' }} size={40} />
        ) : (
          <span className="plan-nr">{nr}</span>
        )}
        <span className="grow">
          <strong className="block">{o.naam}</strong>
          <span className="small muted">
            <b className="num-text">
              {o.sets} × {formatReps(o)}
            </b>{' '}
            · rust {formatRust(o.rust)}
          </span>
        </span>
        <Badge text={o.advies ?? (o.prioriteit ? '+1 set' : null)} />
        <Icon name="down" size={18} />
      </summary>
      <div className="plan-tip">
        {o.startgewicht != null ? (
          <p className="start-hint">
            Startgewicht: <strong>{String(o.startgewicht).replace('.', ',')} kg</strong>
            {o.apparatuur === 'dumbbells' ? ' per hand' : ''}
          </p>
        ) : (
          o.startHint && <p className="start-hint">{o.startHint}</p>
        )}
        <p className="tip">{o.tip}</p>
        <div className="tag-row">
          <span className="tag">{o.spiergroep}</span>
          <span className="tag">{o.apparatuur}</span>
          <span className="tag">{o.type === 'compound' ? 'Compound' : 'Isolatie'}</span>
        </div>
        <button className="btn secondary block" onClick={onSwap}>
          Wissel oefening
        </button>
      </div>
    </details>
  );
}

/** Pick another exercise with the same movement pattern for one spot in the schema. */
function SwapSheet({
  schema,
  profiel,
  dag,
  index,
  onClose,
}: {
  schema: Schema;
  profiel?: Profiel;
  dag: number;
  index: number;
  onClose: () => void;
}) {
  const huidig = schema.dagen[dag]?.oefeningen[index];
  if (!huidig) return null;
  const opties =
    schema.coach && profiel
      ? coachVarianten(schema, profiel, dag, index).map((c) => ({
          id: c.id,
          naam: c.naam,
          slug: c.id as string | undefined,
          sub: `${c.materiaal.filter((m) => m !== 'lichaamsgewicht' || c.materiaal.length === 1).join(', ')} · ${c.primair.join(', ')}`,
        }))
      : varianten(schema, dag, index).map((o) => ({
          id: o.id,
          naam: o.naam,
          slug: BIBLIOTHEEK[o.id] as string | undefined,
          sub: `${APPARATUUR[o.apparatuur]} · ${o.type === 'compound' ? 'compound' : 'isolatie'}`,
        }));
  return (
    <Sheet title={`Wissel ${huidig.naam}`} onClose={onClose}>
      <p className="small muted">
        {schema.coach
          ? 'Oefeningen met hetzelfde bewegingspatroon die passen bij je materiaal, niveau en blessures. De beste vervangers staan bovenaan.'
          : 'Oefeningen die hetzelfde bewegingspatroon trainen en passen bij je apparatuur. Sets, reps en rust blijven passend bij je doel.'}
      </p>
      {opties.length === 0 ? (
        <p className="empty">Er is geen andere variant voor deze plek met jouw apparatuur.</p>
      ) : (
        <ul className="list card">
          {opties.map((o) => (
            <li key={o.id}>
              <button
                className="list-item"
                onClick={() => {
                  swapExercise({ dag, index, id: o.id });
                  showToast(`${huidig.naam} vervangen door ${o.naam}`);
                  onClose();
                }}
              >
                {o.slug ? (
                  <Thumb exercise={{ slug: o.slug, muscle: LIBRARY_BY_SLUG.get(o.slug)?.muscle ?? '' }} size={40} />
                ) : (
                  <span className="plan-nr">·</span>
                )}
                <span className="grow">
                  <strong className="block">{o.naam}</strong>
                  <span className="small muted">{o.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/** Tags with the questionnaire answers above a coach schema. */
function CoachTags({ profiel }: { profiel: Profiel }) {
  const materiaal = profiel.materiaalKeuze === 'zelf' ? 'Eigen materiaal' : MATERIAAL_TEKST[profiel.materiaalKeuze][0];
  return (
    <div className="tag-row">
      <span className="tag">{DOEL_TEKST[profiel.doel][0]}</span>
      <span className="tag">{NIVEAU_TEKST[profiel.niveau][0]}</span>
      <span className="tag">{profiel.dagen.length}× per week</span>
      <span className="tag">{profiel.tijd} min</span>
      <span className="tag">{materiaal}</span>
      {profiel.prioriteit.map((g) => (
        <span key={g} className="tag">
          Extra {g}
        </span>
      ))}
    </div>
  );
}

function CardioRow({ c }: { c: Cardio }) {
  return (
    <details className="plan-ex plan-cardio">
      <summary>
        <span className="plan-nr cardio-icon" aria-hidden="true">
          <Icon name="heart" size={18} />
        </span>
        <span className="grow">
          <strong className="block">Cardio: {c.naam}</strong>
          <span className="small muted">
            <b className="num-text">{c.minuten} min</b> · {c.soort === 'interval' ? 'intervallen' : 'rustig tempo'}
          </span>
        </span>
        <Badge text={c.advies} />
        <Icon name="down" size={18} />
      </summary>
      <div className="plan-tip">
        <p className="tip">
          <strong>{c.uitleg}</strong>
        </p>
        <p className="tip">{c.tip}</p>
        <div className="tag-row">
          <span className="tag">Na de krachttraining</span>
          <span className="tag">{c.apparatuur}</span>
        </div>
      </div>
    </details>
  );
}
