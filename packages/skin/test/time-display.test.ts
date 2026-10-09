import { describe, expect, it } from 'vitest';
import { readTimeDisplayMode, writeTimeDisplayMode, TIME_DISPLAY_STORAGE_KEY } from '../src/time-display.js';

describe('time display preference', () => {
  it('defaults to elapsed and accepts only remaining', () => {
    expect(readTimeDisplayMode(null)).toBe('elapsed');
    expect(readTimeDisplayMode({ getItem: () => 'remaining' })).toBe('remaining');
    expect(readTimeDisplayMode({ getItem: () => 'bogus' })).toBe('elapsed');
  });

  it('survives a throwing storage', () => {
    const bad = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(readTimeDisplayMode(bad)).toBe('elapsed');
    expect(() => writeTimeDisplayMode(bad, 'remaining')).not.toThrow();
  });

  it('writes under the documented key', () => {
    const calls: string[] = [];
    writeTimeDisplayMode({ setItem: (k, v) => calls.push(`${k}=${v}`) }, 'remaining');
    expect(calls).toEqual([`${TIME_DISPLAY_STORAGE_KEY}=remaining`]);
  });
});
