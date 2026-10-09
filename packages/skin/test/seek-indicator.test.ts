import { describe, expect, it } from 'vitest';
import { formatSeekLabel } from '../src/seek-indicator.js';

describe('formatSeekLabel', () => {
  it('signs the amount by direction', () => {
    expect(formatSeekLabel(5, 'forward', 'sn', 'tr')).toBe('+5 sn');
    expect(formatSeekLabel(5, 'backward', 'sn', 'tr')).toBe('-5 sn');
    expect(formatSeekLabel(15, 'forward', 's', 'en')).toBe('+15 s');
  });

  it('keeps one decimal for fractional steps', () => {
    expect(formatSeekLabel(2.5, 'forward', 's', 'en')).toBe('+2.5 s');
    expect(formatSeekLabel(2.5, 'forward', 'sn', 'tr')).toBe('+2,5 sn');
  });

  it('shows nothing without a direction or amount', () => {
    expect(formatSeekLabel(0, 'forward', 's')).toBeNull();
    expect(formatSeekLabel(5, null, 's')).toBeNull();
    expect(formatSeekLabel(Number.NaN, 'backward', 's')).toBeNull();
  });
});
