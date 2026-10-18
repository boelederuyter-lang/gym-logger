export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Plates per side for a barbell total, largest first; `rest` is what can't be made with these plates. */
export function platesPerSide(total: number, bar: number, plates = PLATES): { plates: number[]; rest: number } | null {
  if (!(total > bar)) return null;
  let side = Math.round(((total - bar) / 2) * 1000) / 1000;
  const out: number[] = [];
  for (const p of plates) {
    while (side >= p - 1e-9) {
      out.push(p);
      side = Math.round((side - p) * 1000) / 1000;
    }
  }
  return { plates: out, rest: side };
}
