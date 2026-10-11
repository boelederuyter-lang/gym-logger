import type { Equipment } from './exercises';

export interface ExerciseDefaults {
  sets: number;
  reps: number;
  rest: number;
}

/** Starting sets, reps and rest when an exercise is added to a workout or program. */
export function defaultsFor(ex: { muscle: string; equipment: Equipment }): ExerciseDefaults {
  if (ex.muscle === 'Core' || ex.muscle === 'Hele lichaam') return { sets: 3, reps: 15, rest: 60 };
  if (ex.equipment === 'barbell') return { sets: 3, reps: 8, rest: 150 };
  if (ex.equipment === 'machine' || ex.equipment === 'cable') return { sets: 3, reps: 12, rest: 90 };
  return { sets: 3, reps: 10, rest: 90 };
}
