// Thin wrapper around the Web Speech API (webkitSpeechRecognition on iPhone).

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [i: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const speechSupported = () => typeof window !== 'undefined' && !!ctor();

export interface Handlers {
  onInterim: (text: string) => void;
  onFinal: (alternatives: string[]) => void;
  onError: (code: string) => void;
  onEnd: () => void;
}

export function createRecognizer(continuous: boolean, h: Handlers): Recognition {
  const C = ctor()!;
  const r = new C();
  r.lang = 'nl-NL';
  r.continuous = continuous;
  r.interimResults = true;
  r.maxAlternatives = 3;
  r.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) {
        const alts: string[] = [];
        for (let k = 0; k < res.length; k++) alts.push(res[k].transcript.trim());
        h.onFinal(alts.filter(Boolean));
      } else {
        h.onInterim(res[0].transcript);
      }
    }
  };
  r.onerror = (e) => h.onError(e.error);
  r.onend = () => h.onEnd();
  return r;
}

export const BLOCKED = new Set(['not-allowed', 'service-not-allowed']);
// Silence and our own aborts are not failures.
const HARMLESS = new Set(['no-speech', 'aborted']);

export function errorMessage(code: string): string {
  if (BLOCKED.has(code))
    return 'De microfoon is geblokkeerd. Sta hem toe in de instellingen van je browser, of typ hieronder.';
  if (code === 'audio-capture') return 'Geen microfoon gevonden.';
  if (code === 'network') return 'Spraakherkenning heeft internet nodig. Typ je set hieronder.';
  if (code === 'no-speech') return 'Ik hoorde niets. Probeer het nog eens.';
  return 'Spraakherkenning lukte niet. Probeer het opnieuw of typ hieronder.';
}

/** One utterance: listens until the first final result. */
export function listenOnce(h: Omit<Handlers, 'onEnd'> & { onEnd?: () => void }): () => void {
  const r = createRecognizer(false, {
    onInterim: h.onInterim,
    onFinal: h.onFinal,
    onError: h.onError,
    onEnd: () => h.onEnd?.(),
  });
  try {
    r.start();
  } catch {
    h.onError('start');
  }
  return () => r.abort();
}

/**
 * Continuous listening that restarts itself after `onend` (iOS ends sessions often).
 * Stops after 5 failures in a row or when the microphone is blocked.
 */
export class Handsfree {
  private rec: Recognition | null = null;
  private active = false;
  private paused = false;
  private failures = 0;

  constructor(
    private h: {
      onInterim: (t: string) => void;
      onFinal: (alts: string[]) => void;
      onStop: (reason?: string) => void;
    },
  ) {}

  get running() {
    return this.active;
  }

  start() {
    this.active = true;
    this.paused = false;
    this.failures = 0;
    this.spawn();
  }

  /** Pause while the app is speaking, so it doesn't hear itself. */
  pause() {
    this.paused = true;
    this.rec?.abort();
  }

  resume() {
    if (!this.active) return;
    this.paused = false;
    this.spawn();
  }

  stop(reason?: string) {
    if (!this.active) return;
    this.active = false;
    this.rec?.abort();
    this.rec = null;
    this.h.onStop(reason);
  }

  private spawn() {
    if (!this.active || this.paused) return;
    const rec = createRecognizer(true, {
      onInterim: (t) => this.h.onInterim(t),
      onFinal: (alts) => {
        this.failures = 0;
        this.h.onFinal(alts);
      },
      onError: (code) => {
        if (BLOCKED.has(code)) return this.stop(errorMessage(code));
        if (HARMLESS.has(code)) return;
        if (++this.failures >= 5) this.stop('Gestopt na 5 fouten op rij.');
      },
      onEnd: () => {
        if (this.rec === rec && this.active && !this.paused) setTimeout(() => this.spawn(), 300);
      },
    });
    this.rec = rec;
    try {
      rec.start();
    } catch {
      if (++this.failures >= 5) this.stop('Gestopt na 5 fouten op rij.');
    }
  }
}

/** Speaks Dutch text; calls `done` when finished (or immediately when unsupported). */
export function speak(text: string, done: () => void) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) return done();
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'nl-NL';
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('nl'));
  if (voice) u.voice = voice;
  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;
    done();
  };
  u.onend = end;
  u.onerror = end;
  setTimeout(end, 8000); // safety net: some browsers never fire onend
  synth.speak(u);
}

/** "Rust 2 minuten 30" style phrase for spoken confirmations. */
export function spokenRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} seconden`;
  const min = m === 1 ? '1 minuut' : `${m} minuten`;
  return s ? `${min} ${s}` : min;
}
