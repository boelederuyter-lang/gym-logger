import { hideToast, useToast } from '../toast';

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
          Ongedaan maken
        </button>
      )}
    </div>
  );
}
