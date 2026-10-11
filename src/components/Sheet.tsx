import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  action?: ReactNode;
}

/** Full-height bottom sheet, iOS style. */
export function Sheet({ title, onClose, children, action }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="link" onClick={onClose}>
            Sluiten
          </button>
          <h2>{title}</h2>
          <div className="sheet-action">{action}</div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
