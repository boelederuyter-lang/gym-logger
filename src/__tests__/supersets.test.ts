import { describe, expect, it } from 'vitest';
import { cleanLinks, supersetInfo, toggleLink } from '../supersets';

describe('supersets', () => {
  it('groups linked exercises with letters', () => {
    const info = supersetInfo([1, 2, 3, 4, 5, 6], [1, 4, 5]);
    expect(info.get(1)).toEqual({ label: 'A', position: 1, size: 2, last: false });
    expect(info.get(2)).toEqual({ label: 'A', position: 2, size: 2, last: true });
    expect(info.has(3)).toBe(false);
    expect(info.get(4)).toMatchObject({ label: 'B', position: 1, size: 3 });
    expect(info.get(6)).toMatchObject({ label: 'B', position: 3, last: true });
  });

  it('ignores a link on the last exercise', () => {
    expect(supersetInfo([1, 2], [2]).size).toBe(0);
  });

  it('cleans links after removing an exercise', () => {
    expect(cleanLinks([1, 3], [1, 2, 3])).toEqual([1]);
    expect(toggleLink([1], 1)).toEqual([]);
    expect(toggleLink([], 2)).toEqual([2]);
  });
});
