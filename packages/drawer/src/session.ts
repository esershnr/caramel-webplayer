import { isDrawerTab, type DrawerTab } from './tabs.js';

/** sessionStorage key of the last tab the user picked. */
export const LAST_TAB_KEY = 'caramel-drawer-tab';

type TabStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Fallback when sessionStorage is missing or throws (private mode, sandboxed frames). */
let memory: DrawerTab | null = null;

function sessionStore(): TabStorage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    // Accessing the property itself can throw when storage is blocked.
    return null;
  }
}

/**
 * The last tab the user picked in this browsing session, or null. Reads
 * sessionStorage (shared by every drawer on the page); when it is unavailable
 * or throws, the in-memory value from `writeLastTab` is used instead.
 */
export function readLastTab(storage: TabStorage | null = sessionStore()): DrawerTab | null {
  if (!storage) return memory;
  try {
    const value = storage.getItem(LAST_TAB_KEY);
    return isDrawerTab(value) ? value : null;
  } catch {
    return memory;
  }
}

/** Remembers a user pick for the rest of the session. Never throws. */
export function writeLastTab(tab: DrawerTab, storage: TabStorage | null = sessionStore()): void {
  if (!isDrawerTab(tab)) return;
  memory = tab;
  if (!storage) return;
  try {
    storage.setItem(LAST_TAB_KEY, tab);
  } catch {
    // Quota or blocked storage: the in-memory value still serves this page.
  }
}
