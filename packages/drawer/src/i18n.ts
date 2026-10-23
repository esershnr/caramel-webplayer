import { registerChaptersI18n } from '@esershnr/caramel-chapters';
import { registerPlaylistI18n } from '@esershnr/caramel-playlist';
import { registerI18n } from '@videojs/html/i18n';

/** Translation keys used by the drawer, in the Video.js i18n registry. */
export const DRAWER_KEYS = {
  open: 'caramel.drawer.open',
  close: 'caramel.drawer.close',
  panel: 'caramel.drawer.panel',
  noChapters: 'caramel.drawer.noChapters',
} as const;

/** English defaults, used when no translation is registered. */
export const DRAWER_DEFAULTS = {
  open: 'Open panel',
  close: 'Close panel',
  panel: 'Chapters and playlist',
  noChapters: 'No chapters in this video',
} as const;

const TR = {
  open: 'Paneli aç',
  close: 'Paneli kapat',
  panel: 'Bölümler ve oynatma listesi',
  noChapters: 'Bu videoda bölüm yok',
} as const;

let registered = false;

/**
 * Registers the Turkish and English strings for the drawer in the shared
 * Video.js i18n registry, together with the chapters and playlist strings the
 * tab labels reuse. Idempotent. The `caramel` namespace is ours, so the call
 * is cast past the typed built-in phrase catalog.
 */
export function registerDrawerI18n(): void {
  registerChaptersI18n();
  registerPlaylistI18n();
  if (registered) return;
  registered = true;
  const register = registerI18n as unknown as (locale: string, translations: Record<string, unknown>) => void;
  register('tr', { caramel: { drawer: TR } });
  register('en', { caramel: { drawer: DRAWER_DEFAULTS } });
}
