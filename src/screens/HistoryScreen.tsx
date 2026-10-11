import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, deleteWorkout, type Workout } from '../db';
import { Sheet } from '../components/Sheet';
import { fmtDate, fmtDuration, fmtSet, volume } from '../format';
import { describePr } from '../prs';
import { Sparkline } from '../components/LineChart';
import { ProgressSheet } from '../components/ProgressSheet';
import { Thumb } from '../components/Thumb';
import { fmtMetric, isWeighted, metricValue } from '../progress';
import { loadSessions } from '../sessions';

export function HistoryScreen({ onOpen }: { onOpen: (id: number) => void }) {
  const [view, setView] = useState<'workouts' | 'exercises'>('workouts');
  return (
    <div className="screen">
      <header className="page-header">
        <h1>Voortgang</h1>
      </header>
      <main className="content">
        <div className="segmented">
          <button className={view === 'workouts' ? 'active' : ''} onClick={() => setView('workouts')}>
            Workouts
          </button>
          <button className={view === 'exercises' ? 'active' : ''} onClick={() => setView('exercises')}>
            Per oefening
          </button>
        </div>
        {view === 'workouts' ? <WorkoutList onOpen={onOpen} /> : <ExerciseList />}
      </main>
    </div>
  );
}

function ExerciseList() {
  const [open, setOpen] = useState<number | null>(null);
  const rows = useLiveQuery(async () => {
    const sessions = await loadSessions();
    const exercises = await db.exercises.bulkGet([...sessions.keys()]);
    return exercises
      .filter((e) => !!e)
      .map((ex) => {
        const list = sessions.get(ex!.id)!;
        const weighted = isWeighted(list);
        const metric = weighted ? 'e1rm' : 'reps';
        const last = list[list.length - 1];
        const lastSet = last.sets[last.sets.length - 1];
        return {
          ex: ex!,
          lastDate: last.date,
          lastSet,
          best: Math.max(...list.map((s) => metricValue(s, metric))),
          metric,
          spark: list.slice(-12).map((s) => metricValue(s, metric)),
        } as const;
      })
      .sort((a, b) => b.lastDate - a.lastDate);
  }, []);

  if (rows?.length === 0)
    return <p className="empty">Rond een workout af, dan zie je hier per oefening je voortgang.</p>;
  return (
    <>
      <ul className="list card">
        {rows?.map((r) => (
          <li key={r.ex.id}>
            <button className="list-item" onClick={() => setOpen(r.ex.id)}>
              <Thumb exercise={r.ex} size={40} />
              <span className="grow">
                <strong className="block">{r.ex.name}</strong>
                <span className="small muted">
                  Laatst {fmtSet(r.lastSet)} · beste {r.metric === 'e1rm' ? '1RM ' : ''}
                  {fmtMetric(r.best, r.metric)}
                </span>
              </span>
              <Sparkline values={r.spark} />
            </button>
          </li>
        ))}
      </ul>
      {open != null && <ProgressSheet exerciseId={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function WorkoutList({ onOpen }: { onOpen: (id: number) => void }) {
  const data = useLiveQuery(async () => {
    const workouts = (await db.workouts.orderBy('startedAt').reverse().toArray()).filter((w) => w.endedAt);
    const sets = await db.sets.toArray();
    return workouts.map((w) => ({ w, sets: sets.filter((s) => s.workoutId === w.id) }));
  }, []);

  const recentPrs = useLiveQuery(async () => {
    const prSets = await db.sets.filter((s) => !!s.pr && s.done).toArray();
    const workouts = new Map(
      (await db.workouts.bulkGet([...new Set(prSets.map((s) => s.workoutId))])).filter(Boolean).map((w) => [w!.id, w!]),
    );
    const finished = prSets
      .filter((s) => workouts.get(s.workoutId)?.endedAt)
      .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
      .slice(0, 5);
    const exercises = await db.exercises.bulkGet(finished.map((s) => s.exerciseId));
    return finished.map((s, i) => ({ s, name: exercises[i]?.name ?? '?', date: workouts.get(s.workoutId)!.startedAt }));
  }, []);

  const groups = new Map<string, NonNullable<typeof data>>();
  for (const row of data ?? []) {
    const key = new Date(row.w.startedAt).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
  }

  return (
    <>
      {data?.length === 0 && <p className="empty">Nog geen afgeronde workouts.</p>}
      {!!recentPrs?.length && (
        <section className="card pr-card">
          <h3>Recente PR's 🏆</h3>
          <ul className="pr-list">
            {recentPrs.map(({ s, name, date }) => (
              <li key={s.id}>
                <span className="grow">
                  <strong className="block">{name}</strong>
                  <span className="small">{describePr(s, s.pr!).detail}</span>
                </span>
                <span className="small muted">{fmtDate(date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {[...groups].map(([month, rows]) => (
        <section key={month}>
          <h2 className="section-title">{month}</h2>
          {rows.map(({ w, sets }) => (
            <button key={w.id} className="card list-card" onClick={() => onOpen(w.id)}>
              <div className="inline spread">
                <strong>{w.name}</strong>
                <span className="small muted">{fmtDate(w.startedAt)}</span>
              </div>
              <span className="small muted">
                {fmtDuration(w.endedAt! - w.startedAt)} · {sets.length} sets · {Math.round(volume(sets))} kg
              </span>
            </button>
          ))}
        </section>
      ))}
    </>
  );
}

export function WorkoutDetail({ workoutId, onClose }: { workoutId: number; onClose: () => void }) {
  const data = useLiveQuery(async () => {
    const w = await db.workouts.get(workoutId);
    if (!w) return null;
    const sets = await db.sets.where('workoutId').equals(workoutId).sortBy('order');
    const exercises = await db.exercises.bulkGet(w.exerciseIds);
    return { w, sets, exercises };
  }, [workoutId]);

  if (data === null) return null;
  if (!data) return null;
  const { w, sets, exercises } = data;

  async function remove(w: Workout) {
    if (confirm('Deze workout verwijderen?')) {
      await deleteWorkout(w.id);
      onClose();
    }
  }

  return (
    <Sheet title={w.name} onClose={onClose}>
      <p className="muted">
        {new Date(w.startedAt).toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' })}
        <br />
        {fmtDuration((w.endedAt ?? w.startedAt) - w.startedAt)} · {Math.round(volume(sets))} kg totaal volume
      </p>
      {w.exerciseIds.map((exId, i) => (
        <div key={exId} className="card">
          <h3>{exercises[i]?.name ?? '?'}</h3>
          <ol className="set-list">
            {sets
              .filter((s) => s.exerciseId === exId)
              .map((s) => (
                <li key={s.id} className={s.warmup ? 'muted' : ''}>
                  {fmtSet(s)}
                  {s.warmup && ' (warming-up)'}
                  {s.pr && <span title={describePr(s, s.pr).title}> 🏆</span>}
                </li>
              ))}
          </ol>
        </div>
      ))}
      <button className="btn danger-text block" onClick={() => remove(w)}>
        Workout verwijderen
      </button>
    </Sheet>
  );
}
