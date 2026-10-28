import { registerI18n } from '@videojs/html/i18n';
import type { CaptionFont } from './captions.js';
import type { AspectRatio, CaptionColor, VideoFilter } from './schema.js';

/**
 * Translation keys of the settings menu, in the Video.js i18n registry. Named
 * `*_I18N` so they do not clash with the schema's `SETTINGS_KEYS` and
 * `SETTINGS_DEFAULTS`.
 */
export const SETTINGS_KEYS_I18N = {
  pageCaptions: 'caramel.settings.page.captions',
  pagePlayer: 'caramel.settings.page.player',
  pageDisplay: 'caramel.settings.page.display',
  size: 'caramel.settings.control.size',
  position: 'caramel.settings.control.position',
  color: 'caramel.settings.control.color',
  background: 'caramel.settings.control.background',
  font: 'caramel.settings.control.font',
  shadow: 'caramel.settings.control.shadow',
  bold: 'caramel.settings.control.bold',
  seekStep: 'caramel.settings.control.seekStep',
  numberKeys: 'caramel.settings.control.numberKeys',
  autoSkipIntro: 'caramel.settings.control.autoSkipIntro',
  autoSkipOutro: 'caramel.settings.control.autoSkipOutro',
  autoSkipDelay: 'caramel.settings.control.autoSkipDelay',
  autoAdvance: 'caramel.settings.control.autoAdvance',
  autoFullscreen: 'caramel.settings.control.autoFullscreen',
  aspect: 'caramel.settings.control.aspect',
  filter: 'caramel.settings.control.filter',
  reset: 'caramel.settings.control.reset',
  default: 'caramel.settings.value.default',
  off: 'caramel.settings.value.off',
  filterVivid: 'caramel.settings.filter.vivid',
  filterWarm: 'caramel.settings.filter.warm',
  filterCool: 'caramel.settings.filter.cool',
  filterBright: 'caramel.settings.filter.bright',
  filterCinema: 'caramel.settings.filter.cinema',
  colorWhite: 'caramel.settings.color.white',
  colorYellow: 'caramel.settings.color.yellow',
  colorCyan: 'caramel.settings.color.cyan',
  colorGreen: 'caramel.settings.color.green',
  colorMagenta: 'caramel.settings.color.magenta',
  colorRed: 'caramel.settings.color.red',
  /** Takes `{value}`, a whole number. */
  percent: 'caramel.settings.format.percent',
  /** Takes `{value}`, a whole number of seconds. */
  seconds: 'caramel.settings.format.seconds',
} as const;

export type SettingsI18nName = keyof typeof SETTINGS_KEYS_I18N;

/** English defaults, used when no translation is registered. */
export const SETTINGS_DEFAULTS_I18N: Readonly<Record<SettingsI18nName, string>> = {
  pageCaptions: 'Caption style',
  pagePlayer: 'Player',
  pageDisplay: 'Display',
  size: 'Size',
  position: 'Position',
  color: 'Color',
  background: 'Background',
  font: 'Font',
  shadow: 'Shadow',
  bold: 'Bold',
  seekStep: 'Seek step',
  numberKeys: 'Number key seeking',
  autoSkipIntro: 'Auto-skip intro',
  autoSkipOutro: 'Auto-skip outro',
  autoSkipDelay: 'Auto-skip delay',
  autoAdvance: 'Autoplay next',
  autoFullscreen: 'Fullscreen on play',
  aspect: 'Aspect ratio',
  filter: 'Video filter',
  reset: 'Reset',
  default: 'Default',
  off: 'Off',
  filterVivid: 'Vivid',
  filterWarm: 'Warm',
  filterCool: 'Cool',
  filterBright: 'Bright',
  filterCinema: 'Cinema',
  colorWhite: 'White',
  colorYellow: 'Yellow',
  colorCyan: 'Cyan',
  colorGreen: 'Green',
  colorMagenta: 'Magenta',
  colorRed: 'Red',
  percent: '{value}%',
  seconds: '{value} s',
};

const TR: Readonly<Record<SettingsI18nName, string>> = {
  pageCaptions: 'Altyazı görünümü',
  pagePlayer: 'Oynatıcı',
  pageDisplay: 'Görüntü',
  size: 'Boyut',
  position: 'Yükseklik',
  color: 'Renk',
  background: 'Arka plan',
  font: 'Yazı tipi',
  shadow: 'Gölge',
  bold: 'Kalın',
  seekStep: 'İleri sarma adımı',
  numberKeys: 'Sayı tuşlarıyla sarma',
  autoSkipIntro: 'İntroyu otomatik atla',
  autoSkipOutro: 'Jeneriği otomatik atla',
  autoSkipDelay: 'Otomatik atlama gecikmesi',
  autoAdvance: 'Sonrakini otomatik oynat',
  autoFullscreen: 'Oynatınca tam ekran',
  aspect: 'En boy oranı',
  filter: 'Video filtresi',
  reset: 'Sıfırla',
  default: 'Varsayılan',
  off: 'Kapalı',
  filterVivid: 'Canlı',
  filterWarm: 'Sıcak',
  filterCool: 'Soğuk',
  filterBright: 'Parlak',
  filterCinema: 'Sinema',
  colorWhite: 'Beyaz',
  colorYellow: 'Sarı',
  colorCyan: 'Camgöbeği',
  colorGreen: 'Yeşil',
  colorMagenta: 'Eflatun',
  colorRed: 'Kırmızı',
  percent: '%{value}',
  seconds: '{value} sn',
};

/** i18n name of each caption color. */
export const CAPTION_COLOR_I18N: Readonly<Record<CaptionColor, SettingsI18nName>> = {
  white: 'colorWhite',
  yellow: 'colorYellow',
  cyan: 'colorCyan',
  green: 'colorGreen',
  magenta: 'colorMagenta',
  red: 'colorRed',
};

/** i18n name of each video filter; `none` reads "Off". */
export const VIDEO_FILTER_I18N: Readonly<Record<VideoFilter, SettingsI18nName>> = {
  none: 'off',
  vivid: 'filterVivid',
  warm: 'filterWarm',
  cool: 'filterCool',
  bright: 'filterBright',
  cinema: 'filterCinema',
};

/** i18n name of an aspect ratio, or null when the ratio is shown as is (`16:9`). */
export function aspectI18n(aspect: AspectRatio): SettingsI18nName | null {
  return aspect === 'default' ? 'default' : null;
}

/** Registry key of a caption font's label. */
export function captionFontKey(id: string): string {
  return `caramel.settings.fontName.${id}`;
}

type Register = (locale: string, translations: Record<string, unknown>) => void;
const register = registerI18n as unknown as Register;

/** `{ a: { b: 'x' } }` from `'caramel.a.b'` keys, so the registry can resolve the dotted paths. */
function nest(strings: Readonly<Record<SettingsI18nName, string>>): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const name of Object.keys(SETTINGS_KEYS_I18N) as SettingsI18nName[]) {
    const parts = SETTINGS_KEYS_I18N[name].split('.');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      node[part] ??= {};
      node = node[part] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]!] = strings[name];
  }
  return root;
}

let registered = false;

/**
 * Registers the Turkish and English strings of the settings menu in the shared
 * Video.js i18n registry. Idempotent. The `caramel` namespace is ours, so the
 * call is cast past the typed built-in phrase catalog.
 */
export function registerSettingsI18n(): void {
  if (registered) return;
  registered = true;
  register('tr', nest(TR));
  register('en', nest(SETTINGS_DEFAULTS_I18N));
}

/** Fonts whose labels are in the registry, keyed by id, to register each label once. */
const fontLabels = new Map<string, string>();

/**
 * Puts caption font labels into the registry under `captionFontKey(id)`, so
 * `<media-text>` follows locale switches for them too. Only new or changed
 * labels are registered.
 */
export function registerCaptionFontLabels(fonts: readonly CaptionFont[]): void {
  const tr: Record<string, string> = {};
  const en: Record<string, string> = {};
  let changed = false;
  for (const font of fonts) {
    const signature = `${font.label.tr}\u0000${font.label.en}`;
    if (fontLabels.get(font.id) === signature) continue;
    fontLabels.set(font.id, signature);
    tr[font.id] = font.label.tr;
    en[font.id] = font.label.en;
    changed = true;
  }
  if (!changed) return;
  register('tr', { caramel: { settings: { fontName: tr } } });
  register('en', { caramel: { settings: { fontName: en } } });
}
