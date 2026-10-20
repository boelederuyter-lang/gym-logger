import { ExerciseFigure } from '../components/Figure';
import { LIBRARY } from '../library/exercises';

/** Dev-only overview of all exercise animations (open /#figuren=0.6, or /#figuren=0.6&vanaf=73 for a part). */
export function FigureGallery({ u, from = 0 }: { u?: number; from?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, padding: 8 }}>
      {LIBRARY.slice(from).map((x) => (
        <div key={x.slug} style={{ border: '1px solid #444', borderRadius: 8, padding: 4 }}>
          <ExerciseFigure anim={{ ...x.anim, thumb: u ?? x.anim.thumb }} />
          <div style={{ fontSize: 11 }}>{x.name}</div>
        </div>
      ))}
    </div>
  );
}
