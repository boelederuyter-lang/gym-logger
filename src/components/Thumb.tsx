import { animFor } from '../library/exercises';
import { ExerciseFigure } from './Figure';

/** Small static figure; tappable when `onClick` is given. */
export function Thumb({ exercise, onClick, size = 44 }: { exercise?: { slug?: string; muscle: string }; onClick?: () => void; size?: number }) {
  const fig = exercise ? <ExerciseFigure anim={animFor(exercise)} /> : null;
  const style = { width: size, height: size };
  if (!onClick) return <div className="thumb" style={style}>{fig}</div>;
  return (
    <button className="thumb" style={style} onClick={onClick} aria-label="Uitvoering bekijken">
      {fig}
    </button>
  );
}
