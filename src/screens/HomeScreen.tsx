import { useLiveQuery } from 'dexie-react-hooks';
import { db, startWorkout, type Template, type Workout } from '../db';
import { Icon } from '../components/Icon';
import { Thumb } from '../components/Thumb';
import { fmtDuration, volume } from '../format';
import { defaultsFor } from '../library/defaults';
import { estimateMinutes, relativeDay, startOfWeek, weekDays, weekStreak } from '../stats';
import { useNow } from '../useNow';
import { backupDue, shareBackup, snoozeBackup } from '../backup';
import { useSettings } from '../settings';
import { showToast } from '../toast';
import { weekSchema } from '../plan/generator';
import { loggedDays, nextDay, startPlanDay } from '../plan/start';
import { setWeek, usePlan } from '../plan/store';

interface Props {
  active?: Workout;
  onOpenWorkout: () => void;
  onOpenSettings: () => void;
  onNewTemplate: () => void;
  onOpenPlan: () => void;
}

const DAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

export function HomeScreen({ active, onOpenWorkout, onOpenSettings, onNewTemplate, onOpenPlan }: Props) {
  const now = useNow(60_000);
  const plan = usePlan();
  const settings = useSettings();
  const data = useLiveQuery(async () => {
    const finished = (await db.workouts.orderBy('startedAt').toArray()).filter((w) => w.endedAt);
    const weekStart = startOfWeek(Date.now());
    const thisWeek = finished.filter((w) => w.startedAt >= weekStart);
    const weekSets = await db.sets
      .where('workoutId')
      .anyOf(thisWeek.map((w) => w.id))
      .toArray();
    const lastByTemplate = new Map<number, number>();
    for (const w of finished) if (w.templateId) lastByTemplate.set(w.templateId, w.startedAt);
    const templates = await db.templates.toArray();
    const exercises = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
    const all = await db.workouts.toArray();
    return { finished, thisWeek, weekVolume: volume(weekSets), lastByTemplate, templates, exercises, all };
  }, []);

  if (!data) return <div className="screen" />;
  const { finished, thisWeek, weekVolume, lastByTemplate, templates, exercises, all } = data;
  const starts = finished.map((w) => w.startedAt);
  const days = weekDays(starts, now);
  const today = (new Date(now).getDay() + 6) % 7;
  const streak = weekStreak(starts, now);

  // Next up: the program you haven't done for the longest time (never done comes first).
  const ordered = [...templates].sort(
    (a, b) => (lastByTemplate.get(a.id) ?? 0) - (lastByTemplate.get(b.id) ?? 0) || a.name.localeCompare(b.name),
  );
  // With a training schema, that comes first and all programs are listed below it.
  const next = plan ? undefined : ordered[0];
  const others = plan ? ordered : ordered.slice(1);

  // Next up from the schema: the first day of this week that isn't done yet.
  const planNext = plan ? nextDay(plan, loggedDays(plan, all)) : null;
  const planDay = plan && planNext != null ? weekSchema(plan.schema, plan.week)[planNext] : null;

  async function startPlan() {
    if (!plan || planNext == null) return;
    if (!active) await startPlanDay(plan, planNext);
    onOpenWorkout();
  }

  const minutes = (t: Template) =>
    estimateMinutes(
      t.items.map((i) => {
        const ex = exercises.get(i.exerciseId);
        return { sets: i.sets, rest: i.restSeconds ?? (ex ? defaultsFor(ex).rest : 90) };
      }),
    );

  async function start(template?: Template) {
    if (!active) await startWorkout(template);
    onOpenWorkout();
  }

  return (
    <div className="screen">
      <header className="page-header home-header">
        <div>
          <span className="date">
            {capitalize(new Date(now).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }))}
          </span>
          <h1>Klaar om te trainen?</h1>
        </div>
        <button className="icon-btn" onClick={onOpenSettings} aria-label="Instellingen">
          <Icon name="settings" />
        </button>
      </header>
      <main className="content">
        {!active && backupDue(settings, finished.length, now) && (
          <section className="card backup-card">
            <span className="eyebrow">Backup</span>
            <strong className="block">
              {settings.lastBackupAt
                ? `Je laatste backup is van ${relativeDay(settings.lastBackupAt, now)}.`
                : 'Je hebt nog geen backup gemaakt.'}
            </strong>
            <span className="small muted">
              Je workouts staan alleen op deze telefoon. Bewaar een backup in iCloud Drive via Delen → Bewaar in
              Bestanden.
            </span>
            <div className="row-buttons">
              <button
                className="btn primary"
                onClick={async () => {
                  if (await shareBackup()) showToast('Backup gemaakt');
                }}
              >
                Backup maken
              </button>
              <button className="btn ghost" onClick={() => snoozeBackup()}>
                Later
              </button>
            </div>
          </section>
        )}
        {active && (
          <button className="card active-card" onClick={onOpenWorkout}>
            <span className="grow">
              <span className="eyebrow">Workout bezig</span>
              <strong className="block card-title">{active.name}</strong>
              <span className="small muted">Gestart {fmtDuration(now - active.startedAt)} geleden</span>
            </span>
            <span className="round-btn">
              <Icon name="play" />
            </span>
          </button>
        )}

        <section className="card week-card">
          <div className="inline spread">
            <span className="eyebrow">Deze week</span>
            {streak > 0 && (
              <span className="streak">🔥 {streak === 1 ? '1 week op rij' : `${streak} weken op rij`}</span>
            )}
          </div>
          <div className="week-dots">
            {DAY_LABELS.map((d, i) => (
              <div key={d} className="week-day">
                <span className={`dot ${days[i] ? 'on' : ''} ${i === today ? 'today' : ''}`} />
                <span className="small muted">{d}</span>
              </div>
            ))}
          </div>
          <div className="week-stats">
            <div>
              <strong className="num">{thisWeek.length}</strong>
              <span className="small muted">{thisWeek.length === 1 ? 'workout' : 'workouts'}</span>
            </div>
            <div>
              <strong className="num">{Math.round(weekVolume).toLocaleString('nl-NL')}</strong>
              <span className="small muted">kg volume</span>
            </div>
          </div>
        </section>

        {plan && planDay && !active && (
          <section className="card next-card">
            <span className="eyebrow">
              Schema · week {plan.week} · dag {planNext! + 1}
            </span>
            <strong className="card-title big-title">{planDay.naam}</strong>
            <span className="small muted">
              ± {planDay.minuten} min · {planDay.oefeningen.length} oefeningen{planDay.cardio ? ' + cardio' : ''}
            </span>
            <div className="thumb-row">
              {planDay.oefeningen
                .filter((o) => o.slug)
                .slice(0, 6)
                .map((o) => (
                  <Thumb key={o.id} exercise={{ slug: o.slug, muscle: '' }} size={46} />
                ))}
            </div>
            <button className="btn primary block big" onClick={startPlan} disabled={!!active}>
              Start {planDay.naam}
            </button>
            <button className="link center" onClick={onOpenPlan}>
              Hele schema bekijken
            </button>
          </section>
        )}
        {plan && !planDay && !active && (
          <section className="card next-card">
            <span className="eyebrow">Schema</span>
            <strong className="card-title big-title">
              {plan.week < 4 ? `Week ${plan.week} afgerond! 🎉` : 'Blok afgerond! 🎉'}
            </strong>
            {plan.week < 4 ? (
              <button className="btn primary block big" onClick={() => setWeek(plan.week + 1)}>
                Door naar week {plan.week + 1}
              </button>
            ) : (
              <button className="btn primary block big" onClick={onOpenPlan}>
                Nieuw blok starten
              </button>
            )}
          </section>
        )}

        {plan ? null : next ? (
          <section className="card next-card">
            <span className="eyebrow">Volgende training</span>
            <strong className="card-title big-title">{next.name}</strong>
            <span className="small muted">
              ± {minutes(next)} min · {next.items.length} oefeningen · laatst{' '}
              {relativeDay(lastByTemplate.get(next.id), now)}
            </span>
            <div className="thumb-row">
              {next.items.slice(0, 6).map((i) => (
                <Thumb key={i.exerciseId} exercise={exercises.get(i.exerciseId)} size={46} />
              ))}
            </div>
            <button className="btn primary block big" onClick={() => start(next)} disabled={!!active}>
              Start {next.name}
            </button>
          </section>
        ) : (
          <section className="card empty-card">
            <p>Maak een trainingsschema of een eigen programma, dan zet ik hier je volgende training klaar.</p>
            <div className="row-buttons">
              <button className="btn primary" onClick={onOpenPlan}>
                Schema maken
              </button>
              <button className="btn secondary" onClick={onNewTemplate}>
                + Programma
              </button>
            </div>
          </section>
        )}

        {others.length > 0 && (
          <>
            <h2 className="section-title">{plan ? "Programma's" : "Andere programma's"}</h2>
            <ul className="list card">
              {others.map((t) => (
                <li key={t.id}>
                  <button className="list-item" onClick={() => start(t)} disabled={!!active}>
                    <span className="grow">
                      <strong className="block">{t.name}</strong>
                      <span className="small muted">
                        ± {minutes(t)} min · laatst {relativeDay(lastByTemplate.get(t.id), now)}
                      </span>
                    </span>
                    <span className="round-btn small-round">
                      <Icon name="play" size={16} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {!active && (
          <button className="btn secondary block" onClick={() => start()}>
            Lege workout starten
          </button>
        )}
      </main>
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
