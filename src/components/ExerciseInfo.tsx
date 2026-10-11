import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addExercisesToWorkout, addToTemplate, db, startWorkout, type Exercise } from '../db';
import { animFor, EQUIPMENT_LABELS } from '../library/exercises';
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

export function ExerciseInfo({ exerciseId, onClose, primary, onOpenWorkout }: Props) {
  const ex = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const active = useLiveQuery(() => db.workouts.filter((w) => !w.endedAt).first(), []);
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []);
  const [choosingProgram, setChoosingProgram] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [progress, setProgress] = useState(false);

  if (!ex) return null;

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
    </Sheet>
  );
}
