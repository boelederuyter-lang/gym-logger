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
import { locale, tr } from '../i18n';

interface Props {
  active?: Workout;
  onOpenWorkout: () => void;
  onOpenSettings: () => void;
  onNewTemplate: () => void;
  onOpenPlan: () => void;
}

const DAY_LABELS = tr('ma di wo do vr za zo', 'M T W T F S S').split(' ');

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
  const planDay =
    plan && planNext != null ? weekSchema(plan.schema, plan.schema.coach ? 1 : plan.week)[planNext] : null;

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
            {capitalize(new Date(now).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }))}
          </span>
          <h1>{tr('Klaar om te trainen?', 'Ready to train?')}</h1>
        </div>
        <button className="icon-btn" onClick={onOpenSettings} aria-label={tr('Instellingen', 'Settings')}>
          <Icon name="settings" />
        </button>
      </header>
      <main className="content">
        {!active && backupDue(settings, finished.length, now) && (
          <section className="card backup-card">
            <span className="eyebrow">Backup</span>
            <strong className="block">
              {settings.lastBackupAt
                ? tr(
                    `Je laatste backup is van ${relativeDay(settings.lastBackupAt, now)}.`,
                    `Your last backup was ${relativeDay(settings.lastBackupAt, now)}.`,
                  )
                : tr('Je hebt nog geen backup gemaakt.', "You haven't made a backup yet.")}
            </strong>
            <span className="small muted">
              {tr(
                'Je workouts staan alleen op deze telefoon. Bewaar een backup in iCloud Drive via Delen → Bewaar in Bestanden.',
                'Your workouts live only on this phone. Save a backup to iCloud Drive via Share → Save to Files.',
              )}
            </span>
            <div className="row-buttons">
              <button
                className="btn primary"
                onClick={async () => {
                  if (await shareBackup()) showToast(tr('Backup gemaakt', 'Backup created'));
                }}
              >
                {tr('Backup maken', 'Make backup')}
              </button>
              <button className="btn ghost" onClick={() => snoozeBackup()}>
                {tr('Later', 'Later')}
              </button>
            </div>
          </section>
        )}
        {active && (
          <button className="card active-card" onClick={onOpenWorkout}>
            <span className="grow">
              <span className="eyebrow">{tr('Workout bezig', 'Workout in progress')}</span>
              <strong className="block card-title">{active.name}</strong>
              <span className="small muted">
                {tr(
                  `Gestart ${fmtDuration(now - active.startedAt)} geleden`,
                  `Started ${fmtDuration(now - active.startedAt)} ago`,
                )}
              </span>
            </span>
            <span className="round-btn">
              <Icon name="play" />
            </span>
          </button>
        )}

        <section className="card week-card">
          <div className="inline spread">
            <span className="eyebrow">{tr('Deze week', 'This week')}</span>
            {streak > 0 && (
              <span className="streak">
                🔥{' '}
                {streak === 1
                  ? tr('1 week op rij', '1 week streak')
                  : tr(`${streak} weken op rij`, `${streak} week streak`)}
              </span>
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
              <strong className="num">{Math.round(weekVolume).toLocaleString(locale())}</strong>
              <span className="small muted">kg volume</span>
            </div>
          </div>
        </section>

        {plan && planDay && !active && (
          <section className="card next-card">
            <span className="eyebrow">
              {plan.schema.coach
                ? `${tr('Schema', 'Plan')} · ${tr('dag', 'day')} ${planNext! + 1}`
                : `${tr('Schema', 'Plan')} · ${tr('week', 'week')} ${plan.week} · ${tr('dag', 'day')} ${planNext! + 1}`}
            </span>
            <strong className="card-title big-title">{planDay.naam}</strong>
            <span className="small muted">
              ± {planDay.minuten} min · {planDay.oefeningen.length} {tr('oefeningen', 'exercises')}
              {planDay.cardio ? ' + cardio' : ''}
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
              {tr('Hele schema bekijken', 'View full plan')}
            </button>
          </section>
        )}
        {plan && !planDay && !active && (
          <section className="card next-card">
            <span className="eyebrow">{tr('Schema', 'Plan')}</span>
            <strong className="card-title big-title">
              {plan.schema.coach
                ? tr('Week afgerond! 🎉', 'Week complete! 🎉')
                : plan.week < 4
                  ? tr(`Week ${plan.week} afgerond! 🎉`, `Week ${plan.week} complete! 🎉`)
                  : tr('Blok afgerond! 🎉', 'Block complete! 🎉')}
            </strong>
            {plan.schema.coach ? (
              <span className="small muted">
                {tr(
                  'Alle trainingen van deze week gedaan. Maandag staat je schema weer klaar.',
                  'All sessions done for this week. Your plan is ready again on Monday.',
                )}
              </span>
            ) : plan.week < 4 ? (
              <button className="btn primary block big" onClick={() => setWeek(plan.week + 1)}>
                {tr(`Door naar week ${plan.week + 1}`, `On to week ${plan.week + 1}`)}
              </button>
            ) : (
              <button className="btn primary block big" onClick={onOpenPlan}>
                {tr('Nieuw blok starten', 'Start new block')}
              </button>
            )}
          </section>
        )}

        {plan ? null : next ? (
          <section className="card next-card">
            <span className="eyebrow">{tr('Volgende training', 'Next workout')}</span>
            <strong className="card-title big-title">{next.name}</strong>
            <span className="small muted">
              ± {minutes(next)} min · {next.items.length} {tr('oefeningen', 'exercises')} · {tr('laatst', 'last')}{' '}
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
            <p>
              {tr(
                'Maak een trainingsschema of een eigen programma, dan zet ik hier je volgende training klaar.',
                'Create a training plan or your own program, and your next workout will be ready here.',
              )}
            </p>
            <div className="row-buttons">
              <button className="btn primary" onClick={onOpenPlan}>
                {tr('Schema maken', 'Create plan')}
              </button>
              <button className="btn secondary" onClick={onNewTemplate}>
                + {tr('Programma', 'Program')}
              </button>
            </div>
          </section>
        )}

        {others.length > 0 && (
          <>
            <h2 className="section-title">
              {plan ? tr("Programma's", 'Programs') : tr("Andere programma's", 'Other programs')}
            </h2>
            <ul className="list card">
              {others.map((t) => (
                <li key={t.id}>
                  <button className="list-item" onClick={() => start(t)} disabled={!!active}>
                    <span className="grow">
                      <strong className="block">{t.name}</strong>
                      <span className="small muted">
                        ± {minutes(t)} min · {tr('laatst', 'last')} {relativeDay(lastByTemplate.get(t.id), now)}
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
            {tr('Lege workout starten', 'Start empty workout')}
          </button>
        )}
      </main>
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
