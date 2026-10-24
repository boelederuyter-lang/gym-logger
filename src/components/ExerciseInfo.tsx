import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addExercisesToWorkout, addToTemplate, db, startWorkout, type Exercise } from '../db';
import { coachInfo, PATROON_LABEL, type CoachOefening } from '../coach/exercises';
import { animFor, EQUIPMENT_LABELS } from '../library/exercises';
import { JointsField, PatternField } from './CoachFields';
import { showToast } from '../toast';
import { ActionSheet } from './ActionSheet';
import { ExerciseFigure } from './Figure';
import { NoteBlock, NoteSheet } from './NoteSheet';
import { ProgressSheet } from './ProgressSheet';
import { Sheet } from './Sheet';

interface Props {
  exerciseId: number;
  onClose: () => void;
  /** Replaces the default buttons, e.g. "Selecteren" in the picker. */
  primary?: { label: string; onClick: () => void };
  /** Called after a workout was started from here. */
  onOpenWorkout?: () => void;
}

export function ExerciseInfo({ exerciseId: initialId, onClose, primary, onOpenWorkout }: Props) {
  // Tapping an alternative shows that exercise in the same sheet.
  const [exerciseId, setExerciseId] = useState(initialId);
  const ex = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const active = useLiveQuery(() => db.workouts.filter((w) => !w.endedAt).first(), []);
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []);
  const [choosingProgram, setChoosingProgram] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [progress, setProgress] = useState(false);
  const [editingCoach, setEditingCoach] = useState(false);
  const altSlugs = ex?.slug ? coachInfo(ex).alternatieven : [];
  const alternatives = useLiveQuery(
    async () =>
      (await db.exercises.where('slug').anyOf(altSlugs).toArray()).sort(
        (a, b) => altSlugs.indexOf(a.slug!) - altSlugs.indexOf(b.slug!),
      ),
    [altSlugs.join()],
  );

  if (!ex) return null;
  const info = coachInfo(ex);

  async function addToWorkout(ex: Exercise) {
    if (active) {
      await addExercisesToWorkout(active, [ex]);
      showToast(`${ex.name} toegevoegd aan je workout`);
      onClose();
    } else {
      await startWorkout(undefined, [ex]);
      onClose();
      onOpenWorkout?.();
    }
  }

  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="figure-stage">
        <ExerciseFigure anim={animFor(ex)} animate />
      </div>
      <div className="inline wrap-gap">
        <span className="tag">{ex.muscle}</span>
        <span className="tag">{EQUIPMENT_LABELS[ex.equipment]}</span>
      </div>
      {ex.tip && <p className="tip">{ex.tip}</p>}
      {ex.aliases.length > 0 && <p className="small muted">Ook bekend als {ex.aliases.join(', ')}</p>}
      <NoteBlock note={ex.note} />
      <CoachBlock info={info} custom={!ex.slug} onEdit={() => setEditingCoach(true)} />
      {!primary && alternatives && alternatives.length > 0 && (
        <div className="field">
          <span>Alternatieven</span>
          <div className="chips wrap">
            {alternatives.map((a) => (
              <button
                key={a.id}
                className="chip"
                onClick={(e) => {
                  e.currentTarget.closest('.sheet-body')?.scrollTo({ top: 0 });
                  setExerciseId(a.id);
                }}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {primary ? (
        <button className="btn primary block big" onClick={primary.onClick}>
          {primary.label}
        </button>
      ) : (
        <div className="stack">
          <button className="btn primary block" onClick={() => addToWorkout(ex)}>
            {active ? 'Toevoegen aan je workout' : 'Start een workout met deze oefening'}
          </button>
          <button className="btn secondary block" onClick={() => setChoosingProgram(true)}>
            Toevoegen aan een programma
          </button>
          <button className="btn secondary block" onClick={() => setProgress(true)}>
            Je voortgang bekijken
          </button>
          <button className="btn ghost block" onClick={() => setEditingNote(true)}>
            {ex.note ? 'Notitie bewerken' : 'Notitie toevoegen'}
          </button>
        </div>
      )}

      {choosingProgram && (
        <ActionSheet
          title={templates?.length ? 'Kies een programma' : 'Je hebt nog geen programma’s'}
          onClose={() => setChoosingProgram(false)}
          actions={[
            ...(templates ?? []).map((t) => ({
              label: t.name,
              onClick: async () => {
                await addToTemplate(t.id, [ex]);
                showToast(`${ex.name} toegevoegd aan ${t.name}`);
              },
            })),
            {
              label: '+ Nieuw programma',
              onClick: async () => {
                const id = await db.templates.add({ name: ex.muscle, items: [], createdAt: Date.now() });
                await addToTemplate(id, [ex]);
                showToast(`Programma “${ex.muscle}” gemaakt`);
              },
            },
          ]}
        />
      )}
      {editingNote && <NoteSheet exercise={ex} onClose={() => setEditingNote(false)} />}
      {progress && <ProgressSheet exerciseId={ex.id} onClose={() => setProgress(false)} />}
      {editingCoach && <CoachEditSheet exercise={ex} onClose={() => setEditingCoach(false)} />}
    </Sheet>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** What the coach knows about an exercise: pattern, muscles, joints and default reps and rest. */
function CoachBlock({ info, custom, onEdit }: { info: CoachOefening; custom: boolean; onEdit: () => void }) {
  const reps = `${info.reps[0]}–${info.reps[1]}${info.eenheid === 'sec' ? ' sec' : ' reps'}`;
  const rest = info.rust >= 60 ? `${info.rust / 60} min`.replace('.', ',') : `${info.rust} sec`;
  return (
    <div className="coach-facts">
      <div>
        <span>Patroon</span>
        <strong>{PATROON_LABEL[info.patroon]}</strong>
      </div>
      <div>
        <span>Spieren</span>
        <strong>{info.primair.map(cap).join(', ')}</strong>
        {info.secundair.length > 0 && <small className="muted">+ {info.secundair.join(', ')}</small>}
      </div>
      <div>
        <span>Standaard</span>
        <strong>
          {reps} · {rest} rust
        </strong>
      </div>
      {!custom && info.niveau !== 'beginner' && (
        <div>
          <span>Niveau</span>
          <strong>{cap(info.niveau)}</strong>
        </div>
      )}
      <div>
        <span>Belast</span>
        <strong>{info.gewrichten.length ? info.gewrichten.map(cap).join(', ') : 'Niets in het bijzonder'}</strong>
      </div>
      {custom && (
        <button className="link strong" onClick={onEdit}>
          Coachgegevens aanpassen
        </button>
      )}
    </div>
  );
}

function CoachEditSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [patroon, setPatroon] = useState(exercise.coach?.patroon);
  const [gewrichten, setGewrichten] = useState(exercise.coach?.gewrichten ?? []);
  async function save() {
    await db.exercises.update(exercise.id, { coach: { ...exercise.coach, patroon, gewrichten } });
    onClose();
  }
  return (
    <Sheet
      title="Coachgegevens"
      onClose={onClose}
      action={
        <button className="link strong" onClick={save}>
          Bewaar
        </button>
      }
    >
      <PatternField value={patroon} onChange={setPatroon} />
      <JointsField value={gewrichten} onChange={setGewrichten} />
    </Sheet>
  );
}
