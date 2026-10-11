import { useLiveQuery } from 'dexie-react-hooks';
import { db, startWorkout, type Template, type Workout } from '../db';
import { fmtDate } from '../format';

interface Props {
  active?: Workout;
  onOpenWorkout: () => void;
  onOpenSettings: () => void;
  onNewTemplate: () => void;
}

export function HomeScreen({ active, onOpenWorkout, onOpenSettings, onNewTemplate }: Props) {
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []);
  const lastByTemplate = useLiveQuery(async () => {
    const map = new Map<number, number>();
    const done = await db.workouts.orderBy('startedAt').filter((w) => !!w.endedAt).toArray();
    for (const w of done) if (w.templateId) map.set(w.templateId, w.startedAt);
    return map;
  }, []);

  async function start(template?: Template) {
    if (active) {
      onOpenWorkout();
      return;
    }
    await startWorkout(template);
    onOpenWorkout();
  }

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Trainen</h1>
        <button className="icon-btn" onClick={onOpenSettings} aria-label="Instellingen">
          ⚙︎
        </button>
      </header>
      <main className="content">
        {active ? (
          <button className="btn primary block big" onClick={onOpenWorkout}>
            Verder met “{active.name}”
          </button>
        ) : (
          <button className="btn primary block big" onClick={() => start()}>
            Lege workout starten
          </button>
        )}

        <h2 className="section-title">Mijn programma's</h2>
        {templates?.length === 0 && (
          <div className="card empty-card">
            <p>Maak een programma om met één tik je vaste training te starten.</p>
            <button className="btn secondary" onClick={onNewTemplate}>
              + Programma maken
            </button>
          </div>
        )}
        <div className="template-grid">
          {templates?.map((t) => (
            <button key={t.id} className="card template-card" onClick={() => start(t)} disabled={!!active}>
              <strong>{t.name}</strong>
              <span className="small muted">{t.items.length} oefeningen</span>
              <span className="small muted">
                {lastByTemplate?.get(t.id) ? `Laatst: ${fmtDate(lastByTemplate.get(t.id)!)}` : 'Nog niet gedaan'}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
