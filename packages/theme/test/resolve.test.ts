import { describe, expect, it } from 'vitest';
import { resolveTheme } from '../src/resolve.js';

describe('resolveTheme', () => {
  it('falls back to the OS preference', () => {
    expect(resolveTheme({ prefersDark: true })).toBe('dark');
    expect(resolveTheme({ prefersDark: false })).toBe('light');
    expect(resolveTheme({})).toBe('light');
  });

  it('lets the root class beat the OS preference', () => {
    expect(resolveTheme({ rootClassList: ['dark'], prefersDark: false })).toBe('dark');
    expect(resolveTheme({ rootClassList: ['light'], prefersDark: true })).toBe('light');
  });

  it('lets root data-theme beat the root class', () => {
    expect(resolveTheme({ rootDataTheme: 'light', rootClassList: ['dark'] })).toBe('light');
  });

  it('lets a local data-theme beat everything', () => {
    expect(
      resolveTheme({
        dataTheme: 'dark',
        rootDataTheme: 'light',
        rootClassList: ['light'],
        prefersDark: false,
      }),
    ).toBe('dark');
  });

  it('ignores unknown values', () => {
    expect(resolveTheme({ dataTheme: 'sepia', rootDataTheme: 'auto', prefersDark: true })).toBe('dark');
  });
});
