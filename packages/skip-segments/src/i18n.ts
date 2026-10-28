import { registerI18n } from '@videojs/html/i18n';
import type { SegmentType } from './segments.js';

/** Translation keys used by the skip button, in the Video.js i18n registry. */
export const SKIP_KEYS: Record<SegmentType, string> = {
  intro: 'caramel.skip.intro',
  recap: 'caramel.skip.recap',
  outro: 'caramel.skip.outro',
  sponsor: 'caramel.skip.sponsor',
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
  intro: 'caramel.segment.intro',
  recap: 'caramel.segment.recap',
  outro: 'caramel.segment.outro',
  sponsor: 'caramel.segment.sponsor',
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

/** Keys for the delayed auto-skip countdown. `announce` takes `{segment}` and `{seconds}`. */
export const AUTOSKIP_KEYS = {
  announce: 'caramel.autoskip.announce',
  announceOne: 'caramel.autoskip.announceOne',
  dismiss: 'caramel.autoskip.dismiss',
} as const;

export const AUTOSKIP_DEFAULTS: Record<keyof typeof AUTOSKIP_KEYS, string> = {
  announce: '{segment} skips in {seconds} seconds',
  announceOne: '{segment} skips in 1 second',
  dismiss: 'Cancel auto-skip',
};

const AUTOSKIP_TR: Record<keyof typeof AUTOSKIP_KEYS, string> = {
  announce: '{segment} {seconds} saniye sonra atlanacak',
  announceOne: '{segment} 1 saniye sonra atlanacak',
  dismiss: 'Otomatik atlamayı iptal et',
};

let registered = false;

/**
 * Registers the Turkish and English strings for the skip button in the shared
 * Video.js i18n registry. Idempotent. The `caramel` namespace is ours, so the call
 * is cast past the typed built-in phrase catalog.
 */
export function registerSkipSegmentsI18n(): void {
  if (registered) return;
  registered = true;
  const register = registerI18n as unknown as (locale: string, translations: Record<string, unknown>) => void;
  register('tr', { caramel: { skip: TR, segment: SEGMENT_TR, autoskip: AUTOSKIP_TR } });
  register('en', { caramel: { skip: SKIP_DEFAULTS, segment: SEGMENT_DEFAULTS, autoskip: AUTOSKIP_DEFAULTS } });
}
