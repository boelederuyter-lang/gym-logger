import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type Workout } from '../db';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { setSettings, useSettings } from '../settings';
import type { VoiceControl } from './useVoice';

const EXAMPLES: [string, string[]][] = [
  [
    'Sets',
    ['8 reps 60 kilo', '60 kg voor 8', 'acht keer zestig kilo', '62 komma 5 voor 6', '60 en een half kilo voor 8'],
  ],
  ['Meerdere sets', ['3 sets van 8 met 60', '8, 8 en 7 met 60 kilo']],
  [
    'Inzet',
    ['8 reps 60 kilo tot falen', '10 keer 62,5 RIR 2', '2 over', '5 reps 100 kilo RPE 8', 'warming-up 10 keer 20 kilo'],
  ],
  ['Snel herhalen', ['nog een', 'zelfde', 'plus 2,5 voor 6', '2,5 kilo erbij']],
  ['Oefeningen', ['bankdrukken 5 reps 80', 'bench', 'volgende oefening', 'vorige oefening', 'voeg dips toe']],
  [
    'Rust en meer',
    ['rust 2 minuten', 'rust anderhalve minuut', 'rust 90', 'stop timer', 'ongedaan maken', 'stop met luisteren'],
  ],
];

export function VoiceSheet({
  workout,
  voice,
  onClose,
}: {
  workout: Workout;
  voice: VoiceControl;
  onClose: () => void;
}) {
  const settings = useSettings();
  const [text, setText] = useState('');
  const names = useLiveQuery(() => db.exercises.bulkGet(workout.exerciseIds), [workout.exerciseIds.join()]);
  const { state } = voice;

  function submit() {
    if (!text.trim()) return;
    void voice.submitText(text);
    setText('');
  }

  return (
    <Sheet title="Spraak" onClose={onClose}>
      <label className="field">
        <span>Oefening</span>
        <select value={state.activeExerciseId ?? ''} onChange={(e) => voice.choose(Number(e.target.value))}>
          {workout.exerciseIds.map((id, i) => (
            <option key={id} value={id}>
              {names?.[i]?.name ?? '…'}
            </option>
          ))}
        </select>
      </label>

      <div className={`transcript ${state.listening ? 'live' : ''}`} aria-live="polite">
        {state.interim || state.lastResult || (state.listening ? 'Ik luister…' : 'Zeg bijvoorbeeld “8 reps 60 kilo”')}
      </div>

      {state.error && <p className="voice-error">{state.error}</p>}

      {state.supported && (
        <>
          <button className={`talk-btn ${state.listening ? 'live' : ''}`} onClick={voice.talkOnce}>
            <Icon name="mic" size={30} />
            {state.listening ? 'Ik luister…' : 'Tik en praat'}
          </button>
          <button
            className="btn secondary-blue block"
            onClick={() => {
              voice.startHandsfree();
              onClose();
            }}
          >
            Handsfree: blijf luisteren
          </button>
        </>
      )}

      <label className="switch-row">
        <span>Bevestiging uitspreken</span>
        <input
          type="checkbox"
          className="switch"
          checked={settings.voiceSpeak}
          onChange={(e) => setSettings({ voiceSpeak: e.target.checked })}
        />
      </label>

      <form
        className="text-command"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Of typ: 8 reps 60 kilo"
          enterKeyHint="send"
          autoCapitalize="off"
        />
        <button className="btn primary" type="submit" disabled={!text.trim()}>
          OK
        </button>
      </form>

      <details className="card examples">
        <summary>Wat kun je zeggen?</summary>
        {EXAMPLES.map(([title, lines]) => (
          <div key={title}>
            <h4>{title}</h4>
            <ul>
              {lines.map((l) => (
                <li key={l}>“{l}”</li>
              ))}
            </ul>
          </div>
        ))}
      </details>
    </Sheet>
  );
}

export function HandsfreeBar({ voice }: { voice: VoiceControl }) {
  const { state } = voice;
  if (!state.handsfree) return null;
  return (
    <div className="handsfree-bar" role="status">
      <span className="hf-pulse" aria-hidden="true" />
      <span className="grow">
        <strong className="block">{state.activeLabel}</strong>
        <span className="small block hf-text">{state.interim || state.lastResult || 'Ik luister…'}</span>
      </span>
      <button className="hf-btn" onClick={() => void voice.undoLast()}>
        Terug
      </button>
      <button className="hf-btn" onClick={voice.stopHandsfree}>
        Stop
      </button>
    </div>
  );
}
