import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSettings, SETTINGS_DEFAULTS, SETTINGS_VERSION } from '../src/schema.js';
import {
  createLocalStorage,
  createSettingsStore,
  DEFAULT_STORAGE_KEY,
  getSettingsStore,
  type SettingsStorage,
} from '../src/store.js';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: SettingsStorage & { data: Map<string, string> } = {
    data,
    getItem: (name) => data.get(name) ?? null,
    setItem: (name, value) => void data.set(name, value),
    removeItem: (name) => void data.delete(name),
  };
  return storage;
}

const throwing: SettingsStorage = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
  removeItem() {
    throw new Error('blocked');
  },
};

const stored = (values: Record<string, unknown>, v: unknown = SETTINGS_VERSION) => JSON.stringify({ v, values });

describe('settings store', () => {
  afterEach(() => vi.restoreAllMocks());

  it('round trips through the storage', () => {
    const storage = fakeStorage();
    const a = createSettingsStore({ storage });
    expect(a.key).toBe(DEFAULT_STORAGE_KEY);
    expect(a.values).toEqual({});
    a.set({ 'captions.scale': 1.2, 'player.seekStep': 15 });
    expect(JSON.parse(storage.data.get(DEFAULT_STORAGE_KEY)!)).toEqual({
      v: 1,
      values: { 'captions.scale': 1.2, 'player.seekStep': 15 },
    });
    const b = createSettingsStore({ storage });
    expect(b.values).toEqual({ 'captions.scale': 1.2, 'player.seekStep': 15 });
    expect(b.has('captions.scale')).toBe(true);
    expect(b.has('captions.color')).toBe(false);
  });

  it('uses its own storage key', () => {
    const storage = fakeStorage();
    createSettingsStore({ key: 'other', storage }).set({ 'captions.bold': true });
    expect(storage.data.has('other')).toBe(true);
    expect(createSettingsStore({ storage }).values).toEqual({});
  });

  it.each([
    ['corrupt JSON', '{not json'],
    ['a wrong version', stored({ 'captions.scale': 1.5 }, 2)],
    ['a missing version', JSON.stringify({ values: { 'captions.scale': 1.5 } })],
    ['a non-object', '42'],
    ['an array', '[1,2]'],
    ['non-object values', JSON.stringify({ v: 1, values: 'x' })],
  ])('treats %s as empty without logging', (_name, raw) => {
    const error = vi.spyOn(console, 'error');
    const warn = vi.spyOn(console, 'warn');
    const store = createSettingsStore({ storage: fakeStorage({ [DEFAULT_STORAGE_KEY]: raw }) });
    expect(store.values).toEqual({});
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('drops unknown keys and invalid values', () => {
    const raw = stored({ 'captions.scale': 9, 'captions.color': 'pink', nope: 1, 'player.numberKeys': false });
    const store = createSettingsStore({ storage: fakeStorage({ [DEFAULT_STORAGE_KEY]: raw }) });
    expect(store.values).toEqual({ 'captions.scale': 2, 'player.numberKeys': false });
    expect(store.set({ 'captions.color': 'pink' } as never)).toEqual([]);
  });

  it('never throws with a failing storage and keeps the session in memory', () => {
    let store!: ReturnType<typeof createSettingsStore>;
    expect(() => {
      store = createSettingsStore({ storage: throwing });
    }).not.toThrow();
    expect(store.values).toEqual({});
    expect(() => store.set({ 'display.filter': 'warm' })).not.toThrow();
    expect(store.values).toEqual({ 'display.filter': 'warm' });
    expect(store.reload()).toEqual([]);
    expect(store.values).toEqual({ 'display.filter': 'warm' });
    expect(store.reset()).toEqual(['display.filter']);
    expect(store.values).toEqual({});
  });

  it('works without a storage', () => {
    const store = createSettingsStore({ storage: null });
    store.set({ 'captions.shadow': true });
    expect(store.values).toEqual({ 'captions.shadow': true });
    expect(store.reload()).toEqual([]);
  });

  it('returns and notifies only the keys that changed', () => {
    const store = createSettingsStore({ storage: fakeStorage() });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    expect(store.set({ 'captions.scale': 1.5, 'captions.bold': true })).toEqual(['captions.scale', 'captions.bold']);
    expect(listener).toHaveBeenLastCalledWith(['captions.scale', 'captions.bold']);
    expect(store.set({ 'captions.scale': 1.5, 'captions.bold': false })).toEqual(['captions.bold']);
    expect(listener).toHaveBeenLastCalledWith(['captions.bold']);
    expect(store.set({ 'captions.scale': 1.5 })).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    store.set({ 'captions.scale': 1 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stores a choice equal to the default as a choice', () => {
    const store = createSettingsStore({ storage: fakeStorage() });
    expect(store.set({ 'player.seekStep': SETTINGS_DEFAULTS['player.seekStep'] })).toEqual(['player.seekStep']);
    expect(store.has('player.seekStep')).toBe(true);
  });

  it('resets by page, by list and all', () => {
    const storage = fakeStorage();
    const store = createSettingsStore({ storage });
    store.set({ 'captions.scale': 1.5, 'captions.bold': true, 'player.seekStep': 20, 'display.filter': 'cool' });
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.reset('captions')).toEqual(['captions.scale', 'captions.bold']);
    expect(listener).toHaveBeenLastCalledWith(['captions.scale', 'captions.bold']);
    expect(store.values).toEqual({ 'player.seekStep': 20, 'display.filter': 'cool' });
    expect(store.reset(['display.filter', 'captions.color'])).toEqual(['display.filter']);
    expect(store.reset('captions')).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.reset()).toEqual(['player.seekStep']);
    expect(store.values).toEqual({});
    expect(storage.data.has(DEFAULT_STORAGE_KEY)).toBe(false);
  });

  it('reload picks up writes from another tab', () => {
    const storage = fakeStorage();
    const store = createSettingsStore({ storage });
    store.set({ 'captions.scale': 1.5 });
    const listener = vi.fn();
    store.subscribe(listener);
    storage.data.set(DEFAULT_STORAGE_KEY, stored({ 'captions.scale': 1.5, 'player.autoAdvance': false }));
    expect(store.reload()).toEqual(['player.autoAdvance']);
    expect(listener).toHaveBeenCalledWith(['player.autoAdvance']);
    storage.data.delete(DEFAULT_STORAGE_KEY);
    expect(store.reload()).toEqual(['captions.scale', 'player.autoAdvance']);
    expect(store.values).toEqual({});
    expect(store.reload()).toEqual([]);
  });

  it('reloads on a storage event for its key and stops after destroy', () => {
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    const storage = fakeStorage();
    const store = createSettingsStore({ storage });
    const listener = vi.fn();
    store.subscribe(listener);
    const fire = (key: string | null) => target.dispatchEvent(Object.assign(new Event('storage'), { key }));

    storage.data.set(DEFAULT_STORAGE_KEY, stored({ 'captions.bold': true }));
    fire('unrelated');
    expect(listener).not.toHaveBeenCalled();
    fire(DEFAULT_STORAGE_KEY);
    expect(listener).toHaveBeenCalledWith(['captions.bold']);
    expect(store.values).toEqual({ 'captions.bold': true });

    storage.data.clear();
    fire(null);
    expect(store.values).toEqual({});

    store.destroy();
    storage.data.set(DEFAULT_STORAGE_KEY, stored({ 'captions.bold': true }));
    fire(DEFAULT_STORAGE_KEY);
    expect(store.values).toEqual({});
    vi.unstubAllGlobals();
  });

  it('keeps notifying the other listeners when one throws', () => {
    const store = createSettingsStore({ storage: null });
    const report = vi.fn();
    vi.stubGlobal('reportError', report);
    const second = vi.fn();
    store.subscribe(() => {
      throw new Error('boom');
    });
    store.subscribe(second);
    store.set({ 'captions.bold': true });
    expect(second).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('getSettingsStore shares one instance per key', () => {
    const a = getSettingsStore();
    expect(getSettingsStore()).toBe(a);
    expect(getSettingsStore(DEFAULT_STORAGE_KEY)).toBe(a);
    const b = getSettingsStore('site-b');
    expect(b).not.toBe(a);
    expect(getSettingsStore('site-b')).toBe(b);
    b.destroy();
    expect(getSettingsStore('site-b')).not.toBe(b);
  });

  it('createLocalStorage is null in Node', () => {
    expect(createLocalStorage()).toBeNull();
  });

  it('resolves user over site over default', () => {
    const store = createSettingsStore({ storage: null });
    store.set({ 'player.seekStep': 20 });
    const site = { 'player.seekStep': 10, 'player.autoAdvance': false };
    const resolved = resolveSettings(store.values, site);
    expect(resolved['player.seekStep']).toBe(20);
    expect(resolved['player.autoAdvance']).toBe(false);
    expect(resolved['captions.scale']).toBe(SETTINGS_DEFAULTS['captions.scale']);
    expect(resolveSettings({}, {})).toEqual(SETTINGS_DEFAULTS);
  });
});
