import { EQUIPMENT_LABELS, type Equipment } from './exercises';

/** Lowercase, without accents and punctuation, single spaces. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface Searchable {
  name: string;
  aliases?: string[];
  muscle: string;
  equipment: Equipment;
}

export function matches(ex: Searchable, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize([ex.name, ...(ex.aliases ?? []), ex.muscle, EQUIPMENT_LABELS[ex.equipment] ?? ''].join(' | '));
  return q.split(' ').every((word) => hay.includes(word));
}
