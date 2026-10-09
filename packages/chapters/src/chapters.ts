/**
 * DOM free helpers for the chapter panel. The element is a thin adapter over
 * these so they can be unit tested in Node.
 */

/** A chapter cue as exposed by the Video.js store (`chaptersCues`). */
export interface ChapterCue {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Formats seconds as `M:SS` or, from one hour on, `H:MM:SS`. Negative, NaN
 * and infinite inputs render as `0:00`.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * Index of the cue whose range `[startTime, endTime)` contains `time`, or -1.
 * When several cues overlap the first one wins. A cue whose end is not finite
 * or not greater than its start is treated as open ended.
 */
export function findActiveIndex(cues: readonly ChapterCue[], time: number): number {
  if (!Number.isFinite(time)) return -1;
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (!cue) continue;
    const end = Number.isFinite(cue.endTime) && cue.endTime > cue.startTime ? cue.endTime : Infinity;
    if (time >= cue.startTime && time < end) return i;
  }
  return -1;
}

/**
 * Moves `current` by `delta` inside `[0, length)`, wrapping at both ends.
 * A negative `current` (nothing focused yet) starts from the first item for
 * positive deltas and from the last item for negative ones. Returns -1 for an
 * empty list.
 */
export function nextIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  if (current < 0 || current >= length) {
    return delta >= 0 ? 0 : length - 1;
  }
  return (((current + delta) % length) + length) % length;
}

/** Shallow equality of two cue lists so the element can skip a re-render. */
export function cuesEqual(a: readonly ChapterCue[], b: readonly ChapterCue[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (!x || !y) return false;
    if (x.startTime !== y.startTime || x.endTime !== y.endTime || x.text !== y.text) return false;
  }
  return true;
}
