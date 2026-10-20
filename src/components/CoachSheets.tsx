import { useLiveQuery } from 'dexie-react-hooks';
import { db, fitWorkoutToTime, replaceExerciseInWorkout, type Exercise, type Workout } from '../db';
import { replacements } from '../coach';
import { EQUIPMENT_LABELS } from '../library/exercises';
import { showToast } from '../toast';
import { Sheet } from './Sheet';
import { Thumb } from './Thumb';

/** "Bezet?" — pick an exercise that trains the same, for when the machine or bench is taken. */
export function ReplaceSheet({
  workout,
  exercise,
  onClose,
}: {
  workout: Workout;
  exercise: Exercise;
  onClose: () => void;
}) {
  const all = useLiveQuery(() => db.exercises.toArray(), []);
  if (!all) return null;
  const options = replacements(exercise, all, workout.exerciseIds) as Exercise[];

  async function pick(next: Exercise) {
    const undo = await replaceExerciseInWorkout(workout.id, exercise.id, next);
    showToast(`${exercise.name} vervangen door ${next.name}`, undo);
    onClose();
  }

  return (
    <Sheet title="Bezet? Kies een vervanger" onClose={onClose}>
      <p className="small muted">
        Deze oefeningen trainen hetzelfde als {exercise.name}. Je open sets gaan mee; wat je al deed blijft staan.
      </p>
      {options.length === 0 ? (
        <p className="empty">Geen vervanger gevonden.</p>
      ) : (
        <ul className="list card">
          {options.map((o) => (
            <li key={o.id}>
              <button className="list-item" onClick={() => pick(o)}>
                <Thumb exercise={o} size={40} />
                <span className="grow">
                  <strong className="block">{o.name}</strong>
                  <span className="small muted">{EQUIPMENT_LABELS[o.equipment]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

const MINUTES = [15, 20, 30, 45, 60];

/** "Weinig tijd?" — fit what's left of the workout in the time you have. */
export function TimeSheet({ workout, left, onClose }: { workout: Workout; left: number; onClose: () => void }) {
  async function pick(minutes: number) {
    const r = await fitWorkoutToTime(workout.id, minutes);
    const parts = [
      r.dropped ? (r.dropped === 1 ? '1 oefening' : `${r.dropped} oefeningen`) : '',
      r.setsRemoved ? (r.setsRemoved === 1 ? '1 set' : `${r.setsRemoved} sets`) : '',
    ].filter(Boolean);
    showToast(
      parts.length
        ? `Ingekort tot ± ${r.minutes} min: ${parts.join(' en ')} minder`
        : `Past al: rust ingekort, ± ${r.minutes} min`,
      r.undo,
    );
    onClose();
  }

  return (
    <Sheet title="Weinig tijd?" onClose={onClose}>
      <p className="small muted">
        Je hebt nog ± {left} min aan sets staan. Hoeveel tijd heb je nog? De eerste twee oefeningen houden het langst
        hun sets; eerst wordt de rust korter, dan gaan er sets af en als laatste vallen de laatste oefeningen weg.
      </p>
      <div className="chips wrap">
        {MINUTES.map((m) => (
          <button key={m} className="chip big-chip" onClick={() => pick(m)} disabled={m >= left}>
            {m} min
          </button>
        ))}
      </div>
    </Sheet>
  );
}
