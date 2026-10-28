/**
 * Preference schema of <caramel-settings>: keys, types, defaults, ranges and
 * the normalizers that keep stored or site-provided values sane. Pure module,
 * no DOM.
 *
 * Keys are flat and dotted (`captions.scale`); the first part is the settings
 * page they belong to. Every default is "what the player does today" so that a
 * mounted settings package with no stored choice changes nothing, with one
 * deliberate exception: `player.autoSkipDelay` defaults to 3, so a player with
 * the settings package counts down 3 seconds and skips segments the site does
 * not already skip at once.
 */

export const SETTINGS_VERSION = 1;

export const CAPTION_COLORS = ['white', 'yellow', 'cyan', 'green', 'magenta', 'red'] as const;
export type CaptionColor = (typeof CAPTION_COLORS)[number];

export const BUILTIN_CAPTION_FONTS = ['default', 'sans', 'serif', 'mono', 'legible'] as const;
export type BuiltinCaptionFont = (typeof BUILTIN_CAPTION_FONTS)[number];

export const ASPECT_RATIOS = ['default', '4:3', '16:9'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const VIDEO_FILTERS = ['none', 'vivid', 'warm', 'cool', 'bright', 'cinema'] as const;
export type VideoFilter = (typeof VIDEO_FILTERS)[number];

export type SettingsPage = 'captions' | 'player' | 'display';
export const SETTINGS_PAGES: readonly SettingsPage[] = ['captions', 'player', 'display'];

export interface SettingsValues {
  /** Caption font size as a factor of the default (5% of the video height). */
  'captions.scale': number;
  /** Extra lift of the captions from the bottom, percent of the video height. */
  'captions.offset': number;
  'captions.color': CaptionColor;
  /** Dark box behind the caption text. */
  'captions.background': boolean;
  /** A built-in font id (`default` inherits the player font) or one registered with `registerCaptionFont`. */
  'captions.font': string;
  'captions.shadow': boolean;
  'captions.bold': boolean;
  /** Seconds for arrow keys, j / l and double taps. */
  'player.seekStep': number;
  /** The 0 to 9 keys seek to a percentage. */
  'player.numberKeys': boolean;
  /** Skip intro and recap segments at once. Off: they count down `player.autoSkipDelay` seconds, or only show the button at 0. */
  'player.autoSkipIntro': boolean;
  /** Skip outro segments at once. Off: they count down `player.autoSkipDelay` seconds, or only show the button at 0. */
  'player.autoSkipOutro': boolean;
  /** Seconds the skip button counts down before an auto-skip of a type that is not skipped at once; 0 means no auto-skip. */
  'player.autoSkipDelay': number;
  /** Playlist advances to the next item when one ends. */
  'player.autoAdvance': boolean;
  /** Enter fullscreen when the user starts playback. */
  'player.autoFullscreen': boolean;
  'display.aspect': AspectRatio;
  'display.filter': VideoFilter;
}

export type SettingsKey = keyof SettingsValues;

export const SETTINGS_DEFAULTS: Readonly<SettingsValues> = Object.freeze({
  'captions.scale': 1,
  'captions.offset': 0,
  'captions.color': 'white',
  'captions.background': true,
  'captions.font': 'default',
  'captions.shadow': false,
  'captions.bold': false,
  'player.seekStep': 5,
  'player.numberKeys': true,
  'player.autoSkipIntro': false,
  'player.autoSkipOutro': false,
  'player.autoSkipDelay': 3,
  'player.autoAdvance': true,
  'player.autoFullscreen': false,
  'display.aspect': 'default',
  'display.filter': 'none',
});

export const SETTINGS_KEYS = Object.keys(SETTINGS_DEFAULTS) as readonly SettingsKey[];

export interface SettingsRange {
  min: number;
  max: number;
  step: number;
}

/** Slider ranges of the numeric keys. Values snap to `step`. */
export const SETTINGS_RANGES: Readonly<Record<NumericSettingsKey, SettingsRange>> = Object.freeze({
  'captions.scale': { min: 0.5, max: 2, step: 0.1 },
  'captions.offset': { min: 0, max: 30, step: 2 },
  'player.seekStep': { min: 5, max: 30, step: 5 },
  'player.autoSkipDelay': { min: 0, max: 10, step: 1 },
});

export type NumericSettingsKey = 'captions.scale' | 'captions.offset' | 'player.seekStep' | 'player.autoSkipDelay';

export type BooleanSettingsKey = {
  [K in SettingsKey]: SettingsValues[K] extends boolean ? K : never;
}[SettingsKey];

const FONT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export function isSettingsKey(value: string): value is SettingsKey {
  return Object.hasOwn(SETTINGS_DEFAULTS, value);
}

export function isNumericSettingsKey(key: SettingsKey): key is NumericSettingsKey {
  return Object.hasOwn(SETTINGS_RANGES, key);
}

export function pageOf(key: SettingsKey): SettingsPage {
  return key.slice(0, key.indexOf('.')) as SettingsPage;
}

export function keysOfPage(page: SettingsPage): SettingsKey[] {
  return SETTINGS_KEYS.filter((key) => pageOf(key) === page);
}

/** Clamps to the range and snaps to the step (the step's decimals are kept). */
export function snapToRange(value: number, range: SettingsRange): number {
  const clamped = Math.min(range.max, Math.max(range.min, value));
  const steps = Math.round((clamped - range.min) / range.step);
  const decimals = (String(range.step).split('.')[1] ?? '').length;
  return Number((range.min + steps * range.step).toFixed(decimals));
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '') return true;
  if (value === 'false') return false;
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Validates one value for a key. Numbers are clamped and snapped, booleans
 * accept `"true"` / `"false"` / `""` (attributes), enums must be listed.
 * Returns `undefined` for anything else, so callers drop the value.
 */
export function normalizeValue<K extends SettingsKey>(key: K, value: unknown): SettingsValues[K] | undefined {
  type V = SettingsValues[K] | undefined;
  if (isNumericSettingsKey(key)) {
    const n = toNumber(value);
    return (n === undefined ? undefined : snapToRange(n, SETTINGS_RANGES[key])) as V;
  }
  switch (key) {
    case 'captions.color':
      return (CAPTION_COLORS as readonly string[]).includes(value as string) ? (value as V) : undefined;
    case 'captions.font':
      return typeof value === 'string' && FONT_ID.test(value) ? (value as V) : undefined;
    case 'display.aspect':
      return (ASPECT_RATIOS as readonly string[]).includes(value as string) ? (value as V) : undefined;
    case 'display.filter':
      return (VIDEO_FILTERS as readonly string[]).includes(value as string) ? (value as V) : undefined;
    default:
      return toBoolean(value) as V;
  }
}

/** Keeps the known keys with valid values of an untrusted object. */
export function normalizeValues(input: unknown): Partial<SettingsValues> {
  const out: Partial<SettingsValues> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!isSettingsKey(key)) continue;
    const value = normalizeValue(key, raw);
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** Effective values: the user's stored choice, else the site default, else the schema default. */
export function resolveSettings(
  user: Partial<SettingsValues> = {},
  site: Partial<SettingsValues> = {},
): SettingsValues {
  const out = { ...SETTINGS_DEFAULTS } as SettingsValues;
  for (const key of SETTINGS_KEYS) {
    const value = user[key] ?? site[key];
    if (value !== undefined) (out as unknown as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** Keys whose values differ between two resolved settings objects. */
export function changedKeys(before: SettingsValues, after: SettingsValues): SettingsKey[] {
  return SETTINGS_KEYS.filter((key) => before[key] !== after[key]);
}
