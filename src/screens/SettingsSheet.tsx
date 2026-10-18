import { useRef } from 'react';
import { importData } from '../db';
import { shareBackup } from '../backup';
import { relativeDay } from '../stats';
import { showToast } from '../toast';
import { Sheet } from '../components/Sheet';
import { fmtWeight } from '../format';
import { setSettings, useSettings } from '../settings';

const BAR_OPTIONS = [20, 15, 10];
const STEP_OPTIONS = [1, 1.25, 2, 2.5, 5];

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    if (await shareBackup()) showToast('Backup gemaakt');
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
            <button
              key={w}
              className={`chip ${settings.barWeight === w ? 'active' : ''}`}
              onClick={() => setSettings({ barWeight: w })}
            >
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
            <button
              key={w}
              className={`chip ${settings.weightStep === w ? 'active' : ''}`}
              onClick={() => setSettings({ weightStep: w })}
            >
              {fmtWeight(w)} kg
            </button>
          ))}
        </div>
      </div>

      <label className="switch-row">
        <span>Piepje aan het einde van de rust</span>
        <input
          type="checkbox"
          className="switch"
          checked={settings.restBeep}
          onChange={(e) => setSettings({ restBeep: e.target.checked })}
        />
      </label>

      <div className="field">
        <span>Backup</span>
        <p className="small muted">
          Je data staat alleen op deze telefoon. Bewaar de backup in iCloud Drive (Delen → Bewaar in Bestanden), dan
          raak je niets kwijt als je de app verwijdert of een nieuwe telefoon krijgt. Laatste backup:{' '}
          {relativeDay(settings.lastBackupAt, Date.now())}.
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
