/**
 * Persistence of the user's choices. DOM free apart from the optional
 * `storage` event listener, which keeps several tabs in step.
 *
 * The store only holds what the user picked (sparse values). Site defaults and
 * schema defaults are applied on top with `resolveSettings`, so a key the user
 * never touched keeps following the site.
 */
import {
  isSettingsKey,
  keysOfPage,
  normalizeValues,
  SETTINGS_VERSION,
  type SettingsKey,
  type SettingsPage,
  type SettingsValues,
} from './schema.js';

/** Minimal string storage, so tests do not need `localStorage`. */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_STORAGE_KEY = 'caramel-settings';

export interface SettingsStore {
  readonly key: string;
  /** Values the user chose, nothing else (sparse). */
  readonly values: Readonly<Partial<SettingsValues>>;
  has(key: SettingsKey): boolean;
  /** Normalizes, stores, persists; returns the keys whose stored value changed. */
  set(partial: Partial<SettingsValues>): SettingsKey[];
  /** Removes stored keys (all, a page, or a list); returns the keys removed. */
  reset(target?: SettingsPage | readonly SettingsKey[]): SettingsKey[];
  subscribe(listener: (keys: SettingsKey[]) => void): () => void;
  /** Re-reads storage (other tab wrote); notifies changed keys. */
  reload(): SettingsKey[];
  destroy(): void;
}

export interface SettingsStoreOptions {
  /** Storage key, `caramel-settings` by default. */
  key?: string;
  /** `undefined` probes `localStorage`; `null` keeps the values in memory only. */
  storage?: SettingsStorage | null;
}

type Values = Partial<SettingsValues>;

/** Parses the persisted JSON. Anything unexpected reads as empty. */
export function parseStoredSettings(raw: string | null): Values {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const { v, values } = data as Record<string, unknown>;
  if (v !== SETTINGS_VERSION || !values || typeof values !== 'object' || Array.isArray(values)) return {};
  return normalizeValues(values);
}

export function serializeSettings(values: Values): string {
  return JSON.stringify({ v: SETTINGS_VERSION, values });
}

/** Keys whose presence or value differs between two sparse value sets. */
function diffKeys(before: Values, after: Values): SettingsKey[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: SettingsKey[] = [];
  for (const key of keys) {
    if (!isSettingsKey(key)) continue;
    if (Object.hasOwn(before, key) !== Object.hasOwn(after, key) || before[key] !== after[key]) out.push(key);
  }
  return out;
}

export function createSettingsStore(options: SettingsStoreOptions = {}): SettingsStore {
  const key = options.key || DEFAULT_STORAGE_KEY;
  const storage = options.storage === undefined ? createLocalStorage() : options.storage;
  const listeners = new Set<(keys: SettingsKey[]) => void>();
  const abort = typeof AbortController === 'undefined' ? null : new AbortController();

  /** Stored values, or null when the storage could not be read. */
  function read(): Values | null {
    if (!storage) return null;
    try {
      return parseStoredSettings(storage.getItem(key));
    } catch {
      return null;
    }
  }

  function persist(): void {
    if (!storage) return;
    try {
      if (Object.keys(values).length === 0) storage.removeItem(key);
      else storage.setItem(key, serializeSettings(values));
    } catch {
      // Quota or blocked storage: the in-memory values still serve this page.
    }
  }

  function notify(keys: SettingsKey[]): void {
    if (!keys.length) return;
    for (const listener of [...listeners]) {
      try {
        listener(keys);
      } catch (error) {
        // One failing player must not keep the others from updating.
        if (typeof reportError === 'function') reportError(error);
      }
    }
  }

  function commit(next: Values): SettingsKey[] {
    const keys = diffKeys(values, next);
    if (!keys.length) return keys;
    values = Object.freeze(next);
    return keys;
  }

  let values: Readonly<Values> = Object.freeze(read() ?? {});

  const store: SettingsStore = {
    key,
    get values() {
      return values;
    },
    has(name) {
      return Object.hasOwn(values, name);
    },
    set(partial) {
      const keys = commit({ ...values, ...normalizeValues(partial) });
      if (keys.length) {
        persist();
        notify(keys);
      }
      return keys;
    },
    reset(target) {
      const names: readonly SettingsKey[] =
        target === undefined
          ? (Object.keys(values) as SettingsKey[])
          : typeof target === 'string'
            ? keysOfPage(target)
            : target;
      const next: Values = { ...values };
      for (const name of names) delete next[name];
      const keys = commit(next);
      if (keys.length) {
        persist();
        notify(keys);
      }
      return keys;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reload() {
      const stored = read();
      if (!stored) return [];
      const keys = commit(stored);
      notify(keys);
      return keys;
    },
    destroy() {
      abort?.abort();
      listeners.clear();
      if (shared.get(key) === store) shared.delete(key);
    },
  };

  if (storage && abort && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener(
      'storage',
      (event: StorageEvent) => {
        // A null key means the other tab cleared the whole storage.
        if (event.key === key || event.key === null) store.reload();
      },
      { signal: abort.signal },
    );
  }

  return store;
}

const shared = new Map<string, SettingsStore>();

/** One store instance per key, shared by every player on the page. */
export function getSettingsStore(key: string = DEFAULT_STORAGE_KEY): SettingsStore {
  const name = key || DEFAULT_STORAGE_KEY;
  let store = shared.get(name);
  if (!store) {
    store = createSettingsStore({ key: name });
    shared.set(name, store);
  }
  return store;
}

/**
 * `localStorage` behind the storage interface, or null when it is unavailable
 * (SSR, private modes, blocked site data). Every call is guarded.
 */
export function createLocalStorage(): SettingsStorage | null {
  let local: Storage;
  try {
    if (typeof localStorage === 'undefined') return null;
    local = localStorage;
    // A read is enough to know the storage is reachable; a full storage
    // (quota) would fail a write probe and hide the choices already stored.
    local.getItem(DEFAULT_STORAGE_KEY);
  } catch {
    return null;
  }
  return {
    getItem(name) {
      try {
        return local.getItem(name);
      } catch {
        return null;
      }
    },
    setItem(name, value) {
      try {
        local.setItem(name, value);
      } catch {
        // Quota or privacy mode; skip persistence.
      }
    },
    removeItem(name) {
      try {
        local.removeItem(name);
      } catch {
        // Nothing to do.
      }
    },
  };
}
