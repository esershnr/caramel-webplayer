import { describe, expect, it } from 'vitest';
import { previousAction, RESTART_AFTER_SECONDS } from '../src/nav.js';

describe('previousAction', () => {
  it('goes to the previous item early in playback', () => {
    expect(previousAction(0, true)).toBe('previous');
    expect(previousAction(RESTART_AFTER_SECONDS, true)).toBe('previous');
  });

  it('restarts after the threshold or when nothing comes before', () => {
    expect(previousAction(RESTART_AFTER_SECONDS + 0.1, true)).toBe('restart');
    expect(previousAction(1, false)).toBe('restart');
  });
});
