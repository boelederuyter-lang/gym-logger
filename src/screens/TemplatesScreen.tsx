import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { tr } from '../i18n';

export function TemplatesScreen({ onEdit }: { onEdit: (id?: number) => void }) {
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const names = new Map(exercises?.map((e) => [e.id, e.name]));

  return (
    <div className="screen">
      <header className="page-header">
        <h1>{tr("Programma's", 'Programs')}</h1>
        <button className="link strong" onClick={() => onEdit()}>
          + {tr('Nieuw', 'New')}
        </button>
      </header>
      <main className="content">
        {templates?.length === 0 && (
          <p className="empty">
            {tr(
              "Nog geen programma's. Een programma is een vaste training, bijvoorbeeld “Push” of “Benen”, met oefeningen, sets en rusttijden.",
              'No programs yet. A program is a fixed workout, for example “Push” or “Legs”, with exercises, sets and rest times.',
            )}
          </p>
        )}
        {templates?.map((t) => (
          <button key={t.id} className="card list-card" onClick={() => onEdit(t.id)}>
            <strong>{t.name}</strong>
            <span className="small muted">
              {t.items.map((i) => `${i.sets}× ${names.get(i.exerciseId) ?? '?'}`).join(' · ') || tr('Leeg', 'Empty')}
            </span>
          </button>
        ))}
      </main>
    </div>
  );
}
