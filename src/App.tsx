import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { db } from './db';
import { SummarySheet } from './components/SummarySheet';
import { RestBar } from './components/RestBar';
import { Icon, type IconName } from './components/Icon';
import { PrBanner } from './components/PrBanner';
import { Toast } from './components/Toast';
import { ExercisesScreen } from './screens/ExercisesScreen';
import { HistoryScreen, WorkoutDetail } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsSheet } from './screens/SettingsSheet';
import { TemplateEditor } from './screens/TemplateEditor';
import { TemplatesScreen } from './screens/TemplatesScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';

type Tab = 'home' | 'templates' | 'history' | 'exercises';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Start', icon: 'home' },
  { id: 'templates', label: "Programma's", icon: 'programs' },
  { id: 'history', label: 'Voortgang', icon: 'progress' },
  { id: 'exercises', label: 'Oefeningen', icon: 'exercises' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [workoutOpen, setWorkoutOpen] = useState(true);
  // undefined = closed, null = new template, number = edit existing
  const [editingTemplate, setEditingTemplate] = useState<number | null | undefined>(undefined);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summary, setSummary] = useState<number | null>(null);

  const active = useLiveQuery(() => db.workouts.filter((w) => !w.endedAt).first(), []);

  if (active && workoutOpen) {
    return withToast(
      <WorkoutScreen
        workout={active}
        onMinimize={() => setWorkoutOpen(false)}
        onFinished={(workoutId) => {
          setSummary(workoutId);
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
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {detailId != null && <WorkoutDetail workoutId={detailId} onClose={() => setDetailId(null)} />}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {summary && (
        <SummarySheet
          workoutId={summary}
          onClose={() => setSummary(null)}
          onOpen={() => {
            setDetailId(summary);
            setSummary(null);
          }}
        />
      )}
    </div>,
  );
}

function withToast(content: ReactNode) {
  return (
    <>
      {content}
      <PrBanner />
      <Toast />
    </>
  );
}
