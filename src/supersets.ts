export interface SupersetInfo {
  label: string; // "A", "B", …
  position: number; // 1-based within the superset
  size: number;
  last: boolean; // rest only starts after the last exercise of a superset
}

/**
 * Supersets are stored as the exercises that are linked to the next one in the list.
 * Consecutive links form one superset; they get letters A, B, … in order.
 */
export function supersetInfo(ids: number[], linked: number[] = []): Map<number, SupersetInfo> {
  const out = new Map<number, SupersetInfo>();
  const link = new Set(linked);
  let letter = 0;
  for (let i = 0; i < ids.length; i++) {
    if (!link.has(ids[i]) || i === ids.length - 1) continue;
    let end = i;
    while (end < ids.length - 1 && link.has(ids[end])) end++;
    const label = String.fromCharCode(65 + letter++);
    for (let k = i; k <= end; k++) out.set(ids[k], { label, position: k - i + 1, size: end - i + 1, last: k === end });
    i = end;
  }
  return out;
}

/** Keeps only links that still point to a next exercise (after removing or reordering). */
export function cleanLinks(ids: number[], linked: number[] = []): number[] {
  return linked.filter((id) => {
    const i = ids.indexOf(id);
    return i >= 0 && i < ids.length - 1;
  });
}

export function toggleLink(linked: number[] = [], id: number): number[] {
  return linked.includes(id) ? linked.filter((x) => x !== id) : [...linked, id];
}
