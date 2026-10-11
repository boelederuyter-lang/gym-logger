import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, type Template, type TemplateItem } from '../db';
import { ExercisePicker } from '../components/ExercisePicker';

interface Props {
  templateId?: number;
  onClose: () => void;
}

export function TemplateEditor({ templateId, onClose }: Props) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loaded, setLoaded] = useState(templateId == null);
  const [picking, setPicking] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const names = new Map(exercises?.map((e) => [e.id, e.name]));

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
    const data = { name: name.trim() || 'Naamloos schema', items };
    if (templateId == null) await db.templates.add({ ...data, createdAt: Date.now() } as Template);
    else await db.templates.update(templateId, data);
    onClose();
  }

  async function remove() {
    if (templateId != null && confirm('Schema verwijderen? Je workout-historie blijft bewaard.')) {
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
          <strong>{templateId == null ? 'Nieuw schema' : 'Schema bewerken'}</strong>
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

        {items.map((it, i) => (
          <div key={i} className="card template-item">
            <div className="card-header">
              <h3>{names.get(it.exerciseId) ?? '…'}</h3>
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
            <div className="inline spread">
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
            </div>
          </div>
        ))}

        <button className="btn secondary block" onClick={() => setPicking(true)}>
          + Oefening toevoegen
        </button>
        {templateId != null && (
          <button className="btn danger-text block" onClick={remove}>
            Schema verwijderen
          </button>
        )}
      </main>

      {picking && (
        <ExercisePicker
          exclude={items.map((i) => i.exerciseId)}
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            setItems([...items, { exerciseId: ex.id, sets: 3, reps: '8-12' }]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
