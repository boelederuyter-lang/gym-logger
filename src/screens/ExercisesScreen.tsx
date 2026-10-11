import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../db';
import { NewExerciseSheet } from '../components/ExercisePicker';
import { Sheet } from '../components/Sheet';
import { e1rm, fmtDate, fmtSet, fmtWeight } from '../format';
import { MUSCLES } from '../seed';

export function ExercisesScreen() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (exercises ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
    return MUSCLES.map((m) => [m, list.filter((e) => e.muscle === m)] as const).filter(([, l]) => l.length);
  }, [exercises, query]);

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Oefeningen</h1>
        <button className="link strong" onClick={() => setCreating(true)}>
          + Nieuw
        </button>
      </header>
      <main className="content">
        <input className="search" type="search" placeholder="Zoeken…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {grouped.map(([muscle, list]) => (
          <section key={muscle}>
            <h2 className="section-title">{muscle}</h2>
            <ul className="list card">
              {list.map((ex) => (
                <li key={ex.id}>
                  <button className="list-item" onClick={() => setOpenId(ex.id)}>
                    <span>{ex.name}</span>
                    <span className="muted">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      {creating && <NewExerciseSheet onClose={() => setCreating(false)} />}
      {openId != null && <ExerciseDetail exerciseId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ExerciseDetail({ exerciseId, onClose }: { exerciseId: number; onClose: () => void }) {
  const data = useLiveQuery(async () => {
    const ex = await db.exercises.get(exerciseId);
    const sets = await db.sets.where('exerciseId').equals(exerciseId).filter((s) => s.done).toArray();
    const workouts = await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))]);
    const sessions = workouts
      .filter((w) => w?.endedAt)
      .map((w) => ({ w: w!, sets: sets.filter((s) => s.workoutId === w!.id).sort((a, b) => a.order - b.order) }))
      .sort((a, b) => b.w.startedAt - a.w.startedAt);
    return { ex, sessions };
  }, [exerciseId]);

  if (!data?.ex) return null;
  const { ex, sessions } = data;
  const all = sessions.flatMap((s) => s.sets);
  const heaviest = all.reduce<(typeof all)[number] | undefined>((a, b) => (!a || (b.weight ?? 0) > (a.weight ?? 0) ? b : a), undefined);
  const best1rm = Math.max(0, ...all.map(e1rm));

  async function remove() {
    if (all.length > 0) {
      alert('Deze oefening zit in je historie en kan daarom niet verwijderd worden.');
      return;
    }
    if (confirm(`${ex!.name} verwijderen?`)) {
      await db.exercises.delete(exerciseId);
      onClose();
    }
  }

  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="stats">
        <div className="stat">
          <span className="small muted">Zwaarste set</span>
          <strong>{heaviest ? fmtSet(heaviest) : '–'}</strong>
        </div>
        <div className="stat">
          <span className="small muted">Geschat 1RM</span>
          <strong>{best1rm ? `${fmtWeight(Math.round(best1rm * 2) / 2)} kg` : '–'}</strong>
        </div>
        <div className="stat">
          <span className="small muted">Keer gedaan</span>
          <strong>{sessions.length}</strong>
        </div>
      </div>
      {sessions.length === 0 && <p className="empty">Nog niet gedaan.</p>}
      {sessions.map(({ w, sets }) => (
        <div key={w.id} className="card">
          <div className="inline spread">
            <strong>{w.name}</strong>
            <span className="small muted">{fmtDate(w.startedAt)}</span>
          </div>
          <span className="small">{sets.map(fmtSet).join(' · ')}</span>
        </div>
      ))}
      {ex.custom && (
        <button className="btn danger-text block" onClick={remove}>
          Oefening verwijderen
        </button>
      )}
    </Sheet>
  );
}
