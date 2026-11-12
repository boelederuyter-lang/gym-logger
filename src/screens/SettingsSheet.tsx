import { useRef } from 'react';
import { importData } from '../db';
import { shareBackup } from '../backup';
import { relativeDay } from '../stats';
import { showToast } from '../toast';
import { Sheet } from '../components/Sheet';
import { fmtWeight } from '../format';
import { setSettings, useSettings } from '../settings';
import { getLangChoice, setLangChoice, tr, type LangChoice } from '../i18n';

const BAR_OPTIONS = [20, 15, 10];
const STEP_OPTIONS = [1, 1.25, 2, 2.5, 5];

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    if (await shareBackup()) showToast(tr('Backup gemaakt', 'Backup created'));
  }

  async function doImport(file: File) {
    if (
      !confirm(
        tr('Importeren vervangt al je huidige data. Doorgaan?', 'Importing replaces all your current data. Continue?'),
      )
    )
      return;
    try {
      await importData(await file.text());
      alert(tr('Import gelukt.', 'Import successful.'));
    } catch (e) {
      alert(`${tr('Import mislukt', 'Import failed')}: ${(e as Error).message}`);
    }
  }

  return (
    <Sheet title={tr('Instellingen', 'Settings')} onClose={onClose}>
      <div className="field">
        <span>{tr('Taal', 'Language')}</span>
        <div className="chips wrap">
          {(
            [
              ['auto', tr('Automatisch', 'Automatic')],
              ['nl', 'Nederlands'],
              ['en', 'English'],
            ] as [LangChoice, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              className={`chip ${getLangChoice() === v ? 'active' : ''}`}
              onClick={() => setLangChoice(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>{tr('Gewicht van de stang', 'Barbell weight')}</span>
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
        <span>{tr('Kleinste gewichtstap', 'Smallest weight step')}</span>
        <p className="small muted">
          {tr('Warming-up sets worden hierop afgerond.', 'Warm-up sets are rounded to this.')}
        </p>
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
        <span>{tr('Piepje aan het einde van de rust', 'Beep when rest is over')}</span>
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
          {tr(
            'Je data staat alleen op deze telefoon. Bewaar de backup in iCloud Drive (Delen → Bewaar in Bestanden), dan raak je niets kwijt als je de app verwijdert of een nieuwe telefoon krijgt. Laatste backup:',
            'Your data lives only on this phone. Save the backup to iCloud Drive (Share → Save to Files) so you lose nothing if you delete the app or get a new phone. Last backup:',
          )}{' '}
          {relativeDay(settings.lastBackupAt, Date.now())}.
        </p>
        <div className="row-buttons">
          <button className="btn secondary" onClick={doExport}>
            {tr('Exporteren', 'Export')}
          </button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>
            {tr('Importeren', 'Import')}
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
