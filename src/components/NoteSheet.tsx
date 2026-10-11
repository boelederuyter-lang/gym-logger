import { useState } from 'react';
import { db, type Exercise } from '../db';
import { Sheet } from './Sheet';

export function NoteSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [text, setText] = useState(exercise.note ?? '');

  async function save() {
    await db.exercises.update(exercise.id, { note: text.trim() || undefined });
    onClose();
  }

  return (
    <Sheet
      title="Notitie"
      onClose={onClose}
      action={
        <button className="link strong" onClick={save}>
          Bewaar
        </button>
      }
    >
      <p className="muted small">Eén notitie voor {exercise.name}. Je ziet hem in elke workout en elk programma.</p>
      <textarea
        className="note-input"
        autoFocus
        rows={4}
        value={text}
        placeholder="Bijv. rek op stand 12, stoel op 4"
        onChange={(e) => setText(e.target.value)}
      />
    </Sheet>
  );
}

export function NoteBlock({ note }: { note?: string }) {
  if (!note) return null;
  return <div className="note-block">{note}</div>;
}
