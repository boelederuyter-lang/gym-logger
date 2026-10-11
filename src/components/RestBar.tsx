import { adjustRest, stopRest, useRest } from '../restTimer';
import { fmtDuration } from '../format';
import { useNow } from '../useNow';

export function RestBar() {
  const rest = useRest();
  const now = useNow(250, !!rest);
  if (!rest) return null;
  const left = rest.endsAt - now;
  const done = left <= 0;
  const pct = Math.min(100, Math.max(0, 100 - (left / (rest.total * 1000)) * 100));

  return (
    <div className={`rest-bar ${done ? 'done' : ''}`}>
      <div className="rest-progress" style={{ width: `${pct}%` }} />
      <button className="rest-btn" onClick={() => adjustRest(-15)}>−15</button>
      <div className="rest-time">
        <span className="small muted">{done ? 'Rust voorbij' : 'Rust'}</span>
        <strong>{done ? `+${fmtDuration(-left)}` : fmtDuration(left)}</strong>
      </div>
      <button className="rest-btn" onClick={() => adjustRest(15)}>+15</button>
      <button className="rest-btn skip" onClick={stopRest}>{done ? 'Ok' : 'Skip'}</button>
    </div>
  );
}
