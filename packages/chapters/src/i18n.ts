import { createTranslator, getI18nTranslations, registerI18n, type Translator } from '@videojs/html/i18n';

/** Translation keys used by the chapter panel, in the Video.js i18n registry. */
export const CHAPTERS_KEYS = {
  heading: 'caramel.chapters.heading',
  empty: 'caramel.chapters.empty',
} as const;

/** English defaults, used when no translation is registered. */
export const CHAPTERS_DEFAULTS = {
  heading: 'Chapters',
  empty: 'No chapters',
} as const;

const TR = {
  heading: 'Bölümler',
  empty: 'Bölüm yok',
} as const;

let registered = false;

/**
 * Registers the Turkish and English strings for the chapter panel in the
 * shared Video.js i18n registry. Idempotent. The `caramel` namespace is ours, so
 * the call is cast past the typed built-in phrase catalog.
 */
export function registerChaptersI18n(): void {
  if (registered) return;
  registered = true;
  const register = registerI18n as unknown as (locale: string, translations: Record<string, unknown>) => void;
  register('tr', { caramel: { chapters: TR } });
  register('en', { caramel: { chapters: CHAPTERS_DEFAULTS } });
}

/**
 * Builds a translator for a BCP 47 tag from the current registry. Panels sit
 * outside `<media-i18n>`, so they cannot use `I18nController` and resolve the
 * language themselves. `getI18nTranslations` walks `tr-TR -> tr -> en`.
 */
export function createChaptersTranslator(lang: string): Translator {
  registerChaptersI18n();
  const locale = lang || 'en';
  return createTranslator(getI18nTranslations(locale), locale);
}
