export interface Action {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

/** iOS-style action menu that slides up from the bottom. */
export function ActionSheet({ title, actions, onClose }: { title?: string; actions: Action[]; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="action-group">
          {title && <div className="action-title">{title}</div>}
          {actions.map((a) => (
            <button
              key={a.label}
              className={`action ${a.danger ? 'danger' : ''}`}
              onClick={() => {
                onClose();
                a.onClick();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button className="action action-cancel" onClick={onClose}>
          Annuleer
        </button>
      </div>
    </div>
  );
}
