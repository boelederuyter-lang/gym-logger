import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, type Template, type TemplateItem } from '../db';
import { ExerciseInfo } from '../components/ExerciseInfo';
import { ExercisePicker } from '../components/ExercisePicker';
import { NoteBlock } from '../components/NoteSheet';
import { REST_OPTIONS } from '../components/RestSheet';
import { Thumb } from '../components/Thumb';
import { fmtRest } from '../format';
import { defaultsFor } from '../library/defaults';

interface Props {
  templateId?: number;
  onClose: () => void;
}

export function TemplateEditor({ templateId, onClose }: Props) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loaded, setLoaded] = useState(templateId == null);
  const [picking, setPicking] = useState(false);
  const [info, setInfo] = useState<number | null>(null);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const byId = new Map(exercises?.map((e) => [e.id, e]));

  useEffect(() => {
    if (templateId == null) return;
    db.templates.get(templateId).then((t) => {
      if (t) {
        setName(t.name);
        setItems(t.items);
      }
      setLoaded(true);
    });
  }, [templateId]);

  function update(i: number, patch: Partial<TemplateItem>) {
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  }

  async function save() {
    const data = { name: name.trim() || 'Naamloos programma', items };
    if (templateId == null) await db.templates.add({ ...data, createdAt: Date.now() } as Template);
    else await db.templates.update(templateId, data);
    onClose();
  }

  async function remove() {
    if (templateId != null && confirm('Programma verwijderen? Je workout-historie blijft bewaard.')) {
      await db.templates.delete(templateId);
      onClose();
    }
  }

  if (!loaded) return null;

  return (
    <div className="screen">
      <header className="topbar">
        <button className="link" onClick={onClose}>
          Annuleer
        </button>
        <div className="topbar-title">
          <strong>{templateId == null ? 'Nieuw programma' : 'Programma bewerken'}</strong>
        </div>
        <button className="link strong" onClick={save}>
          Bewaar
        </button>
      </header>
      <main className="content">
        <label className="field">
          <span>Naam</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Push, Pull, Legs" />
        </label>

        {items.map((it, i) => {
          const ex = byId.get(it.exerciseId);
          const rest = it.restSeconds ?? (ex ? defaultsFor(ex).rest : 90);
          return (
            <div key={`${it.exerciseId}-${i}`} className="card template-item">
              <div className="card-header">
                <Thumb exercise={ex} onClick={() => setInfo(it.exerciseId)} />
                <h3 className="grow">{ex?.name ?? '…'}</h3>
                <div className="inline">
                  <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Omhoog">
                    ↑
                  </button>
                  <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Omlaag">
                    ↓
                  </button>
                  <button className="icon-btn" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Verwijderen">
                    ✕
                  </button>
                </div>
              </div>
              <NoteBlock note={ex?.note} />
              <div className="item-fields">
                <div className="stepper">
                  <span className="small muted">Sets</span>
                  <button onClick={() => update(i, { sets: Math.max(1, it.sets - 1) })}>−</button>
                  <strong>{it.sets}</strong>
                  <button onClick={() => update(i, { sets: Math.min(20, it.sets + 1) })}>+</button>
                </div>
                <label className="reps-field">
                  <span className="small muted">Reps</span>
                  <input value={it.reps} onChange={(e) => update(i, { reps: e.target.value })} placeholder="8-12" />
                </label>
                <label className="reps-field">
                  <span className="small muted">Rust</span>
                  <select value={rest} onChange={(e) => update(i, { restSeconds: Number(e.target.value) })}>
                    {[...new Set([...REST_OPTIONS, rest])].sort((a, b) => a - b).map((s) => (
                      <option key={s} value={s}>
                        {fmtRest(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          );
        })}

        <button className="btn secondary block" onClick={() => setPicking(true)}>
          + Oefening toevoegen
        </button>
        {templateId != null && (
          <button className="btn danger-text block" onClick={remove}>
            Programma verwijderen
          </button>
        )}
      </main>

      {picking && (
        <ExercisePicker
          exclude={items.map((i) => i.exerciseId)}
          onClose={() => setPicking(false)}
          onConfirm={(list) => {
            setItems([
              ...items,
              ...list.map((ex) => {
                const d = defaultsFor(ex);
                return { exerciseId: ex.id, sets: d.sets, reps: String(d.reps), restSeconds: d.rest };
              }),
            ]);
            setPicking(false);
          }}
        />
      )}
      {info != null && <ExerciseInfo exerciseId={info} onClose={() => setInfo(null)} primary={{ label: 'Sluiten', onClick: () => setInfo(null) }} />}
    </div>
  );
}
