import { describe, expect, it } from 'vitest';
import { cuesEqual, findActiveIndex, formatTime, nextIndex, type ChapterCue } from '../src/chapters.js';

const CUES: ChapterCue[] = [
  { startTime: 0, endTime: 30, text: 'Intro' },
  { startTime: 30, endTime: 95, text: 'Setup' },
  { startTime: 95, endTime: 3700, text: 'Main' },
];

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(599.9)).toBe('9:59');
    expect(formatTime(3599)).toBe('59:59');
  });

  it('switches to H:MM:SS from one hour on', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(36000 + 125)).toBe('10:02:05');
  });

  it('renders invalid input as 0:00', () => {
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('findActiveIndex', () => {
  it('finds the cue containing the time, start inclusive and end exclusive', () => {
    expect(findActiveIndex(CUES, 0)).toBe(0);
    expect(findActiveIndex(CUES, 29.99)).toBe(0);
    expect(findActiveIndex(CUES, 30)).toBe(1);
    expect(findActiveIndex(CUES, 100)).toBe(2);
  });

  it('returns -1 outside every cue and for an empty list', () => {
    expect(findActiveIndex(CUES, 3700)).toBe(-1);
    expect(findActiveIndex(CUES, -1)).toBe(-1);
    expect(findActiveIndex([], 10)).toBe(-1);
    expect(findActiveIndex(CUES, NaN)).toBe(-1);
  });

  it('treats a cue with an unusable end as open ended', () => {
    const cues: ChapterCue[] = [{ startTime: 10, endTime: 10, text: 'Open' }];
    expect(findActiveIndex(cues, 9)).toBe(-1);
    expect(findActiveIndex(cues, 10)).toBe(0);
    expect(findActiveIndex(cues, 99999)).toBe(0);
    expect(findActiveIndex([{ startTime: 0, endTime: Infinity, text: 'x' }], 5)).toBe(0);
  });

  it('prefers the first of overlapping cues', () => {
    const cues: ChapterCue[] = [
      { startTime: 0, endTime: 50, text: 'A' },
      { startTime: 20, endTime: 60, text: 'B' },
    ];
    expect(findActiveIndex(cues, 30)).toBe(0);
    expect(findActiveIndex(cues, 55)).toBe(1);
  });
});

describe('nextIndex', () => {
  it('moves and wraps in both directions', () => {
    expect(nextIndex(0, 1, 3)).toBe(1);
    expect(nextIndex(2, 1, 3)).toBe(0);
    expect(nextIndex(0, -1, 3)).toBe(2);
    expect(nextIndex(1, -1, 3)).toBe(0);
    expect(nextIndex(1, 5, 3)).toBe(0);
  });

  it('starts from an edge when nothing is focused yet', () => {
    expect(nextIndex(-1, 1, 3)).toBe(0);
    expect(nextIndex(-1, -1, 3)).toBe(2);
    expect(nextIndex(10, 1, 3)).toBe(0);
  });

  it('returns -1 for an empty list', () => {
    expect(nextIndex(0, 1, 0)).toBe(-1);
    expect(nextIndex(-1, -1, 0)).toBe(-1);
  });
});

describe('cuesEqual', () => {
  it('is true for the same reference and for equal contents', () => {
    expect(cuesEqual(CUES, CUES)).toBe(true);
    expect(
      cuesEqual(
        CUES,
        CUES.map((c) => ({ ...c })),
      ),
    ).toBe(true);
    expect(cuesEqual([], [])).toBe(true);
  });

  it('is false when length or any field differs', () => {
    expect(cuesEqual(CUES, CUES.slice(0, 2))).toBe(false);
    expect(cuesEqual(CUES, [CUES[0]!, { ...CUES[1]!, text: 'Other' }, CUES[2]!])).toBe(false);
    expect(cuesEqual(CUES, [CUES[0]!, { ...CUES[1]!, endTime: 96 }, CUES[2]!])).toBe(false);
    expect(cuesEqual(CUES, [CUES[0]!, { ...CUES[1]!, startTime: 31 }, CUES[2]!])).toBe(false);
  });
});
