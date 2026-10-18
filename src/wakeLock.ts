import { useEffect } from 'react';

interface Sentinel {
  release(): Promise<void>;
}

/**
 * Keeps the screen on while `enabled` (supported on iPhone from iOS 16.4). The lock is dropped
 * by the system when the app goes to the background, so it is requested again on return.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }).wakeLock;
    if (!enabled || !wl) return;
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const s = await wl.request('screen');
        if (cancelled) void s.release();
        else sentinel = s;
      } catch {
        // not allowed right now (e.g. low power mode); the app still works
      }
    };
    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void sentinel?.release();
    };
  }, [enabled]);
}
