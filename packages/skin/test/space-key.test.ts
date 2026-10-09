import { describe, expect, it } from 'vitest';
import { shouldRedirectSpace, type SpaceTarget } from '../src/space-key.js';

const base: SpaceTarget = { key: ' ', modifiers: false, activatable: true, editable: false, menuItem: false };

describe('shouldRedirectSpace', () => {
  it('takes Space away from buttons and sliders', () => {
    expect(shouldRedirectSpace(base)).toBe(true);
  });

  it('leaves Enter and other keys to the control', () => {
    expect(shouldRedirectSpace({ ...base, key: 'Enter' })).toBe(false);
    expect(shouldRedirectSpace({ ...base, key: 'ArrowRight' })).toBe(false);
  });

  it('keeps Space for text input, menu items and modified presses', () => {
    expect(shouldRedirectSpace({ ...base, editable: true })).toBe(false);
    expect(shouldRedirectSpace({ ...base, menuItem: true })).toBe(false);
    expect(shouldRedirectSpace({ ...base, modifiers: true })).toBe(false);
  });

  it('lets the player hotkey handle non-activatable targets itself', () => {
    expect(shouldRedirectSpace({ ...base, activatable: false })).toBe(false);
  });
});
