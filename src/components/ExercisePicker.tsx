import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db, type Equipment, type Exercise } from '../db';
import { EQUIPMENT_LABELS, MUSCLES } from '../library/exercises';
import { matches, normalize } from '../library/search';
import { ExerciseInfo } from './ExerciseInfo';
import { Sheet } from './Sheet';
import { Thumb } from './Thumb';

interface Props {
  onConfirm: (exercises: Exercise[]) => void;
  onClose: () => void;
  exclude?: number[];
}

/** Multi-select exercise picker with a sticky "add" button. */
export function ExercisePicker({ onConfirm, onClose, exclude = [] }: Props) {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () => (exercises ?? []).filter((e) => !exclude.includes(e.id) && (!muscle || e.muscle === muscle) && matches(e, query)),
    [exercises, query, muscle, exclude],
  );

  const known = (exercises ?? []).some((e) => normalize(e.name) === normalize(query));

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function confirm() {
    const byId = new Map(exercises?.map((e) => [e.id, e]));
    onConfirm(selected.map((id) => byId.get(id)!).filter(Boolean));
  }

  if (creating) {
    return (
      <NewExerciseSheet
        initialName={query}
        onClose={() => setCreating(false)}
        onCreated={(ex) => {
          setSelected((s) => [...s, ex.id]);
          setQuery('');
        }}
      />
    );
  }

  return (
    <Sheet title="Oefeningen kiezen" onClose={onClose}>
      <input className="search" type="search" placeholder="Zoek op naam, spiergroep of materiaal" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="chips">
        {MUSCLES.map((m) => (
          <button key={m} className={`chip ${muscle === m ? 'active' : ''}`} onClick={() => setMuscle(muscle === m ? null : m)}>
            {m}
          </button>
        ))}
      </div>
      <ul className="list picker-list">
        {filtered.map((ex) => {
          const on = selected.includes(ex.id);
          return (
            <li key={ex.id} className={on ? 'selected' : ''}>
              <button className={`select-dot ${on ? 'on' : ''}`} onClick={() => toggle(ex.id)} aria-label={on ? 'Deselecteren' : 'Selecteren'}>
                {on ? '✓' : ''}
              </button>
              <button className="list-item" onClick={() => setPreview(ex.id)}>
                <Thumb exercise={ex} size={40} />
                <span className="grow">
                  <span className="block">{ex.name}</span>
                  <span className="muted small">
                    {ex.muscle} · {EQUIPMENT_LABELS[ex.equipment]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {query.trim() && !known && (
          <li>
            <button className="list-item create-row" onClick={() => setCreating(true)}>
              + “{query.trim()}” als eigen oefening
            </button>
          </li>
        )}
        {filtered.length === 0 && !query.trim() && <li className="empty">Geen oefeningen in deze groep.</li>}
      </ul>
      {selected.length > 0 && (
        <div className="sticky-bottom">
          <button className="btn primary block big" onClick={confirm}>
            {selected.length === 1 ? '1 oefening toevoegen' : `${selected.length} oefeningen toevoegen`}
          </button>
        </div>
      )}
      {preview != null && (
        <ExerciseInfo
          exerciseId={preview}
          onClose={() => setPreview(null)}
          primary={{
            label: selected.includes(preview) ? 'Geselecteerd ✓ (tik om te wissen)' : 'Selecteren',
            onClick: () => {
              toggle(preview);
              setPreview(null);
            },
          }}
        />
      )}
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
  const [muscle, setMuscle] = useState<string>(MUSCLES[0]);
  const [equipment, setEquipment] = useState<Equipment>('barbell');

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = await db.exercises.add({ name: trimmed, aliases: [], muscle, equipment, custom: true });
    const ex = await db.exercises.get(id);
    if (ex) onCreated?.(ex);
    onClose();
  }

  return (
    <Sheet title="Eigen oefening" onClose={onClose} action={<button className="link strong" onClick={save} disabled={!name.trim()}>Bewaar</button>}>
      <label className="field">
        <span>Naam</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Pendlay row" />
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
