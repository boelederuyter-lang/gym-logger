import type { Workout } from '../db';
import { PlanScreen } from './PlanScreen';
import { TemplatesScreen } from './TemplatesScreen';

export type TrainView = 'schema' | 'programs';

const KEY = 'gym-logger-train-view';

/** Last chosen view; without one, the schema if you have one, otherwise your programs. */
export function initialTrainView(hasPlan: boolean): TrainView {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'schema' || v === 'programs') return v;
  } catch {
    // storage unavailable
  }
  return hasPlan ? 'schema' : 'programs';
}

interface Props {
  view: TrainView;
  onView: (v: TrainView) => void;
  active?: Workout;
  onOpenWorkout: () => void;
  onEditTemplate: (id?: number) => void;
}

/** One tab for everything you train from: the generated schema and your own programs. */
export function TrainScreen({ view, onView, active, onOpenWorkout, onEditTemplate }: Props) {
  function choose(v: TrainView) {
    onView(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      // storage unavailable
    }
  }

  return (
    <div className="screen train">
      <div className="train-switch">
        <div className="segmented">
          <button className={view === 'schema' ? 'active' : ''} onClick={() => choose('schema')}>
            Schema
          </button>
          <button className={view === 'programs' ? 'active' : ''} onClick={() => choose('programs')}>
            Programma's
          </button>
        </div>
      </div>
      {view === 'schema' ? (
        <PlanScreen active={active} onOpenWorkout={onOpenWorkout} />
      ) : (
        <TemplatesScreen onEdit={onEditTemplate} />
      )}
    </div>
  );
}
