import { createTranslator, getI18nTranslations, registerI18n, type Translator } from '@videojs/html/i18n';

/** Translation keys used by the playlist panel, in the Video.js i18n registry. */
export const PLAYLIST_KEYS = {
  heading: 'esp.playlist.heading',
  previous: 'esp.playlist.previous',
  next: 'esp.playlist.next',
  empty: 'esp.playlist.empty',
} as const;

/** English defaults, used when no translation is registered. */
export const PLAYLIST_DEFAULTS = {
  heading: 'Playlist',
  previous: 'Previous',
  next: 'Next',
  empty: 'No videos',
} as const;

const TR = {
  heading: 'Oynatma listesi',
  previous: 'Önceki',
  next: 'Sonraki',
  empty: 'Video yok',
} as const;

let registered = false;

/**
 * Registers the Turkish and English strings for the playlist panel in the
 * shared Video.js i18n registry. Idempotent. The `esp` namespace is ours, so
 * the call is cast past the typed built-in phrase catalog.
 */
export function registerPlaylistI18n(): void {
  if (registered) return;
  registered = true;
  const register = registerI18n as unknown as (locale: string, translations: Record<string, unknown>) => void;
  register('tr', { esp: { playlist: TR } });
  register('en', { esp: { playlist: PLAYLIST_DEFAULTS } });
}

/**
 * Builds a translator for a BCP 47 tag from the current registry. The panel
 * sits outside `<media-i18n>`, so it cannot use `I18nController` and resolves
 * the language itself. `getI18nTranslations` walks `tr-TR -> tr -> en`.
 */
export function createPlaylistTranslator(lang: string): Translator {
  registerPlaylistI18n();
  const locale = lang || 'en';
  return createTranslator(getI18nTranslations(locale), locale);
}
