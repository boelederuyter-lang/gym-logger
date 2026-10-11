import { useEffect, useState } from 'react';

export interface ToastMsg {
  id: number;
  text: string;
  undo?: () => void | Promise<void>;
}

let current: ToastMsg | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<(t: ToastMsg | null) => void>();

function emit() {
  listeners.forEach((l) => l(current));
}

export function showToast(text: string, undo?: ToastMsg['undo'], ms = 5000) {
  current = { id: nextId++, text, undo };
  clearTimeout(timer);
  timer = setTimeout(hideToast, ms);
  emit();
}

export function hideToast() {
  current = null;
  clearTimeout(timer);
  emit();
}

export function useToast(): ToastMsg | null {
  const [t, setT] = useState(current);
  useEffect(() => {
    listeners.add(setT);
    return () => void listeners.delete(setT);
  }, []);
  return t;
}
