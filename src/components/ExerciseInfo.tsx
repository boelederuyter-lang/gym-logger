import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addExercisesToWorkout, addToTemplate, db, startWorkout, type Exercise } from '../db';
import { coachInfo, GEWRICHT_LABEL, PATROON_LABEL, SPIER_LABEL, type CoachOefening } from '../coach/exercises';
import { NIVEAU_TEKST } from '../coach/profile';
import { animFor, EQUIPMENT_LABELS, muscleLabel } from '../library/exercises';
import { JointsField, PatternField } from './CoachFields';
import { showToast } from '../toast';
import { ActionSheet } from './ActionSheet';
import { ExerciseFigure } from './Figure';
import { NoteBlock, NoteSheet } from './NoteSheet';
import { ProgressSheet } from './ProgressSheet';
import { Sheet } from './Sheet';
import { decimal, tr } from '../i18n';

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
      showToast(tr(`${ex.name} toegevoegd aan je workout`, `${ex.name} added to your workout`));
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
        <span className="tag">{muscleLabel(ex.muscle)}</span>
        <span className="tag">{EQUIPMENT_LABELS[ex.equipment]}</span>
      </div>
      {ex.tip && <p className="tip">{ex.tip}</p>}
      {ex.aliases.length > 0 && (
        <p className="small muted">
          {tr('Ook bekend als', 'Also known as')} {ex.aliases.join(', ')}
        </p>
      )}
      <NoteBlock note={ex.note} />
      <CoachBlock info={info} custom={!ex.slug} onEdit={() => setEditingCoach(true)} />
      {!primary && alternatives && alternatives.length > 0 && (
        <div className="field">
          <span>{tr('Alternatieven', 'Alternatives')}</span>
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
            {active
              ? tr('Toevoegen aan je workout', 'Add to your workout')
              : tr('Start een workout met deze oefening', 'Start a workout with this exercise')}
          </button>
          <button className="btn secondary block" onClick={() => setChoosingProgram(true)}>
            {tr('Toevoegen aan een programma', 'Add to a program')}
          </button>
          <button className="btn secondary block" onClick={() => setProgress(true)}>
            {tr('Je voortgang bekijken', 'View your progress')}
          </button>
          <button className="btn ghost block" onClick={() => setEditingNote(true)}>
            {ex.note ? tr('Notitie bewerken', 'Edit note') : tr('Notitie toevoegen', 'Add note')}
          </button>
        </div>
      )}

      {choosingProgram && (
        <ActionSheet
          title={
            templates?.length
              ? tr('Kies een programma', 'Choose a program')
              : tr('Je hebt nog geen programma’s', "You don't have any programs yet")
          }
          onClose={() => setChoosingProgram(false)}
          actions={[
            ...(templates ?? []).map((t) => ({
              label: t.name,
              onClick: async () => {
                await addToTemplate(t.id, [ex]);
                showToast(tr(`${ex.name} toegevoegd aan ${t.name}`, `${ex.name} added to ${t.name}`));
              },
            })),
            {
              label: tr('+ Nieuw programma', '+ New program'),
              onClick: async () => {
                const id = await db.templates.add({ name: muscleLabel(ex.muscle), items: [], createdAt: Date.now() });
                await addToTemplate(id, [ex]);
                showToast(
                  tr(`Programma “${muscleLabel(ex.muscle)}” gemaakt`, `Program “${muscleLabel(ex.muscle)}” created`),
                );
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
  const rest = info.rust >= 60 ? `${decimal(info.rust / 60)} min` : `${info.rust} sec`;
  return (
    <div className="coach-facts">
      <div>
        <span>{tr('Patroon', 'Pattern')}</span>
        <strong>{PATROON_LABEL[info.patroon]}</strong>
      </div>
      <div>
        <span>{tr('Spieren', 'Muscles')}</span>
        <strong>{info.primair.map((s) => cap(SPIER_LABEL[s])).join(', ')}</strong>
        {info.secundair.length > 0 && (
          <small className="muted">+ {info.secundair.map((s) => SPIER_LABEL[s]).join(', ')}</small>
        )}
      </div>
      <div>
        <span>{tr('Standaard', 'Default')}</span>
        <strong>
          {reps} · {rest} {tr('rust', 'rest')}
        </strong>
      </div>
      {!custom && info.niveau !== 'beginner' && (
        <div>
          <span>{tr('Niveau', 'Level')}</span>
          <strong>{NIVEAU_TEKST[info.niveau][0]}</strong>
        </div>
      )}
      <div>
        <span>{tr('Belast', 'Loads')}</span>
        <strong>
          {info.gewrichten.length
            ? info.gewrichten.map((g) => cap(GEWRICHT_LABEL[g])).join(', ')
            : tr('Niets in het bijzonder', 'Nothing in particular')}
        </strong>
      </div>
      {custom && (
        <button className="link strong" onClick={onEdit}>
          {tr('Coachgegevens aanpassen', 'Edit coach details')}
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
      title={tr('Coachgegevens', 'Coach details')}
      onClose={onClose}
      action={
        <button className="link strong" onClick={save}>
          {tr('Bewaar', 'Save')}
        </button>
      }
    >
      <PatternField value={patroon} onChange={setPatroon} />
      <JointsField value={gewrichten} onChange={setGewrichten} />
    </Sheet>
  );
}
