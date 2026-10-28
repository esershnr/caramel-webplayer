import { describe, expect, it } from 'vitest';
import { SkipModel, autoSkipCountdown } from '../src/model.js';

const INTRO = { start: 0, end: 30, type: 'intro' } as const;
const SEGMENTS = [INTRO, { start: 60, end: 90, type: 'recap' }];
const D = 120;

function model(options = {}) {
  const m = new SkipModel({ autoSkip: { intro: true, recap: true }, ...options });
  m.setSegments(SEGMENTS, D);
  return m;
}

const at = (m: SkipModel, time: number) => m.update({ time, duration: D });

describe('autoSkipCountdown', () => {
  it('skips at once without a delay', () => {
    expect(autoSkipCountdown({ time: 3, segment: INTRO, anchor: 3, delay: 0 })).toEqual({
      remaining: null,
      shouldSkip: true,
    });
  });

  it('counts from the anchor, not from the segment start', () => {
    expect(autoSkipCountdown({ time: 12, segment: INTRO, anchor: 10, delay: 5 })).toEqual({
      remaining: 3,
      shouldSkip: false,
    });
  });

  it('never skips a segment with no more than the delay left', () => {
    expect(autoSkipCountdown({ time: 26, segment: INTRO, anchor: 25, delay: 5 })).toEqual({
      remaining: null,
      shouldSkip: false,
    });
  });
});

describe('SkipModel autoSkipDelay', () => {
  it('delay 0 behaves as before: skip on the first tick and again after a rewind', () => {
    const m = model();
    expect(at(m, 61)).toMatchObject({ seekTo: 90, visible: false, countdown: null, autoSkipPending: false });
    expect(at(m, 70)).toMatchObject({ seekTo: null, visible: true });
    at(m, 10);
    expect(at(m, 65)).toMatchObject({ seekTo: 90, countdown: null });
  });

  it('counts down in media time and skips to the segment end', () => {
    const m = model({ autoSkipDelay: 5 });
    expect(at(m, 0)).toMatchObject({ seekTo: null, countdown: 5, autoSkipPending: true, visible: true });
    expect(at(m, 1).countdown).toBeCloseTo(4);
    expect(at(m, 2.4).countdown).toBeCloseTo(2.6);
    const last = at(m, 4.9);
    expect(last.countdown).toBeCloseTo(0.1);
    expect(last.seekTo).toBeNull();
    expect(at(m, 5)).toMatchObject({ seekTo: 30, countdown: null, autoSkipPending: false, visible: false });
    // A later tick inside the segment does not skip again.
    expect(at(m, 6)).toMatchObject({ seekTo: null, countdown: null });
  });

  it('keeps the remaining time while paused', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 0);
    expect(at(m, 2).countdown).toBe(3);
    expect(at(m, 2).countdown).toBe(3);
    expect(at(m, 2)).toMatchObject({ countdown: 3, seekTo: null });
  });

  it('anchors at the entry point after a seek into the middle', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 40);
    expect(at(m, 70)).toMatchObject({ countdown: 5, seekTo: null });
    expect(at(m, 73).countdown).toBe(2);
    expect(at(m, 75).seekTo).toBe(90);
  });

  it('seeking out clears the countdown and re-entry restarts the full delay', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 60);
    expect(at(m, 63).countdown).toBe(2);
    expect(at(m, 95)).toMatchObject({ countdown: null, autoSkipPending: false, active: null });
    expect(at(m, 61)).toMatchObject({ countdown: 5, seekTo: null });
  });

  it('never skips a segment shorter than the delay and keeps a manual button', () => {
    const m = model({ autoSkipDelay: 5 });
    expect(at(m, 27)).toMatchObject({ countdown: null, autoSkipPending: false, visible: true, seekTo: null });
    expect(at(m, 29.9)).toMatchObject({ seekTo: null, visible: true });
    expect(m.skip(D)).toBe(30);
  });

  it('a manual skip mid-countdown wins and the next tick does not auto-skip', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 60);
    at(m, 62);
    expect(m.skip(D)).toBe(90);
    // The seek has not landed yet.
    expect(at(m, 62.1)).toMatchObject({ seekTo: null, countdown: null, visible: false });
    expect(at(m, 68)).toMatchObject({ seekTo: null, countdown: null });
  });

  it('dismiss cancels the countdown until a rewind re-arms it', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 60);
    at(m, 62);
    expect(m.dismiss()).toBe(true);
    expect(at(m, 63)).toMatchObject({ countdown: null, visible: false, seekTo: null });
    expect(at(m, 70)).toMatchObject({ countdown: null, visible: false, seekTo: null });
    // Rewind within the tolerance does not re-arm.
    at(m, 59.8);
    expect(at(m, 60)).toMatchObject({ countdown: null, visible: false });
    // Rewind before start - 0.5 does.
    at(m, 59.4);
    expect(at(m, 60)).toMatchObject({ countdown: 5, visible: true });
    expect(at(m, 65).seekTo).toBe(90);
  });

  it('returns false when dismissing outside a segment', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 40);
    expect(m.dismiss()).toBe(false);
  });

  it('keeps the button visible during the countdown even with a shorter hideAfter', () => {
    const m = model({ autoSkipDelay: 5, hideAfter: 2 });
    at(m, 60);
    expect(at(m, 63)).toMatchObject({ visible: true, countdown: 2 });
    expect(at(m, 64.5)).toMatchObject({ visible: true });
  });

  it('applies hideAfter normally to a segment too short to count down', () => {
    const m = model({ autoSkipDelay: 5, hideAfter: 2 });
    expect(at(m, 27).visible).toBe(false);
  });

  it('keeps the anchor when the same list is set again mid-countdown', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 60);
    at(m, 62);
    m.setSegments(SEGMENTS, D);
    const next = at(m, 63);
    expect(next.entered).toBeNull();
    expect(next.countdown).toBe(2);
    expect(at(m, 65).seekTo).toBe(90);
  });

  it('forgets the countdown on reset', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 60);
    at(m, 63);
    m.reset();
    expect(at(m, 64).countdown).toBe(5);
  });

  it('moves the anchor back on a seek backwards inside the segment', () => {
    const m = model({ autoSkipDelay: 5 });
    at(m, 70);
    expect(at(m, 73).countdown).toBe(2);
    expect(at(m, 65).countdown).toBe(5);
    expect(at(m, 68).countdown).toBe(2);
    expect(at(m, 70).seekTo).toBe(90);
  });

  it('treats an invalid or negative delay as none', () => {
    expect(new SkipModel({ autoSkipDelay: -3 }).options.autoSkipDelay).toBe(0);
    const m = model();
    m.setOptions({ autoSkipDelay: Number.NaN });
    expect(m.options.autoSkipDelay).toBe(0);
    expect(at(m, 61).seekTo).toBe(90);
  });
});
