import { describe, expect, it } from 'vitest';
import { SkipModel } from '../src/model.js';

describe('SkipModel segment list refresh', () => {
  it('does not report a second entry when the list is refreshed inside a segment', () => {
    const m = new SkipModel();
    m.setSegments([{ start: 0, end: 12, type: 'intro' }]);
    expect(m.update({ time: 1, duration: 0 }).entered?.type).toBe('intro');
    // Duration becomes known, the element re-normalizes the same list.
    m.setSegments([{ start: 0, end: 12, type: 'intro' }], 35);
    const next = m.update({ time: 2, duration: 35 });
    expect(next.entered).toBeNull();
    expect(next.left).toBeNull();
    expect(next.active?.type).toBe('intro');
  });

  it('reports entry again after an explicit reset', () => {
    const m = new SkipModel();
    m.setSegments([{ start: 0, end: 12, type: 'intro' }], 35);
    m.update({ time: 1, duration: 35 });
    m.reset();
    expect(m.update({ time: 1, duration: 35 }).entered?.type).toBe('intro');
  });
});
