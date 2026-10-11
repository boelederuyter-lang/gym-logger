import { useEffect, useState } from 'react';
import { playTones } from './audio';

export interface RestState {
  endsAt: number;
  total: number;
}

let state: RestState | null = null;
const listeners = new Set<(s: RestState | null) => void>();

let stopBeep: (() => void) | null = null;

function emit() {
  listeners.forEach((l) => l(state));
}

// The beep is scheduled up-front on the audio clock while we're still inside the tap handler.
function scheduleBeep() {
  stopBeep?.();
  stopBeep = null;
  if (!state) return;
  stopBeep = playTones([880, 880, 880], (state.endsAt - Date.now()) / 1000);
}

export function startRest(seconds: number) {
  state = { endsAt: Date.now() + seconds * 1000, total: seconds };
  scheduleBeep();
  emit();
}

export function adjustRest(deltaSeconds: number) {
  if (!state) return;
  state = { endsAt: state.endsAt + deltaSeconds * 1000, total: Math.max(1, state.total + deltaSeconds) };
  scheduleBeep();
  emit();
}

export function stopRest() {
  state = null;
  scheduleBeep();
  emit();
}

export function useRest(): RestState | null {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    return () => void listeners.delete(setS);
  }, []);
  return s;
}
