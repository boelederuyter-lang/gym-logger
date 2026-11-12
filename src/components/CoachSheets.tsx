import { useLiveQuery } from 'dexie-react-hooks';
import { db, fitWorkoutToTime, replaceExerciseInWorkout, type Exercise, type Workout } from '../db';
import { replacements } from '../coach/replace';
import { EQUIPMENT_LABELS } from '../library/exercises';
import { showToast } from '../toast';
import { Sheet } from './Sheet';
import { Thumb } from './Thumb';
import { tr } from '../i18n';

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
    showToast(tr(`${exercise.name} vervangen door ${next.name}`, `${exercise.name} replaced by ${next.name}`), undo);
    onClose();
  }

  return (
    <Sheet title={tr('Bezet? Kies een vervanger', 'Taken? Pick a replacement')} onClose={onClose}>
      <p className="small muted">
        {tr(
          `Deze oefeningen trainen hetzelfde als ${exercise.name}. Je open sets gaan mee; wat je al deed blijft staan.`,
          `These exercises train the same as ${exercise.name}. Your open sets move over; what you already did stays.`,
        )}
      </p>
      {options.length === 0 ? (
        <p className="empty">{tr('Geen vervanger gevonden.', 'No replacement found.')}</p>
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
      r.dropped
        ? r.dropped === 1
          ? tr('1 oefening', '1 exercise')
          : tr(`${r.dropped} oefeningen`, `${r.dropped} exercises`)
        : '',
      r.setsRemoved ? (r.setsRemoved === 1 ? '1 set' : `${r.setsRemoved} sets`) : '',
    ].filter(Boolean);
    showToast(
      parts.length
        ? tr(
            `Ingekort tot ± ${r.minutes} min: ${parts.join(' en ')} minder`,
            `Shortened to ± ${r.minutes} min: ${parts.join(' and ')} fewer`,
          )
        : tr(`Past al: rust ingekort, ± ${r.minutes} min`, `Already fits: rest shortened, ± ${r.minutes} min`),
      r.undo,
    );
    onClose();
  }

  return (
    <Sheet title={tr('Weinig tijd?', 'Short on time?')} onClose={onClose}>
      <p className="small muted">
        {tr(
          `Je hebt nog ± ${left} min aan sets staan. Hoeveel tijd heb je nog? De eerste twee oefeningen houden het langst hun sets; eerst wordt de rust korter, dan gaan er sets af en als laatste vallen de laatste oefeningen weg.`,
          `You have about ${left} min of sets left. How much time do you have? The first two exercises keep their sets longest; first rest gets shorter, then sets come off, and finally the last exercises are dropped.`,
        )}
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
