import { exportData } from './db';
import { setSettings, type Settings } from './settings';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** A backup reminder is due once you have logged something and the last backup is over a week old. */
export function backupDue(settings: Settings, finishedWorkouts: number, now: number): boolean {
  if (finishedWorkouts === 0) return false;
  if (settings.backupSnoozedUntil && now < settings.backupSnoozedUntil) return false;
  return !settings.lastBackupAt || now - settings.lastBackupAt > WEEK;
}

export function snoozeBackup(days = 3) {
  setSettings({ backupSnoozedUntil: Date.now() + days * 24 * 60 * 60 * 1000 });
}

/**
 * Saves all data as a JSON file. On iPhone the share sheet opens, so you can put it in
 * iCloud Drive (Bewaar in Bestanden), AirDrop or mail it. Returns false when cancelled.
 */
export async function shareBackup(): Promise<boolean> {
  const json = await exportData();
  const name = `gym-logger-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch {
      return false; // cancelled
    }
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  setSettings({ lastBackupAt: Date.now(), backupSnoozedUntil: undefined });
  return true;
}
