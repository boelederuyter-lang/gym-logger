import { useEffect, useState } from 'react';

/** Re-renders every `intervalMs` and returns the current timestamp. */
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
