import { registerI18n } from '@videojs/html/i18n';
import type { SegmentType } from './segments.js';

/** Translation keys used by the skip button, in the Video.js i18n registry. */
export const SKIP_KEYS: Record<SegmentType, string> = {
  intro: 'esp.skip.intro',
  recap: 'esp.skip.recap',
  outro: 'esp.skip.outro',
  sponsor: 'esp.skip.sponsor',
};

/** English defaults, used when no translation is registered. */
export const SKIP_DEFAULTS: Record<SegmentType, string> = {
  intro: 'Skip intro',
  recap: 'Skip recap',
  outro: 'Skip outro',
  sponsor: 'Skip sponsor',
};

const TR: Record<SegmentType, string> = {
  intro: 'İntroyu atla',
  recap: 'Özeti atla',
  outro: 'Jeneriği atla',
  sponsor: 'Sponsoru atla',
};

/** Keys for the short type name shown in the timeline preview card. */
export const SEGMENT_KEYS: Record<SegmentType, string> = {
  intro: 'esp.segment.intro',
  recap: 'esp.segment.recap',
  outro: 'esp.segment.outro',
  sponsor: 'esp.segment.sponsor',
};

export const SEGMENT_DEFAULTS: Record<SegmentType, string> = {
  intro: 'Intro',
  recap: 'Recap',
  outro: 'Outro',
  sponsor: 'Sponsor',
};

const SEGMENT_TR: Record<SegmentType, string> = {
  intro: 'İntro',
  recap: 'Özet',
  outro: 'Jenerik',
  sponsor: 'Sponsor',
};

let registered = false;

/**
 * Registers the Turkish and English strings for the skip button in the shared
 * Video.js i18n registry. Idempotent. The `esp` namespace is ours, so the call
 * is cast past the typed built-in phrase catalog.
 */
export function registerSkipSegmentsI18n(): void {
  if (registered) return;
  registered = true;
  const register = registerI18n as unknown as (locale: string, translations: Record<string, unknown>) => void;
  register('tr', { esp: { skip: TR, segment: SEGMENT_TR } });
  register('en', { esp: { skip: SKIP_DEFAULTS, segment: SEGMENT_DEFAULTS } });
}
