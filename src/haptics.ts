import { vibrate } from './audio';

// Trillen bij records en als de rust voorbij is.
//
// In de App Store-app (Capacitor, fase 6) gebruiken we de echte iPhone-haptics via de
// Haptics-plugin. In de browser proberen we navigator.vibrate: dat werkt op Android, maar
// Safari op de iPhone ondersteunt het niet, dus daar gebeurt dan niets.

interface NativeHaptics {
  notification(options: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }): Promise<void>;
}

function native(): NativeHaptics | undefined {
  const cap = (
    globalThis as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { Haptics?: NativeHaptics } } }
  ).Capacitor;
  return cap?.isNativePlatform?.() ? cap.Plugins?.Haptics : undefined;
}

/** Een feestelijk tikje bij een nieuw record. */
export function hapticRecord() {
  const h = native();
  if (h) void h.notification({ type: 'SUCCESS' }).catch(() => {});
  else vibrate([40, 60, 40]);
}

/** Een duidelijke trilling als je rust voorbij is. */
export function hapticRestDone() {
  const h = native();
  if (h) void h.notification({ type: 'WARNING' }).catch(() => {});
  else vibrate([200, 100, 200]);
}
