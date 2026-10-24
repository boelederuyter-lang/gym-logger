// ---------- "Weinig tijd" — fit the rest of the workout in N minutes ----------

export interface TimeItem {
  id: number;
  openSets: number; // work sets not done yet
  rest: number; // seconds
}

export interface TimePlan {
  sets: Record<number, number>; // open sets to keep per exercise
  rest: Record<number, number>; // new rest per exercise
  dropped: number[]; // exercises left out entirely
  minutes: number; // estimated time for what is left
}

const SET_SECONDS = 40;

export function estimateSeconds(items: { openSets: number; rest: number }[]): number {
  return items.reduce((sum, i) => sum + i.openSets * (SET_SECONDS + i.rest), 0);
}

/**
 * Shortens what's left of a workout to fit `minutes`. The first exercises are the main lifts and
 * are protected longest: first rest gets shorter (main lifts max 2 min, the rest max 1 min), then
 * sets come off from the back (never below 2 for main lifts, 1 for the rest), then the last
 * exercises are left out.
 */
export function fitToTime(items: TimeItem[], minutes: number): TimePlan {
  const budget = minutes * 60;
  const main = (i: number) => i < 2;
  const plan = items.map((it, i) => ({ ...it, rest: Math.min(it.rest, main(i) ? 120 : 60) }));
  const total = () => estimateSeconds(plan.filter((p) => p.openSets > 0));

  let changed = true;
  while (total() > budget && changed) {
    changed = false;
    for (let i = plan.length - 1; i >= 0; i--) {
      if (plan[i].openSets > (main(i) ? 2 : 1)) {
        plan[i].openSets--;
        changed = true;
        break;
      }
    }
    if (!changed) {
      for (let i = plan.length - 1; i >= 1; i--) {
        if (plan[i].openSets > 0) {
          plan[i].openSets = 0;
          changed = true;
          break;
        }
      }
    }
  }

  const result: TimePlan = { sets: {}, rest: {}, dropped: [], minutes: Math.round(total() / 60) };
  plan.forEach((p, i) => {
    if (items[i].openSets > 0 && p.openSets === 0) result.dropped.push(p.id);
    else result.sets[p.id] = p.openSets;
    result.rest[p.id] = p.rest;
  });
  return result;
}
