import { useRef } from 'react';
import { exportData, importData } from '../db';
import { Sheet } from '../components/Sheet';
import { fmtWeight } from '../format';
import { setSettings, useSettings } from '../settings';

const BAR_OPTIONS = [20, 15, 10];
const STEP_OPTIONS = [1, 1.25, 2, 2.5, 5];

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
        <span>Gewicht van de stang</span>
        <div className="chips wrap">
          {BAR_OPTIONS.map((w) => (
            <button key={w} className={`chip ${settings.barWeight === w ? 'active' : ''}`} onClick={() => setSettings({ barWeight: w })}>
              {w} kg
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Kleinste gewichtstap</span>
        <p className="small muted">Warming-up sets worden hierop afgerond.</p>
        <div className="chips wrap">
          {STEP_OPTIONS.map((w) => (
            <button key={w} className={`chip ${settings.weightStep === w ? 'active' : ''}`} onClick={() => setSettings({ weightStep: w })}>
              {fmtWeight(w)} kg
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
