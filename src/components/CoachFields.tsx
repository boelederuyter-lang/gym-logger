import { GEWRICHTEN, PATROON_LABEL, PATRONEN, type Gewricht, type Patroon } from '../coach/exercises';

/** Chips to pick the movement pattern of a custom exercise ("Weet ik niet" = undefined). */
export function PatternField({ value, onChange }: { value?: Patroon; onChange: (p?: Patroon) => void }) {
  return (
    <div className="field">
      <span>Bewegingspatroon</span>
      <div className="chips wrap">
        <button className={`chip ${!value ? 'active' : ''}`} onClick={() => onChange(undefined)}>
          Weet ik niet
        </button>
        {PATRONEN.map((p) => (
          <button key={p} className={`chip ${value === p ? 'active' : ''}`} onClick={() => onChange(p)}>
            {PATROON_LABEL[p]}
          </button>
        ))}
      </div>
      <small className="muted">Hiermee kan de coach een vervanger voorstellen.</small>
    </div>
  );
}

/** Chips to tick the joints an exercise loads, so the coach can avoid it with an injury. */
export function JointsField({ value, onChange }: { value: Gewricht[]; onChange: (g: Gewricht[]) => void }) {
  const toggle = (g: Gewricht) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  return (
    <div className="field">
      <span>Belast deze gewrichten</span>
      <div className="chips wrap">
        {GEWRICHTEN.map((g) => (
          <button key={g} className={`chip ${value.includes(g) ? 'active' : ''}`} onClick={() => toggle(g)}>
            {g[0].toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
