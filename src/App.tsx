import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ReactNode } from 'react';
import { db } from './db';
import { SummarySheet } from './components/SummarySheet';
import { RestBar } from './components/RestBar';
import { Icon, type IconName } from './components/Icon';
import { PrBanner } from './components/PrBanner';
import { Toast } from './components/Toast';
import { ExercisesScreen } from './screens/ExercisesScreen';
import { HistoryScreen, WorkoutDetail } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ActionSheet } from './components/ActionSheet';
import { adoptShared, getPlan, parseShareHash } from './plan/store';
import { showToast } from './toast';
import { SettingsSheet } from './screens/SettingsSheet';
import { TemplateEditor } from './screens/TemplateEditor';
import { initialTrainView, TrainScreen, type TrainView } from './screens/TrainScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { useWakeLock } from './wakeLock';

type Tab = 'home' | 'train' | 'history' | 'exercises';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Start', icon: 'home' },
  { id: 'train', label: 'Trainen', icon: 'schema' },
  { id: 'history', label: 'Voortgang', icon: 'progress' },
  { id: 'exercises', label: 'Oefeningen', icon: 'exercises' },
];

export function App() {
  // #schema (old /schema/ address) and shared schema links open the Schema tab.
  const [tab, setTab] = useState<Tab>(() => (/^#(schema|s=|c=)/.test(location.hash) ? 'train' : 'home'));
  const [trainView, setTrainView] = useState<TrainView>(() =>
    /^#(schema|s=|c=)/.test(location.hash) ? 'schema' : initialTrainView(!!getPlan()),
  );
  const openSchema = () => {
    setTrainView('schema');
    setTab('train');
  };
  const [shared, setShared] = useState(() => parseShareHash(location.hash));
  const [workoutOpen, setWorkoutOpen] = useState(true);
  // undefined = closed, null = new template, number = edit existing
  const [editingTemplate, setEditingTemplate] = useState<number | null | undefined>(undefined);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summary, setSummary] = useState<number | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const editingWorkout = useLiveQuery(
    () => (editingWorkoutId == null ? undefined : db.workouts.get(editingWorkoutId)),
    [editingWorkoutId],
  );

  useEffect(() => {
    if (!location.hash) return;
    history.replaceState(null, '', location.pathname + location.search);
    if (shared && !getPlan()) acceptShared();
  }, []);

  function acceptShared() {
    if (!shared) return;
    adoptShared(shared);
    setShared(null);
    openSchema();
    showToast('Gedeeld schema geladen');
  }

  const active = useLiveQuery(() => db.workouts.filter((w) => !w.endedAt).first(), []);
  useWakeLock(!!active);

  if (editingWorkout) {
    return withToast(
      <WorkoutScreen
        editing
        workout={editingWorkout}
        onMinimize={() => setEditingWorkoutId(null)}
        onFinished={(id) => {
          setEditingWorkoutId(null);
          setDetailId(id);
        }}
      />,
    );
  }

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
    return withToast(
      <TemplateEditor templateId={editingTemplate ?? undefined} onClose={() => setEditingTemplate(undefined)} />,
    );
  }

  return withToast(
    <div className="app">
      {tab === 'home' && (
        <HomeScreen
          active={active}
          onOpenWorkout={() => setWorkoutOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onNewTemplate={() => setEditingTemplate(null)}
          onOpenPlan={openSchema}
        />
      )}
      {tab === 'train' && (
        <TrainScreen
          view={trainView}
          onView={setTrainView}
          active={active}
          onOpenWorkout={() => setWorkoutOpen(true)}
          onEditTemplate={(id) => setEditingTemplate(id ?? null)}
        />
      )}
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

      {detailId != null && (
        <WorkoutDetail
          workoutId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditingWorkoutId(detailId);
            setDetailId(null);
          }}
        />
      )}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {shared && getPlan() && (
        <ActionSheet
          title="Je opent een gedeeld schema. Wil je je eigen schema hiermee vervangen? Je gelogde workouts blijven bewaard."
          actions={[{ label: 'Gedeeld schema gebruiken', onClick: acceptShared }]}
          onClose={() => setShared(null)}
        />
      )}
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
