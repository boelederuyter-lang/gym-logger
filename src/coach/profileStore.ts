import { useEffect, useState } from 'react';
import { normaliseerProfiel, type Profiel } from './profile';

// The questionnaire answers live in localStorage, next to the schema (see plan/store.ts), and go
// along in backups.
const KEY = 'coach.profiel.v1';

function load(): Profiel | null {
  try {
    return normaliseerProfiel(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return null;
  }
}

const listeners = new Set<(p: Profiel | null) => void>();
let current = load();

export function getProfiel(): Profiel | null {
  return current;
}

export function saveProfiel(next: Profiel | null) {
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable; keep in memory only
  }
  listeners.forEach((l) => l(current));
}

/** Restores a profile from a backup; ignores anything that isn't a valid profile. */
export function restoreProfiel(raw: unknown) {
  const p = normaliseerProfiel(raw);
  if (p) saveProfiel(p);
}

export function useProfiel(): Profiel | null {
  const [p, setP] = useState(current);
  useEffect(() => {
    listeners.add(setP);
    return () => void listeners.delete(setP);
  }, []);
  return p;
}
