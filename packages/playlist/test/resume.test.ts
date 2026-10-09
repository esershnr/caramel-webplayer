import { describe, expect, it } from 'vitest';
import {
  RESUME_SAVE_INTERVAL,
  canSave,
  clearResume,
  readResume,
  restoreTime,
  resumeKey,
  saveResume,
  shouldSave,
  type ResumeStorage,
} from '../src/resume.js';

function memoryStorage(): ResumeStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get: (key) => map.get(key) ?? null,
    set: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
}

function brokenStorage(): ResumeStorage {
  return {
    get: () => {
      throw new Error('blocked');
    },
    set: () => {
      throw new Error('blocked');
    },
    remove: () => {
      throw new Error('blocked');
    },
  };
}

describe('resumeKey', () => {
  it('namespaces by list id with a default', () => {
    expect(resumeKey('course', 'ep1')).toBe('caramel-playlist:course:ep1');
    expect(resumeKey(null, 'ep1')).toBe('caramel-playlist:default:ep1');
    expect(resumeKey('', 'ep1')).toBe('caramel-playlist:default:ep1');
  });
});

describe('shouldSave', () => {
  it('saves immediately the first time, then every interval', () => {
    expect(shouldSave(null, 1000)).toBe(true);
    expect(shouldSave(1000, 1000 + RESUME_SAVE_INTERVAL - 1)).toBe(false);
    expect(shouldSave(1000, 1000 + RESUME_SAVE_INTERVAL)).toBe(true);
    expect(shouldSave(1000, 2000, 500)).toBe(true);
  });
});

describe('canSave', () => {
  it('rejects the first seconds and the tail', () => {
    expect(canSave(2.9, 100)).toBe(false);
    expect(canSave(3, 100)).toBe(true);
    expect(canSave(95, 100)).toBe(true);
    expect(canSave(95.1, 100)).toBe(false);
  });

  it('rejects unknown durations and non finite values', () => {
    expect(canSave(10, 0)).toBe(false);
    expect(canSave(10, Number.NaN)).toBe(false);
    expect(canSave(10, Number.POSITIVE_INFINITY)).toBe(false);
    expect(canSave(Number.NaN, 100)).toBe(false);
  });
});

describe('saveResume / readResume', () => {
  it('writes an entry with time, duration and timestamp', () => {
    const storage = memoryStorage();
    expect(saveResume(storage, 'k', 42, 100, 1234)).toBe(true);
    expect(readResume(storage, 'k')).toEqual({ t: 42, d: 100, at: 1234 });
  });

  it('does not write when the rules forbid it', () => {
    const storage = memoryStorage();
    expect(saveResume(storage, 'k', 1, 100)).toBe(false);
    expect(saveResume(storage, 'k', 99, 100)).toBe(false);
    expect(storage.map.size).toBe(0);
  });

  it('tolerates a broken storage and a null storage', () => {
    expect(saveResume(brokenStorage(), 'k', 42, 100)).toBe(false);
    expect(readResume(brokenStorage(), 'k')).toBeNull();
    expect(() => clearResume(brokenStorage(), 'k')).not.toThrow();
    expect(saveResume(null, 'k', 42, 100)).toBe(false);
    expect(readResume(null, 'k')).toBeNull();
  });

  it('ignores malformed entries', () => {
    const storage = memoryStorage();
    storage.set('k', 'not json');
    expect(readResume(storage, 'k')).toBeNull();
    storage.set('k', JSON.stringify({ t: '5', d: 100 }));
    expect(readResume(storage, 'k')).toBeNull();
    storage.set('k', JSON.stringify({ t: 5, d: 100 }));
    expect(readResume(storage, 'k')).toEqual({ t: 5, d: 100, at: 0 });
  });

  it('clears the entry when the video ended', () => {
    const storage = memoryStorage();
    saveResume(storage, 'k', 42, 100);
    clearResume(storage, 'k');
    expect(readResume(storage, 'k')).toBeNull();
  });
});

describe('restoreTime', () => {
  it('restores only finite positions below the tail', () => {
    expect(restoreTime({ t: 42, d: 100, at: 0 })).toBe(42);
    expect(restoreTime({ t: 95, d: 100, at: 0 })).toBeNull();
    expect(restoreTime({ t: 94.9, d: 100, at: 0 })).toBe(94.9);
    expect(restoreTime({ t: Number.NaN, d: 100, at: 0 })).toBeNull();
    expect(restoreTime({ t: 0, d: 100, at: 0 })).toBeNull();
    expect(restoreTime(null)).toBeNull();
    expect(restoreTime(undefined)).toBeNull();
  });

  it('prefers the live duration over the stored one', () => {
    expect(restoreTime({ t: 50, d: 100, at: 0 }, 52)).toBeNull();
    expect(restoreTime({ t: 50, d: 51, at: 0 }, 100)).toBe(50);
    expect(restoreTime({ t: 50, d: 100, at: 0 }, 0)).toBe(50);
    expect(restoreTime({ t: 50, d: 0, at: 0 })).toBeNull();
  });
});
