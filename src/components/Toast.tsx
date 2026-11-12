import { hideToast, useToast } from '../toast';
import { tr } from '../i18n';

export function Toast() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <span>{toast.text}</span>
      {toast.undo && (
        <button
          className="toast-undo"
          onClick={async () => {
            hideToast();
            await toast.undo!();
          }}
        >
          {tr('Ongedaan maken', 'Undo')}
        </button>
      )}
    </div>
  );
}
