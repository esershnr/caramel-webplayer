import { describe, expect, it } from 'vitest';
import { groupRuns } from '../src/groups.js';
import { normalizeItems } from '../src/model.js';

describe('groupRuns', () => {
  it('joins consecutive items with the same group', () => {
    expect(groupRuns([{ group: 'S1' }, { group: 'S1' }, { group: 'S2' }, { group: 'S2' }, { group: 'S2' }])).toEqual([
      { group: 'S1', start: 0, end: 2 },
      { group: 'S2', start: 2, end: 5 },
    ]);
  });

  it('puts items without a group in null runs', () => {
    expect(groupRuns([{}, { group: undefined }, { group: 'S1' }, {}, { group: '' }])).toEqual([
      { group: null, start: 0, end: 2 },
      { group: 'S1', start: 2, end: 3 },
      { group: null, start: 3, end: 5 },
    ]);
  });

  it('starts a new run when a name repeats after other items', () => {
    expect(groupRuns([{ group: 'A' }, { group: 'B' }, { group: 'A' }, {}, { group: 'A' }])).toEqual([
      { group: 'A', start: 0, end: 1 },
      { group: 'B', start: 1, end: 2 },
      { group: 'A', start: 2, end: 3 },
      { group: null, start: 3, end: 4 },
      { group: 'A', start: 4, end: 5 },
    ]);
  });

  it('returns no runs for an empty list', () => {
    expect(groupRuns([])).toEqual([]);
  });

  it('returns one run for a single item', () => {
    expect(groupRuns([{ group: 'S1' }])).toEqual([{ group: 'S1', start: 0, end: 1 }]);
    expect(groupRuns([{}])).toEqual([{ group: null, start: 0, end: 1 }]);
  });
});

describe('normalizeItems group', () => {
  it('keeps a non-empty string group and drops anything else', () => {
    const items = normalizeItems([
      { id: 'a', src: 'a.mp4', group: '1. Sezon' },
      { id: 'b', src: 'b.mp4', group: 2 },
      { id: 'c', src: 'c.mp4', group: '' },
      { id: 'd', src: 'd.mp4', group: { name: 'x' } },
      { id: 'e', src: 'e.mp4' },
    ]);
    expect(items.map((item) => item.group)).toEqual(['1. Sezon', undefined, undefined, undefined, undefined]);
    expect('group' in (items[1] ?? {})).toBe(false);
  });
});
