import { describe, expect, it } from 'vitest';
import { isTrackClick, trackPercent } from '../src/seek-motion.js';

describe('isTrackClick', () => {
  it('animates only a primary mouse click without a drag', () => {
    expect(isTrackClick({ pointerType: 'mouse', button: 0, dragging: false })).toBe(true);
  });

  it('jumps for drags, touch, pen and other buttons', () => {
    expect(isTrackClick({ pointerType: 'mouse', button: 0, dragging: true })).toBe(false);
    expect(isTrackClick({ pointerType: 'touch', button: 0, dragging: false })).toBe(false);
    expect(isTrackClick({ pointerType: 'pen', button: 0, dragging: false })).toBe(false);
    expect(isTrackClick({ pointerType: 'mouse', button: 2, dragging: false })).toBe(false);
  });
});

describe('trackPercent', () => {
  it('maps the pointer to the track', () => {
    expect(trackPercent(150, 100, 200)).toBe(25);
    expect(trackPercent(100, 100, 200)).toBe(0);
    expect(trackPercent(300, 100, 200)).toBe(100);
  });

  it('clamps outside the track and rejects an empty track', () => {
    expect(trackPercent(40, 100, 200)).toBe(0);
    expect(trackPercent(900, 100, 200)).toBe(100);
    expect(trackPercent(150, 100, 0)).toBeNull();
  });
});
