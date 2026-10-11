import { useEffect, useState } from 'react';

export interface RestState {
  endsAt: number;
  total: number;
}

let state: RestState | null = null;
const listeners = new Set<(s: RestState | null) => void>();

let audio: AudioContext | null = null;
let beep: OscillatorNode | null = null;

function emit() {
  listeners.forEach((l) => l(state));
}

// iOS only lets us play sound after a user gesture, so the beep is scheduled
// up-front on the audio clock while we're still inside the tap handler.
function scheduleBeep() {
  beep?.stop();
  beep = null;
  if (!state) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const delay = Math.max(0, (state.endsAt - Date.now()) / 1000);
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0, t);
    for (let i = 0; i < 3; i++) {
      gain.gain.setValueAtTime(0.3, t + i * 0.25);
      gain.gain.setValueAtTime(0, t + i * 0.25 + 0.15);
    }
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(t + 0.8);
    beep = osc;
  } catch {
    // no audio available; the visual timer still works
  }
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
