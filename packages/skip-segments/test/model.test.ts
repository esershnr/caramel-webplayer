import { describe, expect, it } from 'vitest';
import { SkipModel } from '../src/model.js';

const SEGMENTS = [
  { start: 0, end: 30, type: 'intro' },
  { start: 60, end: 90, type: 'recap' },
  { start: 110, end: 120, type: 'outro' },
];

function model(options = {}) {
  const m = new SkipModel(options);
  m.setSegments(SEGMENTS, 120);
  return m;
}

describe('SkipModel', () => {
  it('shows the button inside a segment and hides it outside', () => {
    const m = model();
    expect(m.update({ time: 5, duration: 120 })).toMatchObject({ visible: true, seekTo: null });
    expect(m.active?.type).toBe('intro');
    expect(m.update({ time: 45, duration: 120 })).toMatchObject({ visible: false, active: null });
  });

  it('reports enter and leave transitions once', () => {
    const m = model();
    const first = m.update({ time: 1, duration: 120 });
    expect(first.entered?.type).toBe('intro');
    expect(first.left).toBeNull();
    const second = m.update({ time: 2, duration: 120 });
    expect(second.entered).toBeNull();
    const third = m.update({ time: 61, duration: 120 });
    expect(third.left?.type).toBe('intro');
    expect(third.entered?.type).toBe('recap');
  });

  it('auto-skips configured types exactly once per entry', () => {
    const m = model({ autoSkip: { recap: true } });
    expect(m.update({ time: 61, duration: 120 })).toMatchObject({ seekTo: 90, visible: false });
    // The seek lands at 90 and playback continues; a later tick inside the
    // segment (for example a user seek to 70) must not skip again.
    expect(m.update({ time: 70, duration: 120 })).toMatchObject({ seekTo: null, visible: true });
    // Rewinding before the segment re-arms it.
    m.update({ time: 10, duration: 120 });
    expect(m.update({ time: 65, duration: 120 })).toMatchObject({ seekTo: 90 });
  });

  it('does not auto-skip types that are not configured', () => {
    const m = model({ autoSkip: { intro: true } });
    expect(m.update({ time: 65, duration: 120 }).seekTo).toBeNull();
  });

  it('manual skip seeks to the clamped end and dismisses the button', () => {
    const m = model();
    m.update({ time: 115, duration: 120 });
    expect(m.skip(120)).toBe(120);
    expect(m.update({ time: 116, duration: 120 }).visible).toBe(false);
    expect(m.skip(120)).toBe(120);
  });

  it('returns null for a manual skip outside segments', () => {
    const m = model();
    m.update({ time: 50, duration: 120 });
    expect(m.skip(120)).toBeNull();
  });

  it('hides the button after hideAfter seconds', () => {
    const m = model({ hideAfter: 5 });
    expect(m.update({ time: 2, duration: 120 }).visible).toBe(true);
    expect(m.update({ time: 7, duration: 120 }).visible).toBe(false);
    expect(m.update({ time: 7, duration: 120 }).active?.type).toBe('intro');
  });

  it('forgets state on reset', () => {
    const m = model({ autoSkip: { intro: true } });
    expect(m.update({ time: 1, duration: 120 }).seekTo).toBe(30);
    m.reset();
    expect(m.update({ time: 1, duration: 120 }).seekTo).toBe(30);
  });

  it('re-normalizes when the duration becomes known', () => {
    const m = new SkipModel();
    m.setSegments([{ start: 110, end: 500, type: 'outro' }]);
    expect(m.segments[0]?.end).toBe(500);
    m.setSegments([{ start: 110, end: 500, type: 'outro' }], 120);
    expect(m.segments[0]?.end).toBe(120);
  });
});
