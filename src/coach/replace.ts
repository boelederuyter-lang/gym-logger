import type { Equipment } from '../library/exercises';
import { COACH_BY_ID, type EigenCoachInfo, type Patroon } from './exercises';

// ---------- "Bezet" — a replacement that trains the same thing ----------

export interface CoachExercise {
  id: number;
  name: string;
  slug?: string;
  muscle: string;
  equipment: Equipment;
  coach?: EigenCoachInfo;
}

/** The movement pattern (squat, hinge, horizontaal duwen, …) of an exercise, when known. */
export function patternOf(ex: Pick<CoachExercise, 'slug' | 'coach'>): Patroon | undefined {
  return (ex.slug && COACH_BY_ID.get(ex.slug)?.patroon) || ex.coach?.patroon || undefined;
}

function primaryOf(ex: Pick<CoachExercise, 'slug' | 'coach'>): string | undefined {
  return (ex.slug && COACH_BY_ID.get(ex.slug)?.primair[0]) || ex.coach?.primair?.[0];
}

/**
 * Replacements for an exercise whose machine or bench is taken. The fixed alternatives from the
 * coach database come first, then other exercises with the same movement pattern (for isolation
 * exercises: the same main muscle), other equipment first. Without a known pattern we fall back
 * to the muscle group. Never one that is already in the workout.
 */
export function replacements(
  ex: CoachExercise,
  all: CoachExercise[],
  exclude: number[] = [],
  max = 8,
): CoachExercise[] {
  const pattern = patternOf(ex);
  const primary = primaryOf(ex);
  const fixed = (ex.slug && COACH_BY_ID.get(ex.slug)?.alternatieven) || [];
  const skip = new Set([ex.id, ...exclude]);
  const fits = (o: CoachExercise) => {
    if (!pattern) return o.muscle === ex.muscle;
    if (patternOf(o) !== pattern) return false;
    return pattern !== 'isolatie' || !primary || primaryOf(o) === primary;
  };
  const rank = (o: CoachExercise) => {
    const i = o.slug ? fixed.indexOf(o.slug) : -1;
    return i >= 0 ? i : 100 + Number(o.equipment === ex.equipment) * 10 + Number(o.muscle !== ex.muscle);
  };
  return all
    .filter((o) => !skip.has(o.id) && (fits(o) || (o.slug !== undefined && fixed.includes(o.slug))))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, max);
}
