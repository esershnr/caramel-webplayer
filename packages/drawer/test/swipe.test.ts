import { describe, expect, it } from 'vitest';
import { SWIPE_MIN_DISTANCE, SWIPE_SLOP, swipeDecision } from '../src/swipe.js';

describe('swipeDecision', () => {
  it('accepts a slow drag past the distance threshold', () => {
    // width 100: threshold is max(48, 25) = 48
    expect(swipeDecision({ dx: -48, dy: 0, dt: 2000, width: 100 })).toBe('left');
    expect(swipeDecision({ dx: -47, dy: 0, dt: 2000, width: 100 })).toBeNull();
  });

  it('scales the distance threshold with the width', () => {
    // width 800: threshold is max(48, 200) = 200
    expect(swipeDecision({ dx: 150, dy: 0, dt: 2000, width: 800 })).toBeNull();
    expect(swipeDecision({ dx: 200, dy: 0, dt: 2000, width: 800 })).toBe('right');
  });

  it('accepts a short fast flick', () => {
    // 30 px in 40 ms = 0.75 px/ms
    expect(swipeDecision({ dx: 30, dy: 2, dt: 40, width: 800 })).toBe('right');
    // 30 px in 100 ms = 0.3 px/ms: too slow and too short
    expect(swipeDecision({ dx: 30, dy: 2, dt: 100, width: 800 })).toBeNull();
  });

  it('rejects mostly vertical drags', () => {
    expect(swipeDecision({ dx: 100, dy: 120, dt: 100, width: 300 })).toBeNull();
    expect(swipeDecision({ dx: 50, dy: 50, dt: 20, width: 100 })).toBeNull();
  });

  it('ignores flicks inside the slop', () => {
    expect(swipeDecision({ dx: SWIPE_SLOP - 1, dy: 0, dt: 1, width: 300 })).toBeNull();
    expect(swipeDecision({ dx: SWIPE_SLOP, dy: 0, dt: 1, width: 300 })).toBe('right');
  });

  it('reports the direction from the sign of dx', () => {
    expect(swipeDecision({ dx: -SWIPE_MIN_DISTANCE, dy: 0, dt: 1000, width: 0 })).toBe('left');
    expect(swipeDecision({ dx: SWIPE_MIN_DISTANCE, dy: 0, dt: 1000, width: 0 })).toBe('right');
  });

  it('honours custom options', () => {
    expect(swipeDecision({ dx: 20, dy: 0, dt: 1000, width: 0 }, { minDistance: 20 })).toBe('right');
    expect(swipeDecision({ dx: 20, dy: 0, dt: 40, width: 800 }, { slop: 24 })).toBeNull();
    expect(swipeDecision({ dx: 30, dy: 0, dt: 100, width: 800 }, { minVelocity: 0.2 })).toBe('right');
  });
});
