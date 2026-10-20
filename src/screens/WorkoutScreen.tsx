import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import {
  addExercisesToWorkout,
  addWarmupSets,
  db,
  deleteSet,
  deleteWorkout,
  duplicateSet,
  finishEdit,
  finishWorkout,
  previousSets,
  recomputePrs,
  remainingMinutes,
  removeExerciseFromWorkout,
  restFor,
  type Exercise,
  type Workout,
  type WorkoutSet,
} from '../db';
import { ActionSheet, type Action } from '../components/ActionSheet';
import { ExerciseInfo } from '../components/ExerciseInfo';
import { ReplaceSheet, TimeSheet } from '../components/CoachSheets';
import { Icon } from '../components/Icon';
import { ExercisePicker } from '../components/ExercisePicker';
import { NoteBlock, NoteSheet } from '../components/NoteSheet';
import { ProgressSheet } from '../components/ProgressSheet';
import { RestBar } from '../components/RestBar';
import { RestSheet } from '../components/RestSheet';
import { Thumb } from '../components/Thumb';
import { fmtDuration, fmtRest, fmtSet, fmtWeight, parseNum } from '../format';
import { showPrBanner } from '../prBanner';
import { describePr } from '../prs';
import { startRest, stopRest } from '../restTimer';
import { useSettings } from '../settings';
import { showToast } from '../toast';
import { useNow } from '../useNow';
import { warmupSets } from '../warmup';
import { platesPerSide } from '../plates';
import { supersetInfo, toggleLink } from '../supersets';

interface Props {
  workout: Workout;
  onMinimize: () => void;
  onFinished: (workoutId: number) => void;
  /** Editing a finished workout: no timer, no rest, "Klaar" saves the changes. */
  editing?: boolean;
}

export function WorkoutScreen({ workout, onMinimize, onFinished, editing = false }: Props) {
  const now = useNow();
  const [picking, setPicking] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id).toArray(), [workout.id]);
  const totalCount = sets?.length ?? 0;
  const doneCount = sets?.filter((s) => s.done).length ?? 0;
  const left = useLiveQuery(() => remainingMinutes(workout.id), [workout.id]) ?? 0;

  async function finish() {
    if (editing) {
      const open = (sets ?? []).filter((s) => !s.done).length;
      if (open > 0 && !confirm(`${open} set(s) zijn niet afgevinkt en worden niet bewaard. Opslaan?`)) return;
      await finishEdit(workout.id);
      showToast('Workout bijgewerkt');
      onFinished(workout.id);
      return;
    }
    const all = sets ?? [];
    const done = all.filter((s) => s.done);
    if (done.length === 0) {
      if (confirm('Je hebt nog geen sets afgevinkt. Workout verwijderen?')) {
        await deleteWorkout(workout.id);
        stopRest();
      }
      return;
    }
    const open = all.length - done.length;
    if (open > 0 && !confirm(`${open} set(s) zijn niet afgevinkt en worden niet opgeslagen. Afronden?`)) return;
    await finishWorkout(workout.id);
    stopRest();
    onFinished(workout.id);
  }

  async function cancel() {
    if (!confirm('Workout annuleren? Alles van deze training wordt verwijderd.')) return;
    await deleteWorkout(workout.id);
    stopRest();
  }

  return (
    <div className="screen workout">
      <header className="topbar">
        {editing ? (
          <span />
        ) : (
          <button className="icon-btn" onClick={onMinimize} aria-label="Minimaliseren">
            <Icon name="down" />
          </button>
        )}
        <div className="topbar-title">
          <input
            className="title-input"
            value={workout.name}
            onChange={(e) => db.workouts.update(workout.id, { name: e.target.value })}
          />
          <span className="small muted">
            {editing
              ? `Bewerken · ${new Date(workout.startedAt).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}`
              : fmtDuration(now - workout.startedAt)}
          </span>
        </div>
        <button className="btn primary small-btn" onClick={finish}>
          {editing ? 'Opslaan' : 'Klaar'}
        </button>
        <div className="progress" aria-label={`${doneCount} van ${totalCount} sets gedaan`}>
          <div className="progress-fill" style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} />
        </div>
        <span className="progress-label small muted">
          {doneCount} van {totalCount} sets gedaan
        </span>
      </header>

      <main className="content">
        {!editing && left > 5 && (
          <button className="time-bar" onClick={() => setTimeOpen(true)}>
            <span>
              Nog ± <strong className="num">{left} min</strong>
            </span>
            <span className="time-bar-action">Weinig tijd?</span>
          </button>
        )}
        {workout.exerciseIds.length === 0 && <p className="empty">Voeg je eerste oefening toe om te beginnen.</p>}
        {workout.exerciseIds.map((exId) => (
          <ExerciseCard
            key={exId}
            workout={workout}
            exerciseId={exId}
            editing={editing}
            sets={(sets ?? []).filter((s) => s.exerciseId === exId).sort((a, b) => a.order - b.order)}
          />
        ))}
        <button className="btn secondary block" onClick={() => setPicking(true)}>
          + Oefening toevoegen
        </button>
        {editing ? (
          <p className="small muted center">Wijzigingen worden direct bewaard. Alleen afgevinkte sets tellen mee.</p>
        ) : (
          <button className="btn danger-text block" onClick={cancel}>
            Workout annuleren
          </button>
        )}
      </main>

      {timeOpen && <TimeSheet workout={workout} left={left} onClose={() => setTimeOpen(false)} />}
      <div className="workout-bottom">
        <RestBar />
      </div>

      {picking && (
        <ExercisePicker
          exclude={workout.exerciseIds}
          onClose={() => setPicking(false)}
          onConfirm={async (list) => {
            setPicking(false);
            await addExercisesToWorkout(workout, list);
          }}
        />
      )}
    </div>
  );
}

type Overlay = 'menu' | 'info' | 'note' | 'rest' | 'progress' | 'replace' | null;

function ExerciseCard({
  workout,
  exerciseId,
  sets,
  editing,
}: {
  workout: Workout;
  exerciseId: number;
  sets: WorkoutSet[];
  editing: boolean;
}) {
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const prev = useLiveQuery(() => previousSets(exerciseId, workout.id), [exerciseId, workout.id]) ?? [];
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [setMenu, setSetMenu] = useState<WorkoutSet | null>(null);
  const settings = useSettings();
  const rest = restFor(workout, exercise);
  const recompute = () => recomputePrs(workout.id, exerciseId);
  const superset = supersetInfo(workout.exerciseIds, workout.supersets).get(exerciseId);

  // Work sets are numbered 1, 2, 3; warm-ups show "W" and don't count.
  const labels: string[] = [];
  const workIndex: number[] = [];
  let n = 0;
  for (const s of sets) {
    if (s.warmup) {
      labels.push('W');
      workIndex.push(-1);
    } else {
      labels.push(String(++n));
      workIndex.push(n - 1);
    }
  }

  // The set you're about to do gets quick −/+ buttons.
  const nextOpen = sets.find((s) => !s.done && !s.warmup);

  async function addSet() {
    const last = sets[sets.length - 1];
    const p = prev[n];
    await db.sets.add({
      workoutId: workout.id,
      exerciseId,
      order: (last?.order ?? -1) + 1,
      weight: last && !last.warmup ? last.weight : (p?.weight ?? last?.weight ?? null),
      reps: last && !last.warmup ? last.reps : (p?.reps ?? last?.reps ?? null),
      done: false,
    } as WorkoutSet);
  }

  async function toggle(set: WorkoutSet, index: number) {
    if (set.done) {
      await db.sets.update(set.id, { done: false, doneAt: undefined });
      await recomputePrs(workout.id, exerciseId);
      return;
    }
    // Empty fields fall back to what you did last time (shown as placeholder).
    const p = workIndex[index] >= 0 ? prev[workIndex[index]] : undefined;
    const weight = set.weight ?? p?.weight ?? null;
    const reps = set.reps ?? p?.reps ?? null;
    if (reps == null) return;
    await db.sets.update(set.id, { weight, reps, done: true, doneAt: Date.now() });
    if (!set.warmup) {
      // Carry the weight down to the following work sets you haven't filled in yet.
      const later = sets.slice(index + 1).filter((s) => !s.done && !s.warmup && s.weight == null);
      await Promise.all(later.map((s) => db.sets.update(s.id, { weight })));
    }
    if (editing) {
      await recomputePrs(workout.id, exerciseId);
      return;
    }
    if (superset && !superset.last && !set.warmup) {
      // In a superset you go straight to the next exercise; rest comes after the last one.
      const nextId = workout.exerciseIds[workout.exerciseIds.indexOf(exerciseId) + 1];
      const next = await db.exercises.get(nextId);
      showToast(`Superset ${superset.label}: door naar ${next?.name ?? 'de volgende oefening'}`);
    } else {
      startRest(set.warmup ? Math.min(60, rest) : rest);
    }
    const fresh = await recomputePrs(workout.id, exerciseId);
    const mine = fresh.find((s) => s.id === set.id);
    if (mine?.pr && exercise) showPrBanner({ exercise: exercise.name, ...describePr(mine, mine.pr) });
  }

  async function addWarmups() {
    const firstOpen = sets.findIndex((s) => !s.warmup && !s.done);
    const p = firstOpen >= 0 ? prev[workIndex[firstOpen]] : undefined;
    const work = firstOpen >= 0 ? (sets[firstOpen].weight ?? p?.weight) : undefined;
    if (!work) {
      showToast('Vul eerst het gewicht van je eerste werkset in');
      return;
    }
    const planned = warmupSets(work, exercise?.equipment === 'barbell', settings.barWeight, settings.weightStep);
    if (!planned.length) {
      showToast('Dit gewicht is te licht voor warming-up sets');
      return;
    }
    await addWarmupSets(workout.id, exerciseId, planned);
    showToast(planned.length === 1 ? '1 warming-up set toegevoegd' : `${planned.length} warming-up sets toegevoegd`);
  }

  async function removeExercise() {
    if (confirm(`${exercise?.name ?? 'Oefening'} uit deze workout verwijderen?`)) {
      await removeExerciseFromWorkout(workout, exerciseId);
    }
  }

  const isLast = workout.exerciseIds.indexOf(exerciseId) === workout.exerciseIds.length - 1;
  const linked = workout.supersets?.includes(exerciseId) ?? false;
  const hasOpen = sets.some((s) => !s.done);
  const menu: Action[] = [
    ...(!editing && hasOpen ? [{ label: 'Bezet? Kies een vervanger', onClick: () => setOverlay('replace') }] : []),
    { label: 'Uitvoering bekijken', onClick: () => setOverlay('info') },
    ...(isLast && !linked
      ? []
      : [
          {
            label: linked ? 'Superset met volgende opheffen' : 'Superset met volgende oefening',
            onClick: () => db.workouts.update(workout.id, { supersets: toggleLink(workout.supersets, exerciseId) }),
          },
        ]),
    { label: 'Warming-up sets toevoegen', onClick: addWarmups },
    { label: exercise?.note ? 'Notitie bewerken' : 'Notitie toevoegen', onClick: () => setOverlay('note') },
    { label: `Rusttijd: ${fmtRest(rest)}`, onClick: () => setOverlay('rest') },
    { label: 'Voortgang bekijken', onClick: () => setOverlay('progress') },
    { label: 'Oefening verwijderen', onClick: removeExercise, danger: true },
  ];

  return (
    <section className={`card exercise-card ${superset ? 'superset' : ''}`}>
      {superset && (
        <span className="superset-tag">
          Superset {superset.label} · {superset.position}/{superset.size}
          {superset.last ? ' · daarna rust' : ' · geen rust'}
        </span>
      )}
      <div className="card-header">
        <Thumb exercise={exercise} onClick={() => setOverlay('info')} />
        <div className="grow">
          <h3>{exercise?.name ?? '…'}</h3>
          <span className="small muted">
            Rust {fmtRest(rest)}
            {!!workout.progress?.[exerciseId] && (
              <span className="progress-up"> · ↑ {fmtWeight(workout.progress[exerciseId])} kg t.o.v. vorige keer</span>
            )}
          </span>
        </div>
        <button className="icon-btn" onClick={() => setOverlay('menu')} aria-label="Menu van oefening">
          <Icon name="more" />
        </button>
      </div>
      <NoteBlock note={exercise?.note} />
      <div className="set-grid set-head">
        <span>Set</span>
        <span>Vorige</span>
        <span>kg</span>
        <span>Reps</span>
        <span>✓</span>
      </div>
      {sets.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          label={labels[i]}
          prev={workIndex[i] >= 0 ? prev[workIndex[i]] : undefined}
          onToggle={() => toggle(s, i)}
          onMenu={() => setSetMenu(s)}
          onEdited={() => s.done && recompute()}
          quick={
            s.id === nextOpen?.id
              ? {
                  step: settings.weightStep,
                  weighted: exercise?.equipment !== 'bodyweight',
                  bar: exercise?.equipment === 'barbell' ? settings.barWeight : undefined,
                  prev: workIndex[i] >= 0 ? prev[workIndex[i]] : undefined,
                }
              : undefined
          }
        />
      ))}
      <button className="btn ghost block" onClick={addSet}>
        + Set
      </button>

      {overlay === 'menu' && <ActionSheet title={exercise?.name} actions={menu} onClose={() => setOverlay(null)} />}
      {overlay === 'info' && (
        <ExerciseInfo
          exerciseId={exerciseId}
          onClose={() => setOverlay(null)}
          primary={{ label: 'Terug naar je workout', onClick: () => setOverlay(null) }}
        />
      )}
      {overlay === 'note' && exercise && <NoteSheet exercise={exercise} onClose={() => setOverlay(null)} />}
      {overlay === 'progress' && <ProgressSheet exerciseId={exerciseId} onClose={() => setOverlay(null)} />}
      {overlay === 'replace' && exercise && (
        <ReplaceSheet workout={workout} exercise={exercise} onClose={() => setOverlay(null)} />
      )}
      {overlay === 'rest' && (
        <RestSheet
          value={rest}
          onClose={() => setOverlay(null)}
          onPick={(s) => db.workouts.update(workout.id, { rest: { ...workout.rest, [exerciseId]: s } })}
        />
      )}
      {setMenu && (
        <ActionSheet
          title={`Set ${labels[sets.findIndex((s) => s.id === setMenu.id)] ?? ''}`}
          onClose={() => setSetMenu(null)}
          actions={setActions(setMenu, exercise, recompute)}
        />
      )}
    </section>
  );
}

function setActions(set: WorkoutSet, exercise: Exercise | undefined, recompute: () => Promise<unknown>): Action[] {
  return [
    { label: 'Set dupliceren', onClick: () => duplicateSet(set) },
    {
      label: set.warmup ? 'Markeren als werkset' : 'Markeren als warming-up',
      onClick: async () => {
        await db.sets.update(set.id, { warmup: !set.warmup, pr: undefined });
        await recompute();
      },
    },
    {
      label: 'Set verwijderen',
      danger: true,
      onClick: async () => {
        const restore = await deleteSet(set);
        await recompute();
        showToast(`Set verwijderd${exercise ? ` (${exercise.name})` : ''}`, async () => {
          await restore();
          await recompute();
        });
      },
    },
  ];
}

function SetRow({
  set,
  label,
  prev,
  onToggle,
  onMenu,
  onEdited,
  quick,
}: {
  set: WorkoutSet;
  label: string;
  prev?: WorkoutSet;
  onToggle: () => void;
  onMenu: () => void;
  onEdited: () => void;
  quick?: { step: number; weighted: boolean; bar?: number; prev?: WorkoutSet };
}) {
  const [weight, setWeight] = useNumberField(set.weight);
  const [reps, setReps] = useNumberField(set.reps);

  function fillFromPrev() {
    if (prev) db.sets.update(set.id, { weight: prev.weight, reps: prev.reps }).then(onEdited);
  }

  return (
    <div className={`set-grid set-row ${set.done ? 'done' : ''} ${set.warmup ? 'warmup' : ''} ${set.pr ? 'pr' : ''}`}>
      <button className="set-num" onClick={onMenu} aria-label={`Set ${label}, menu`}>
        {set.pr ? '🏆' : label}
      </button>
      <button className="prev" onClick={fillFromPrev} disabled={!prev}>
        {prev ? fmtSet(prev) : '–'}
      </button>
      <input
        inputMode="decimal"
        value={weight}
        placeholder={prev ? fmtWeight(prev.weight) : '0'}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setWeight(e.target.value);
          db.sets.update(set.id, { weight: parseNum(e.target.value) }).then(onEdited);
        }}
      />
      <input
        inputMode="numeric"
        value={reps}
        placeholder={prev?.reps != null ? String(prev.reps) : '0'}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setReps(e.target.value);
          const n = parseNum(e.target.value);
          db.sets.update(set.id, { reps: n == null ? null : Math.round(n) }).then(onEdited);
        }}
      />
      <button className={`check ${set.done ? 'on' : ''}`} onClick={onToggle} aria-label="Set afvinken">
        ✓
      </button>
      {(set.failure || set.rir != null || set.rpe != null) && (
        <span className="effort">
          {set.failure && <span className="effort-tag fail">Tot falen</span>}
          {set.rir != null && <span className="effort-tag">RIR {fmtWeight(set.rir)}</span>}
          {set.rpe != null && <span className="effort-tag">RPE {fmtWeight(set.rpe)}</span>}
        </span>
      )}
      {quick && <QuickAdjust set={set} {...quick} />}
    </div>
  );
}

/** Big −/+ buttons for the next set, so you don't need the keyboard; plates per side for barbells. */
function QuickAdjust({
  set,
  step,
  weighted,
  bar,
  prev,
}: {
  set: WorkoutSet;
  step: number;
  weighted: boolean;
  bar?: number;
  prev?: WorkoutSet;
}) {
  const weight = set.weight ?? prev?.weight ?? 0;
  const reps = set.reps ?? prev?.reps ?? 0;
  const change = (patch: Partial<WorkoutSet>) => db.sets.update(set.id, patch);
  const plates = bar != null ? platesPerSide(weight, bar) : null;
  return (
    <div className="quick-adjust">
      {weighted && (
        <div className="quick-group">
          <button
            onClick={() => change({ weight: Math.max(0, round2(weight - step)) })}
            aria-label={`${fmtWeight(step)} kg minder`}
          >
            −
          </button>
          <span className="num">{fmtWeight(weight)} kg</span>
          <button onClick={() => change({ weight: round2(weight + step) })} aria-label={`${fmtWeight(step)} kg meer`}>
            +
          </button>
        </div>
      )}
      <div className="quick-group">
        <button onClick={() => change({ reps: Math.max(0, reps - 1) })} aria-label="1 rep minder">
          −
        </button>
        <span className="num">{reps} reps</span>
        <button onClick={() => change({ reps: reps + 1 })} aria-label="1 rep meer">
          +
        </button>
      </div>
      {bar != null && (
        <span className="plates small">
          {plates
            ? `Per kant: ${plates.plates.map(fmtWeight).join(' + ')}${plates.rest ? ` (+${fmtWeight(plates.rest)} kg)` : ''}`
            : weight > 0
              ? `Lege stang (${fmtWeight(bar)} kg)`
              : ''}
        </span>
      )}
    </div>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Text state for a numeric input that follows outside changes (e.g. "copy previous"). */
function useNumberField(value: number | null): [string, (v: string) => void] {
  const [text, setText] = useState(value == null ? '' : fmtWeight(value));
  useEffect(() => {
    setText((t) => (parseNum(t) === value ? t : value == null ? '' : fmtWeight(value)));
  }, [value]);
  return [text, setText];
}
