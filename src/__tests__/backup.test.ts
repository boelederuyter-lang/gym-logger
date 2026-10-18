import { describe, expect, it } from 'vitest';
import { backupDue } from '../backup';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 18);
const base = { barWeight: 20, weightStep: 2.5, restBeep: true };

describe('backupDue', () => {
  it('waits until something is logged', () => {
    expect(backupDue(base, 0, now)).toBe(false);
    expect(backupDue(base, 1, now)).toBe(true);
  });

  it('asks again a week after the last backup', () => {
    expect(backupDue({ ...base, lastBackupAt: now - 6 * DAY }, 5, now)).toBe(false);
    expect(backupDue({ ...base, lastBackupAt: now - 8 * DAY }, 5, now)).toBe(true);
  });

  it('respects "Later"', () => {
    expect(backupDue({ ...base, backupSnoozedUntil: now + DAY }, 5, now)).toBe(false);
    expect(backupDue({ ...base, backupSnoozedUntil: now - DAY }, 5, now)).toBe(true);
  });
});
