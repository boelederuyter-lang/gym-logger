import { useEffect, useState } from 'react';
import { playTones } from './audio';
import { hapticRecord } from './haptics';

export interface PrBannerMsg {
  id: number;
  exercise: string;
  detail: string;
  previous: string;
}

let current: PrBannerMsg | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<(m: PrBannerMsg | null) => void>();

const emit = () => listeners.forEach((l) => l(current));

export function showPrBanner(msg: Omit<PrBannerMsg, 'id'>) {
  current = { ...msg, id: nextId++ };
  hapticRecord();
  playTones([784, 988, 1319], 0, 0.12, 0.1, 0.25);
  clearTimeout(timer);
  timer = setTimeout(hidePrBanner, 4000);
  emit();
}

export function hidePrBanner() {
  current = null;
  clearTimeout(timer);
  emit();
}

export function usePrBanner(): PrBannerMsg | null {
  const [m, setM] = useState(current);
  useEffect(() => {
    listeners.add(setM);
    return () => void listeners.delete(setM);
  }, []);
  return m;
}
