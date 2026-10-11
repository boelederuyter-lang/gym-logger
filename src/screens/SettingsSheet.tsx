import { useRef } from 'react';
import { exportData, importData } from '../db';
import { Sheet } from '../components/Sheet';
import { setSettings, useSettings } from '../settings';

const REST_OPTIONS = [60, 90, 120, 150, 180, 240];

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    const json = await exportData();
    const name = `gym-logger-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: 'application/json' });
    // On iPhone the share sheet lets you save to Files, AirDrop or mail it.
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => {});
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    if (!confirm('Importeren vervangt al je huidige data. Doorgaan?')) return;
    try {
      await importData(await file.text());
      alert('Import gelukt.');
    } catch (e) {
      alert(`Import mislukt: ${(e as Error).message}`);
    }
  }

  return (
    <Sheet title="Instellingen" onClose={onClose}>
      <div className="field">
        <span>Rusttijd na een set</span>
        <div className="chips wrap">
          {REST_OPTIONS.map((s) => (
            <button
              key={s}
              className={`chip ${settings.restSeconds === s ? 'active' : ''}`}
              onClick={() => setSettings({ restSeconds: s })}
            >
              {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Backup</span>
        <p className="small muted">
          Je data staat alleen op deze telefoon. Maak af en toe een backup, zeker voordat je de app van je beginscherm
          verwijdert.
        </p>
        <div className="row-buttons">
          <button className="btn secondary" onClick={doExport}>
            Exporteren
          </button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>
            Importeren
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = '';
          }}
        />
      </div>
    </Sheet>
  );
}
