import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteWorkout, type Workout } from '../db';
import { Sheet } from '../components/Sheet';
import { fmtDate, fmtDuration, fmtSet, volume } from '../format';

export function HistoryScreen({ onOpen }: { onOpen: (id: number) => void }) {
  const data = useLiveQuery(async () => {
    const workouts = (await db.workouts.orderBy('startedAt').reverse().toArray()).filter((w) => w.endedAt);
    const sets = await db.sets.toArray();
    return workouts.map((w) => ({ w, sets: sets.filter((s) => s.workoutId === w.id) }));
  }, []);

  const groups = new Map<string, NonNullable<typeof data>>();
  for (const row of data ?? []) {
    const key = new Date(row.w.startedAt).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
  }

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Historie</h1>
      </header>
      <main className="content">
        {data?.length === 0 && <p className="empty">Nog geen afgeronde workouts.</p>}
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
      </main>
    </div>
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
                <li key={s.id}>{fmtSet(s)}</li>
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
