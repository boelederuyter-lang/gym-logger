let ctx: AudioContext | null = null;

/**
 * Plays a short sequence of tones `delay` seconds from now and returns a stop function.
 * iOS only allows audio after a user gesture, so call this from (or schedule it in) a tap handler.
 */
export function playTones(freqs: number[], delay = 0, step = 0.25, length = 0.15, volume = 0.3): () => void {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    const t = ctx.currentTime + Math.max(0, delay);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // A gain node starts at full volume (1.0): keep it silent until the first tone.
    gain.gain.setValueAtTime(0, ctx.currentTime);
    freqs.forEach((f, i) => {
      osc.frequency.setValueAtTime(f, t + i * step);
      gain.gain.setValueAtTime(volume, t + i * step);
      gain.gain.setValueAtTime(0, t + i * step + length);
    });
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + freqs.length * step + 0.05);
    return () => {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    };
  } catch {
    return () => {};
  }
}

/** Short buzz; not supported on iPhone, where this silently does nothing. */
export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}
