import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import type { Gewricht, Patroon } from '../coach/exercises';
import { db, type Equipment, type Exercise } from '../db';
import { EQUIPMENT_LABELS, MUSCLES, muscleLabel } from '../library/exercises';
import { matches, normalize } from '../library/search';
import { JointsField, PatternField } from './CoachFields';
import { ExerciseInfo } from './ExerciseInfo';
import { Sheet } from './Sheet';
import { Thumb } from './Thumb';
import { tr } from '../i18n';

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
    () =>
      (exercises ?? []).filter((e) => !exclude.includes(e.id) && (!muscle || e.muscle === muscle) && matches(e, query)),
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
    <Sheet title={tr('Oefeningen kiezen', 'Choose exercises')} onClose={onClose}>
      <input
        className="search"
        type="search"
        placeholder={tr('Zoek op naam, spiergroep of materiaal', 'Search by name, muscle or equipment')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chips">
        {MUSCLES.map((m) => (
          <button
            key={m}
            className={`chip ${muscle === m ? 'active' : ''}`}
            onClick={() => setMuscle(muscle === m ? null : m)}
          >
            {muscleLabel(m)}
          </button>
        ))}
      </div>
      <ul className="list picker-list">
        {filtered.map((ex) => {
          const on = selected.includes(ex.id);
          return (
            <li key={ex.id} className={on ? 'selected' : ''}>
              <button
                className={`select-dot ${on ? 'on' : ''}`}
                onClick={() => toggle(ex.id)}
                aria-label={on ? tr('Deselecteren', 'Deselect') : tr('Selecteren', 'Select')}
              >
                {on ? '✓' : ''}
              </button>
              <button className="list-item" onClick={() => setPreview(ex.id)}>
                <Thumb exercise={ex} size={40} />
                <span className="grow">
                  <span className="block">{ex.name}</span>
                  <span className="muted small">
                    {muscleLabel(ex.muscle)} · {EQUIPMENT_LABELS[ex.equipment]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {query.trim() && !known && (
          <li>
            <button className="list-item create-row" onClick={() => setCreating(true)}>
              + “{query.trim()}” {tr('als eigen oefening', 'as custom exercise')}
            </button>
          </li>
        )}
        {filtered.length === 0 && !query.trim() && (
          <li className="empty">{tr('Geen oefeningen in deze groep.', 'No exercises in this group.')}</li>
        )}
      </ul>
      {selected.length > 0 && (
        <div className="sticky-bottom">
          <button className="btn primary block big" onClick={confirm}>
            {selected.length === 1
              ? tr('1 oefening toevoegen', 'Add 1 exercise')
              : tr(`${selected.length} oefeningen toevoegen`, `Add ${selected.length} exercises`)}
          </button>
        </div>
      )}
      {preview != null && (
        <ExerciseInfo
          exerciseId={preview}
          onClose={() => setPreview(null)}
          primary={{
            label: selected.includes(preview)
              ? tr('Geselecteerd ✓ (tik om te wissen)', 'Selected ✓ (tap to clear)')
              : tr('Selecteren', 'Select'),
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
  const [patroon, setPatroon] = useState<Patroon>();
  const [gewrichten, setGewrichten] = useState<Gewricht[]>([]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const coach = patroon || gewrichten.length ? { patroon, gewrichten } : undefined;
    const id = await db.exercises.add({ name: trimmed, aliases: [], muscle, equipment, custom: true, coach });
    const ex = await db.exercises.get(id);
    if (ex) onCreated?.(ex);
    onClose();
  }

  return (
    <Sheet
      title={tr('Eigen oefening', 'Custom exercise')}
      onClose={onClose}
      action={
        <button className="link strong" onClick={save} disabled={!name.trim()}>
          {tr('Bewaar', 'Save')}
        </button>
      }
    >
      <label className="field">
        <span>{tr('Naam', 'Name')}</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr('Bijv. Pendlay row', 'E.g. Pendlay row')}
        />
      </label>
      <div className="field">
        <span>{tr('Spiergroep', 'Muscle group')}</span>
        <div className="chips wrap">
          {MUSCLES.map((m) => (
            <button key={m} className={`chip ${muscle === m ? 'active' : ''}`} onClick={() => setMuscle(m)}>
              {muscleLabel(m)}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>{tr('Materiaal', 'Equipment')}</span>
        <div className="chips wrap">
          {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((k) => (
            <button key={k} className={`chip ${equipment === k ? 'active' : ''}`} onClick={() => setEquipment(k)}>
              {EQUIPMENT_LABELS[k]}
            </button>
          ))}
        </div>
      </div>
      <PatternField value={patroon} onChange={setPatroon} />
      <JointsField value={gewrichten} onChange={setGewrichten} />
    </Sheet>
  );
}
