import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export function TemplatesScreen({ onEdit }: { onEdit: (id?: number) => void }) {
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const names = new Map(exercises?.map((e) => [e.id, e.name]));

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Schema's</h1>
        <button className="link strong" onClick={() => onEdit()}>
          + Nieuw
        </button>
      </header>
      <main className="content">
        {templates?.length === 0 && (
          <p className="empty">
            Nog geen schema's. Een schema is een vaste training, bijvoorbeeld “Push” of “Benen”, met oefeningen en het
            aantal sets.
          </p>
        )}
        {templates?.map((t) => (
          <button key={t.id} className="card list-card" onClick={() => onEdit(t.id)}>
            <strong>{t.name}</strong>
            <span className="small muted">
              {t.items.map((i) => `${i.sets}× ${names.get(i.exerciseId) ?? '?'}`).join(' · ') || 'Leeg'}
            </span>
          </button>
        ))}
      </main>
    </div>
  );
}
