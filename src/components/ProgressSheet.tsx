import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { e1rm, fmtDate, fmtSet, fmtWeight } from '../format';
import { Sheet } from './Sheet';

export function ProgressSheet({ exerciseId, onClose }: { exerciseId: number; onClose: () => void }) {
  const data = useLiveQuery(async () => {
    const ex = await db.exercises.get(exerciseId);
    const sets = await db.sets
      .where('exerciseId')
      .equals(exerciseId)
      .filter((s) => s.done && !s.warmup)
      .toArray();
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
    </Sheet>
  );
}
