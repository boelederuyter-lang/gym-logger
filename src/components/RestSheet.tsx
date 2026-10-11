import { fmtRest } from '../format';
import { Sheet } from './Sheet';

export const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

export function RestSheet({
  value,
  onPick,
  onClose,
}: {
  value: number;
  onPick: (s: number) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Rusttijd" onClose={onClose}>
      <div className="chips wrap">
        {REST_OPTIONS.map((s) => (
          <button
            key={s}
            className={`chip big-chip ${value === s ? 'active' : ''}`}
            onClick={() => {
              onPick(s);
              onClose();
            }}
          >
            {fmtRest(s)}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
