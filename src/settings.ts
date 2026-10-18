import { useEffect, useState } from 'react';

export interface Settings {
  barWeight: number; // empty barbell in kg
  weightStep: number; // smallest weight increment in kg
  restBeep: boolean; // beep when the rest timer ends
  lastBackupAt?: number;
  backupSnoozedUntil?: number;
}

const DEFAULTS: Settings = { barWeight: 20, weightStep: 2.5, restBeep: true };
const KEY = 'gym-logger-settings';

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

const listeners = new Set<(s: Settings) => void>();
let current = load();

export function getSettings(): Settings {
  return current;
}

export function setSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // storage unavailable; keep in memory only
  }
  listeners.forEach((l) => l(current));
}

export function useSettings(): Settings {
  const [s, setS] = useState(current);
  useEffect(() => {
    listeners.add(setS);
    return () => void listeners.delete(setS);
  }, []);
  return s;
}
