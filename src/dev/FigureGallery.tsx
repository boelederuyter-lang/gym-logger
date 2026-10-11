import { ExerciseFigure } from '../components/Figure';
import { LIBRARY } from '../library/exercises';

/** Dev-only overview of all exercise animations (open /#figuren). */
export function FigureGallery({ u }: { u?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, padding: 8 }}>
      {LIBRARY.map((x) => (
        <div key={x.slug} style={{ border: '1px solid #444', borderRadius: 8, padding: 4 }}>
          <ExerciseFigure anim={{ ...x.anim, thumb: u ?? x.anim.thumb }} />
          <div style={{ fontSize: 11 }}>{x.name}</div>
        </div>
      ))}
    </div>
  );
}
