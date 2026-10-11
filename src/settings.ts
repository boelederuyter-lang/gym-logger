import { useEffect, useState } from 'react';

export interface Settings {
  barWeight: number; // empty barbell in kg
  weightStep: number; // smallest weight increment in kg
  voiceSpeak: boolean; // speak a confirmation after a voice command
}

const DEFAULTS: Settings = { barWeight: 20, weightStep: 2.5, voiceSpeak: false };
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
