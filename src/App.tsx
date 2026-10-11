import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { db } from './db';
import { Sheet } from './components/Sheet';
import { RestBar } from './components/RestBar';
import { Toast } from './components/Toast';
import { fmtWeight } from './format';
import { ExercisesScreen } from './screens/ExercisesScreen';
import { HistoryScreen, WorkoutDetail } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsSheet } from './screens/SettingsSheet';
import { TemplateEditor } from './screens/TemplateEditor';
import { TemplatesScreen } from './screens/TemplatesScreen';
import { WorkoutScreen, type Pr } from './screens/WorkoutScreen';

type Tab = 'home' | 'templates' | 'history' | 'exercises';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Trainen', icon: '🏋️' },
  { id: 'templates', label: "Programma's", icon: '📋' },
  { id: 'history', label: 'Historie', icon: '📅' },
  { id: 'exercises', label: 'Oefeningen', icon: '💪' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [workoutOpen, setWorkoutOpen] = useState(true);
  // undefined = closed, null = new template, number = edit existing
  const [editingTemplate, setEditingTemplate] = useState<number | null | undefined>(undefined);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summary, setSummary] = useState<{ workoutId: number; prs: Pr[] } | null>(null);

  const active = useLiveQuery(() => db.workouts.filter((w) => !w.endedAt).first(), []);

  if (active && workoutOpen) {
    return withToast(
      <WorkoutScreen
        workout={active}
        onMinimize={() => setWorkoutOpen(false)}
        onFinished={(workoutId, prs) => {
          setSummary({ workoutId, prs });
          setTab('history');
        }}
      />,
    );
  }

  if (editingTemplate !== undefined) {
    return withToast(<TemplateEditor templateId={editingTemplate ?? undefined} onClose={() => setEditingTemplate(undefined)} />);
  }

  return withToast(
    <div className="app">
      {tab === 'home' && (
        <HomeScreen
          active={active}
          onOpenWorkout={() => setWorkoutOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onNewTemplate={() => setEditingTemplate(null)}
        />
      )}
      {tab === 'templates' && <TemplatesScreen onEdit={(id) => setEditingTemplate(id ?? null)} />}
      {tab === 'history' && <HistoryScreen onOpen={setDetailId} />}
      {tab === 'exercises' && <ExercisesScreen onOpenWorkout={() => setWorkoutOpen(true)} />}

      <div className="bottom">
        {active && (
          <>
            <RestBar />
            <button className="active-banner" onClick={() => setWorkoutOpen(true)}>
              <span>Workout bezig: {active.name}</span>
              <strong>Openen ›</strong>
            </button>
          </>
        )}
        <nav className="tabbar">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {detailId != null && <WorkoutDetail workoutId={detailId} onClose={() => setDetailId(null)} />}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {summary && (
        <Sheet title="Goed gedaan! 💪" onClose={() => setSummary(null)}>
          {summary.prs.length > 0 ? (
            <div className="card pr-card">
              <h3>Nieuwe records 🏆</h3>
              <ul>
                {summary.prs.map((p) => (
                  <li key={p.exercise}>
                    {p.exercise}: {fmtWeight(p.weight)} kg × {p.reps}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="muted">Workout opgeslagen.</p>
          )}
          <button
            className="btn primary block"
            onClick={() => {
              setDetailId(summary.workoutId);
              setSummary(null);
            }}
          >
            Bekijk workout
          </button>
        </Sheet>
      )}
    </div>,
  );
}

function withToast(content: ReactNode) {
  return (
    <>
      {content}
      <Toast />
    </>
  );
}
