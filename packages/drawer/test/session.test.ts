import { describe, expect, it } from 'vitest';
import { LAST_TAB_KEY, readLastTab, writeLastTab } from '../src/session.js';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (name: string) => data.get(name) ?? null,
    setItem: (name: string, value: string) => void data.set(name, value),
    data,
  };
}

const blocked = {
  getItem(): string | null {
    throw new Error('blocked');
  },
  setItem(): void {
    throw new Error('blocked');
  },
};

describe('last tab in the session', () => {
  it('round trips through the storage', () => {
    const storage = fakeStorage();
    expect(readLastTab(storage)).toBeNull();
    writeLastTab('playlist', storage);
    expect(storage.data.get(LAST_TAB_KEY)).toBe('playlist');
    expect(readLastTab(storage)).toBe('playlist');
    writeLastTab('chapters', storage);
    expect(readLastTab(storage)).toBe('chapters');
  });

  it('falls back to memory when the storage throws', () => {
    expect(() => writeLastTab('playlist', blocked)).not.toThrow();
    expect(readLastTab(blocked)).toBe('playlist');
    writeLastTab('chapters', blocked);
    expect(readLastTab(blocked)).toBe('chapters');
  });

  it('falls back to memory without a storage', () => {
    writeLastTab('playlist', null);
    expect(readLastTab(null)).toBe('playlist');
  });

  it('ignores invalid stored values', () => {
    expect(readLastTab(fakeStorage({ [LAST_TAB_KEY]: 'settings' }))).toBeNull();
    expect(readLastTab(fakeStorage({ [LAST_TAB_KEY]: '' }))).toBeNull();
  });

  it('works in Node without sessionStorage', () => {
    expect(() => writeLastTab('chapters')).not.toThrow();
    expect(readLastTab()).toBe('chapters');
  });
});
