import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type Workout } from '../db';
import { ActionSheet, type Action } from '../components/ActionSheet';
import { Icon } from '../components/Icon';
import { Thumb } from '../components/Thumb';
import { LOGGER_SPIER } from '../plan/exercises';
import {
  APPARATUUR_KEUZES,
  DOELEN,
  NIVEAUS,
  WEKEN,
  formatReps,
  formatRust,
  weekSchema,
  type Cardio,
  type Invoer,
  type SchemaOefening,
  type WeekDag,
} from '../plan/generator';
import { loggedDays, startPlanDay } from '../plan/start';
import {
  createPlan,
  regeneratePlan,
  setWeek,
  shareLink,
  startNewBlock,
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
  const [editing, setEditing] = useState(false);

  if (!plan || editing) {
    return (
      <PlanForm
        initial={plan?.invoer}
        onCancel={plan ? () => setEditing(false) : undefined}
        onSubmit={(invoer) => {
          createPlan(invoer);
          setEditing(false);
          window.scrollTo({ top: 0 });
          showToast('Je schema staat klaar 💪');
        }}
      />
    );
  }
  return <PlanView plan={plan} active={active} onOpenWorkout={onOpenWorkout} onEdit={() => setEditing(true)} />;
}

// ---------------------------------------------------------------------------
// Form

const STANDAARD: Invoer = { doel: 'spiermassa', niveau: 'beginner', dagen: 3, tijd: 60, apparatuur: 'gym' };

const SPLIT_HINT: Record<number, string> = {
  2: 'Full body, 2× per week',
  3: 'Full body, 3× per week',
  4: 'Upper/lower: 2× boven, 2× onder',
  5: 'Push, pull, legs + upper en lower',
};

type Optie<T> = [T, string, string?];

function Choices<T extends string | number>({
  options,
  value,
  onChange,
  columns,
  label,
}: {
  options: Optie<T>[];
  value: T;
  onChange: (v: T) => void;
  columns: number;
  label: string;
}) {
  return (
    <div className={`choices ${columns >= 3 ? 'centered' : ''}`} style={{ '--cols': columns } as React.CSSProperties} role="radiogroup" aria-label={label}>
      {options.map(([v, title, sub]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          className={`choice ${v === value ? 'active' : ''}`}
          onClick={() => onChange(v)}
        >
          <strong>{title}</strong>
          {sub && <span>{sub}</span>}
        </button>
      ))}
    </div>
  );
}

function PlanForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Invoer;
  onSubmit: (i: Invoer) => void;
  onCancel?: () => void;
}) {
  const [i, setI] = useState<Invoer>(initial ?? STANDAARD);
  const set = <K extends keyof Invoer>(k: K) => (v: Invoer[K]) => setI({ ...i, [k]: v });

  return (
    <div className="screen">
      <header className="page-header home-header">
        <div>
          <span className="date">Trainingsschema</span>
          <h1>{onCancel ? 'Invoer aanpassen' : 'Schema maken'}</h1>
        </div>
      </header>
      <main className="content">
        {!onCancel && (
          <p className="muted intro-text">
            Vijf vragen en je hebt een blok van 4 weken met progressie. Elke training start je met één tik als workout.
          </p>
        )}
        <section className="card form-card">
          <h3>Wat is je doel?</h3>
          <Choices
            label="Doel"
            columns={2}
            value={i.doel}
            onChange={set('doel')}
            options={[
              ['kracht', DOELEN.kracht, '4–6 reps'],
              ['spiermassa', DOELEN.spiermassa, '8–12 reps'],
              ['fitheid', 'Fitheid', '12–15 reps'],
              ['vetverlies', DOELEN.vetverlies, 'Kracht + cardio'],
            ]}
          />
          <h3>Wat is je niveau?</h3>
          <Choices
            label="Niveau"
            columns={2}
            value={i.niveau}
            onChange={set('niveau')}
            options={[
              ['beginner', NIVEAUS.beginner, 'Minder dan 1 jaar'],
              ['gevorderd', NIVEAUS.gevorderd, '1 jaar of langer'],
            ]}
          />
          <h3>Hoeveel dagen per week?</h3>
          <Choices
            label="Dagen per week"
            columns={4}
            value={i.dagen}
            onChange={set('dagen')}
            options={[[2, '2'], [3, '3'], [4, '4'], [5, '5']]}
          />
          <p className="small muted">{SPLIT_HINT[i.dagen]}</p>
          <h3>Hoeveel tijd per training?</h3>
          <Choices
            label="Tijd per training"
            columns={4}
            value={i.tijd}
            onChange={set('tijd')}
            options={[[30, '30', 'min'], [45, '45', 'min'], [60, '60', 'min'], [75, '75+', 'min']]}
          />
          <h3>Welke apparatuur heb je?</h3>
          <Choices
            label="Apparatuur"
            columns={1}
            value={i.apparatuur}
            onChange={set('apparatuur')}
            options={[
              ['gym', APPARATUUR_KEUZES.gym, 'Stangen, machines, kabels'],
              ['dumbbells', APPARATUUR_KEUZES.dumbbells, 'Thuis of in een kleine gym'],
              ['thuis', 'Zonder spullen', 'Lichaamsgewicht, stoel, handdoek'],
            ]}
          />
        </section>
        <button className="btn primary block big" onClick={() => onSubmit(i)}>
          {onCancel ? 'Nieuw schema maken' : 'Maak mijn schema'}
        </button>
        {onCancel && (
          <button className="btn ghost block" onClick={onCancel}>
            Annuleren
          </button>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema

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
  const { invoer, schema, week, blok } = plan;
  const dagen = weekSchema(schema, week);
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
      actions: [{ label: 'Opnieuw genereren', onClick: () => (regeneratePlan(), showToast('Nieuwe oefeningen gekozen')) }],
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
            Blok {blok} · gestart{' '}
            {new Date(plan.gestart).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
          </span>
          <h1>{schema.split}</h1>
        </div>
        <button className="icon-btn" onClick={share} aria-label="Schema delen">
          <Icon name="share" />
        </button>
      </header>
      <main className="content">
        <div className="tag-row">
          <span className="tag">{DOELEN[invoer.doel]}</span>
          <span className="tag">{NIVEAUS[invoer.niveau]}</span>
          <span className="tag">{invoer.dagen}× per week</span>
          <span className="tag">{invoer.tijd === 75 ? '75+' : invoer.tijd} min</span>
          <span className="tag">{APPARATUUR_KEUZES[invoer.apparatuur]}</span>
        </div>

        <div className="segmented week-tabs" role="tablist" aria-label="Week van het blok">
          {WEKEN.map((w) => (
            <button
              key={w.nr}
              role="tab"
              aria-selected={w.nr === week}
              className={w.nr === week ? 'active' : ''}
              onClick={() => setWeek(w.nr)}
            >
              <span>Week {w.nr}{weekDone(w.nr) ? ' ✓' : ''}</span>
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
              Vetverlies: cardio doe je na de krachttraining. Op rustdagen helpt 30–45 min wandelen. Het meeste resultaat
              komt van een klein calorietekort en genoeg eiwit.
            </p>
          )}
          {invoer.apparatuur !== 'gym' && (
            <p className="small muted">
              Lichaamsgewicht te makkelijk? Kies een zwaardere variant of zak langzamer, zodat de laatste reps zwaar zijn.
            </p>
          )}
          <div className="progress plan-progress">
            <div className="progress-fill" style={{ width: `${(doneCount / schema.dagen.length) * 100}%` }} />
          </div>
          <span className="small muted">
            {doneCount} van {schema.dagen.length} trainingen gedaan
          </span>
        </section>

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
          />
        ))}

        {week === 4 && (
          <button className="btn primary block big" onClick={askNewBlock}>
            Nieuw blok starten
          </button>
        )}
        <div className="plan-actions">
          <button className="btn ghost" onClick={askRegenerate}>
            Opnieuw genereren
          </button>
          <button className="btn ghost" onClick={onEdit}>
            Invoer aanpassen
          </button>
        </div>
        {week !== 4 && (
          <button className="link center" onClick={askNewBlock}>
            Nieuw blok starten
          </button>
        )}
      </main>
      {confirm && <ActionSheet title={confirm.title} actions={confirm.actions} onClose={() => setConfirm(null)} />}
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
}: {
  dag: WeekDag;
  index: number;
  done: boolean;
  logged: boolean;
  active?: Workout;
  onStart: () => void;
  onToggle: () => void;
}) {
  return (
    <article className={`card plan-day ${done ? 'done' : ''}`}>
      <div className="plan-day-head">
        <div className="grow">
          <span className="eyebrow">
            Dag {index + 1} · {dag.focus}
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
      <ol className="plan-list">
        {dag.oefeningen.map((o, i) => (
          <li key={o.id}>
            <ExerciseRow o={o} nr={i + 1} />
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

function ExerciseRow({ o, nr }: { o: SchemaOefening; nr: number }) {
  return (
    <details className="plan-ex">
      <summary>
        {o.slug ? (
          <Thumb exercise={{ slug: o.slug, muscle: LOGGER_SPIER[o.patroon] }} size={40} />
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
        <Badge text={o.advies} />
        <Icon name="down" size={18} />
      </summary>
      <div className="plan-tip">
        <p className="tip">{o.tip}</p>
        <div className="tag-row">
          <span className="tag">{o.spiergroep}</span>
          <span className="tag">{o.apparatuur}</span>
          <span className="tag">{o.type === 'compound' ? 'Compound' : 'Isolatie'}</span>
        </div>
      </div>
    </details>
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
