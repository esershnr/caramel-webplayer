/**
 * Resume position persistence, DOM free. The element injects a storage and
 * decides when to call these; the rules about what is worth saving live here.
 */

/** Minimal string storage, so tests do not need `localStorage`. */
export interface ResumeStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface ResumeEntry {
  /** Position in seconds. */
  t: number;
  /** Duration in seconds at save time. */
  d: number;
  /** Save timestamp (epoch ms). */
  at: number;
}

/** Minimum gap between two saves while playing (ms). */
export const RESUME_SAVE_INTERVAL = 5000;
/** Positions below this are not saved (seconds). */
export const RESUME_MIN_TIME = 3;
/** Positions closer than this to the end are not saved or restored (seconds). */
export const RESUME_END_MARGIN = 5;

export const DEFAULT_LIST_ID = 'default';

export function resumeKey(listId: string | null | undefined, itemId: string): string {
  return `caramel-playlist:${listId || DEFAULT_LIST_ID}:${itemId}`;
}

/** Throttle check: save when nothing was saved yet or the interval has passed. */
export function shouldSave(lastSavedAt: number | null, now: number, interval = RESUME_SAVE_INTERVAL): boolean {
  if (lastSavedAt === null) return true;
  return now - lastSavedAt >= interval;
}

/** Whether a position is worth saving: finite, past the start, before the tail. */
export function canSave(t: number, d: number): boolean {
  if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0) return false;
  return t >= RESUME_MIN_TIME && t <= d - RESUME_END_MARGIN;
}

/** Position to restore from an entry, or null. `duration` overrides the stored one when known. */
export function restoreTime(entry: ResumeEntry | null | undefined, duration?: number): number | null {
  if (!entry || !Number.isFinite(entry.t) || entry.t <= 0) return null;
  const d = duration !== undefined && Number.isFinite(duration) && duration > 0 ? duration : entry.d;
  if (!Number.isFinite(d) || d <= 0) return null;
  return entry.t < d - RESUME_END_MARGIN ? entry.t : null;
}

export function readResume(storage: ResumeStorage | null, key: string): ResumeEntry | null {
  if (!storage) return null;
  try {
    const raw = storage.get(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const { t, d, at } = value as Record<string, unknown>;
    if (typeof t !== 'number' || typeof d !== 'number') return null;
    return { t, d, at: typeof at === 'number' ? at : 0 };
  } catch {
    return null;
  }
}

/** Saves when the rules allow it. Returns true when an entry was written. */
export function saveResume(
  storage: ResumeStorage | null,
  key: string,
  t: number,
  d: number,
  now = Date.now(),
): boolean {
  if (!storage || !canSave(t, d)) return false;
  try {
    storage.set(key, JSON.stringify({ t, d, at: now } satisfies ResumeEntry));
    return true;
  } catch {
    return false;
  }
}

export function clearResume(storage: ResumeStorage | null, key: string): void {
  if (!storage) return;
  try {
    storage.remove(key);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

/**
 * `localStorage` behind the storage interface, or null when it is unavailable
 * (SSR, private modes, blocked site data). Every call is guarded.
 */
export function createLocalStorage(): ResumeStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__esp-playlist-probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch {
    return null;
  }
  return {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Quota or privacy mode; skip persistence.
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Nothing to do.
      }
    },
  };
}
