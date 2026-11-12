import { useState } from 'react';
import { db, type Exercise } from '../db';
import { Sheet } from './Sheet';
import { tr } from '../i18n';

export function NoteSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [text, setText] = useState(exercise.note ?? '');

  async function save() {
    await db.exercises.update(exercise.id, { note: text.trim() || undefined });
    onClose();
  }

  return (
    <Sheet
      title={tr('Notitie', 'Note')}
      onClose={onClose}
      action={
        <button className="link strong" onClick={save}>
          {tr('Bewaar', 'Save')}
        </button>
      }
    >
      <p className="muted small">
        {tr(
          `Eén notitie voor ${exercise.name}. Je ziet hem in elke workout en elk programma.`,
          `One note for ${exercise.name}. You'll see it in every workout and every program.`,
        )}
      </p>
      <textarea
        className="note-input"
        autoFocus
        rows={4}
        value={text}
        placeholder={tr('Bijv. rek op stand 12, stoel op 4', 'E.g. rack at 12, seat at 4')}
        onChange={(e) => setText(e.target.value)}
      />
    </Sheet>
  );
}

export function NoteBlock({ note }: { note?: string }) {
  if (!note) return null;
  return <div className="note-block">{note}</div>;
}
