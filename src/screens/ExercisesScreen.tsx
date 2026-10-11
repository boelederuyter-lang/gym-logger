import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../db';
import { ExerciseInfo } from '../components/ExerciseInfo';
import { NewExerciseSheet } from '../components/ExercisePicker';
import { Thumb } from '../components/Thumb';
import { EQUIPMENT_LABELS, MUSCLES } from '../library/exercises';
import { matches } from '../library/search';

export function ExercisesScreen({ onOpenWorkout }: { onOpenWorkout: () => void }) {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const list = (exercises ?? []).filter((e) => (!muscle || e.muscle === muscle) && matches(e, query));
    const groups = [...MUSCLES, ...new Set(list.map((e) => e.muscle).filter((m) => !MUSCLES.includes(m as never)))];
    return groups.map((m) => [m, list.filter((e) => e.muscle === m)] as const).filter(([, l]) => l.length);
  }, [exercises, query, muscle]);

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Oefeningen</h1>
        <button className="link strong" onClick={() => setCreating(true)}>
          + Eigen oefening
        </button>
      </header>
      <main className="content">
        <input
          className="search"
          type="search"
          placeholder="Zoek op naam, spiergroep of materiaal"
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
              {m}
            </button>
          ))}
        </div>
        {grouped.length === 0 && <p className="empty">Niets gevonden voor “{query}”.</p>}
        {grouped.map(([group, list]) => (
          <section key={group}>
            <h2 className="section-title">{group}</h2>
            <ul className="list card">
              {list.map((ex) => (
                <li key={ex.id}>
                  <button className="list-item" onClick={() => setOpenId(ex.id)}>
                    <Thumb exercise={ex} size={40} />
                    <span className="grow">
                      <span className="block">{ex.name}</span>
                      <span className="muted small">{EQUIPMENT_LABELS[ex.equipment]}</span>
                    </span>
                    <span className="muted">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      {creating && (
        <NewExerciseSheet initialName={query} onClose={() => setCreating(false)} onCreated={(ex) => setOpenId(ex.id)} />
      )}
      {openId != null && (
        <ExerciseInfo exerciseId={openId} onClose={() => setOpenId(null)} onOpenWorkout={onOpenWorkout} />
      )}
    </div>
  );
}
