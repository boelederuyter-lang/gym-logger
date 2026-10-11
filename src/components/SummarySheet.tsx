import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { fmtDuration, fmtSet, volume } from '../format';
import { describePr } from '../prs';
import { bestSet } from '../stats';
import { Sheet } from './Sheet';

export function SummarySheet({
  workoutId,
  onClose,
  onOpen,
}: {
  workoutId: number;
  onClose: () => void;
  onOpen: () => void;
}) {
  const data = useLiveQuery(async () => {
    const w = await db.workouts.get(workoutId);
    if (!w) return null;
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
    const exercises = await db.exercises.bulkGet(w.exerciseIds);
    return { w, sets, exercises };
  }, [workoutId]);
  if (!data) return null;
  const { w, sets, exercises } = data;
  const work = sets.filter((s) => s.done && !s.warmup);
  const prs = work.filter((s) => s.pr).sort((a, b) => a.order - b.order);
  const name = (id: number) => exercises.find((e) => e?.id === id)?.name ?? '?';

  return (
    <Sheet title="Workout voltooid" onClose={onClose}>
      <div className="summary-hero">
        <span className="summary-emoji">💪</span>
        <strong className="card-title big-title">{w.name}</strong>
        <span className="muted small">Goed gedaan, opgeslagen in je historie.</span>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="small muted">Duur</span>
          <strong className="num">{fmtDuration((w.endedAt ?? Date.now()) - w.startedAt)}</strong>
        </div>
        <div className="stat">
          <span className="small muted">Sets</span>
          <strong className="num">{work.length}</strong>
        </div>
        <div className="stat">
          <span className="small muted">Volume</span>
          <strong className="num">{Math.round(volume(sets)).toLocaleString('nl-NL')} kg</strong>
        </div>
      </div>

      {prs.length > 0 && (
        <section className="card pr-card">
          <h3>{prs.length === 1 ? 'Nieuw record 🏆' : `${prs.length} nieuwe records 🏆`}</h3>
          <ul className="pr-list">
            {prs.map((s) => {
              const d = describePr(s, s.pr!);
              return (
                <li key={s.id}>
                  <span className="grow">
                    <strong className="block">{name(s.exerciseId)}</strong>
                    <span className="small">{d.detail}</span>
                  </span>
                  <span className="small muted">{d.previous}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>Beste set per oefening</h3>
        <ul className="pr-list">
          {w.exerciseIds.map((id) => {
            const best = bestSet(work.filter((s) => s.exerciseId === id));
            return (
              best && (
                <li key={id}>
                  <span className="grow">{name(id)}</span>
                  <strong className="num">{fmtSet(best)}</strong>
                </li>
              )
            );
          })}
        </ul>
      </section>

      <button className="btn secondary block" onClick={onOpen}>
        Bekijk workout
      </button>
      <button className="btn primary block big" onClick={onClose}>
        Klaar
      </button>
    </Sheet>
  );
}
