import { describe, expect, it } from 'vitest';
import {
  findActiveIndex,
  normalizeSegments,
  parseAutoSkip,
  segmentAtRatio,
  segmentGeometry,
  skipTarget,
} from '../src/segments.js';

describe('normalizeSegments', () => {
  it('drops invalid entries and sorts by start', () => {
    const out = normalizeSegments([
      { start: 60, end: 90, type: 'recap' },
      { start: 0, end: 30, type: 'intro' },
      { start: 10, end: 5, type: 'intro' },
      { start: 'a', end: 5, type: 'intro' },
      { start: 1, end: 2, type: 'ad' },
      null,
      'x',
    ]);
    expect(out.map((s) => s.type)).toEqual(['intro', 'recap']);
    expect(out[0]).toEqual({ start: 0, end: 30, type: 'intro' });
  });

  it('clamps to the duration and keeps labels', () => {
    const out = normalizeSegments([{ start: -5, end: 500, type: 'outro', label: ' Son ' }], 120);
    expect(out).toEqual([{ start: 0, end: 120, type: 'outro', label: 'Son' }]);
  });

  it('drops segments that fall entirely past the duration', () => {
    expect(normalizeSegments([{ start: 130, end: 140, type: 'outro' }], 120)).toEqual([]);
  });

  it('merges overlapping segments of the same type only', () => {
    const out = normalizeSegments([
      { start: 0, end: 20, type: 'intro' },
      { start: 15, end: 30, type: 'intro' },
      { start: 25, end: 40, type: 'sponsor' },
    ]);
    expect(out).toEqual([
      { start: 0, end: 30, type: 'intro' },
      { start: 25, end: 40, type: 'sponsor' },
    ]);
  });

  it('returns an empty list for non arrays', () => {
    expect(normalizeSegments(undefined)).toEqual([]);
    expect(normalizeSegments({})).toEqual([]);
  });
});

describe('parseAutoSkip', () => {
  it('parses lists and the all keyword', () => {
    expect(parseAutoSkip('intro, recap')).toEqual({ intro: true, recap: true });
    expect(parseAutoSkip('all')).toEqual({ intro: true, recap: true, outro: true, sponsor: true });
    expect(parseAutoSkip('bogus')).toEqual({});
    expect(parseAutoSkip(null)).toEqual({});
  });
});

describe('findActiveIndex', () => {
  const segments = normalizeSegments([
    { start: 0, end: 30, type: 'intro' },
    { start: 100, end: 130, type: 'sponsor' },
  ]);

  it('treats start as inclusive and end as exclusive', () => {
    expect(findActiveIndex(segments, 0)).toBe(0);
    expect(findActiveIndex(segments, 29.9)).toBe(0);
    expect(findActiveIndex(segments, 30)).toBe(-1);
    expect(findActiveIndex(segments, 100)).toBe(1);
    expect(findActiveIndex(segments, NaN)).toBe(-1);
  });
});

describe('skipTarget and segmentGeometry', () => {
  it('never seeks past the duration', () => {
    expect(skipTarget({ start: 0, end: 30, type: 'intro' }, 120)).toBe(30);
    expect(skipTarget({ start: 100, end: 130, type: 'outro' }, 120)).toBe(120);
    expect(skipTarget({ start: 100, end: 130, type: 'outro' }, NaN)).toBe(130);
  });

  it('computes percentages clamped to the track', () => {
    expect(segmentGeometry({ start: 30, end: 60, type: 'recap' }, 120)).toEqual({ start: 25, width: 25 });
    expect(segmentGeometry({ start: 100, end: 200, type: 'outro' }, 120)).toEqual({
      start: 100 / 1.2,
      width: 100 - 100 / 1.2,
    });
    expect(segmentGeometry({ start: 0, end: 10, type: 'intro' }, 0)).toBeNull();
  });
});

describe('segmentAtRatio', () => {
  const segments = normalizeSegments([
    { start: 0, end: 6, type: 'intro' },
    { start: 18, end: 23, type: 'sponsor' },
  ]);

  it('finds the band under a timeline position', () => {
    expect(segmentAtRatio(segments, 0, 100)?.type).toBe('intro');
    expect(segmentAtRatio(segments, 0.2, 100)?.type).toBe('sponsor');
  });

  it('returns null between bands, at the end and without a duration', () => {
    expect(segmentAtRatio(segments, 0.1, 100)).toBeNull();
    expect(segmentAtRatio(segments, 0.23, 100)).toBeNull();
    expect(segmentAtRatio(segments, 1, 100)).toBeNull();
    expect(segmentAtRatio(segments, 0.5, 0)).toBeNull();
    expect(segmentAtRatio(segments, Number.NaN, 100)).toBeNull();
  });

  it('clamps positions outside the track', () => {
    expect(segmentAtRatio(segments, -0.3, 100)?.type).toBe('intro');
  });
});
