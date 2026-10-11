import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db, type Equipment, type Exercise } from '../db';
import { MUSCLES } from '../seed';
import { Sheet } from './Sheet';

interface Props {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
  exclude?: number[];
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Stang',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Kabel',
  bodyweight: 'Lichaamsgewicht',
  other: 'Overig',
};

export function ExercisePicker({ onPick, onClose, exclude = [] }: Props) {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (exercises ?? []).filter(
      (e) => !exclude.includes(e.id) && (!muscle || e.muscle === muscle) && (!q || e.name.toLowerCase().includes(q)),
    );
  }, [exercises, query, muscle, exclude]);

  if (creating) {
    return (
      <NewExerciseSheet
        initialName={query}
        onClose={() => setCreating(false)}
        onCreated={(ex) => onPick(ex)}
      />
    );
  }

  return (
    <Sheet title="Oefening kiezen" onClose={onClose} action={<button className="link" onClick={() => setCreating(true)}>Nieuw</button>}>
      <input
        className="search"
        type="search"
        placeholder="Zoeken…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chips">
        {MUSCLES.map((m) => (
          <button key={m} className={`chip ${muscle === m ? 'active' : ''}`} onClick={() => setMuscle(muscle === m ? null : m)}>
            {m}
          </button>
        ))}
      </div>
      <ul className="list">
        {filtered.map((ex) => (
          <li key={ex.id}>
            <button className="list-item" onClick={() => onPick(ex)}>
              <span>{ex.name}</span>
              <span className="muted small">{ex.muscle}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="empty">
            Niets gevonden.{' '}
            <button className="link" onClick={() => setCreating(true)}>
              “{query || 'Nieuwe oefening'}” toevoegen
            </button>
          </li>
        )}
      </ul>
    </Sheet>
  );
}

export function NewExerciseSheet({
  initialName = '',
  onClose,
  onCreated,
}: {
  initialName?: string;
  onClose: () => void;
  onCreated?: (ex: Exercise) => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState(MUSCLES[0]);
  const [equipment, setEquipment] = useState<Equipment>('barbell');

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = await db.exercises.add({ name: trimmed, muscle, equipment, custom: true } as Exercise);
    const ex = await db.exercises.get(id);
    if (ex) onCreated?.(ex);
    onClose();
  }

  return (
    <Sheet title="Nieuwe oefening" onClose={onClose} action={<button className="link strong" onClick={save} disabled={!name.trim()}>Bewaar</button>}>
      <label className="field">
        <span>Naam</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Pendlay Row" />
      </label>
      <div className="field">
        <span>Spiergroep</span>
        <div className="chips wrap">
          {MUSCLES.map((m) => (
            <button key={m} className={`chip ${muscle === m ? 'active' : ''}`} onClick={() => setMuscle(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Materiaal</span>
        <div className="chips wrap">
          {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((k) => (
            <button key={k} className={`chip ${equipment === k ? 'active' : ''}`} onClick={() => setEquipment(k)}>
              {EQUIPMENT_LABELS[k]}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
