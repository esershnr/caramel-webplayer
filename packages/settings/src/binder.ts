/**
 * Hands the player settings to the elements that already implement them:
 * `media-hotkey`, `media-gesture`, `caramel-skip-segments` and
 * `caramel-playlist`. Hotkeys and gestures take attributes. The two caramel
 * siblings are driven through their public properties once they are upgraded
 * (`autoSkip`, `autoSkipDelay`, `autoAdvance`), so a configuration the site
 * set as a property is kept and the playlist's other options are left alone;
 * before the upgrade their attributes are written instead, which the elements
 * read when they upgrade.
 *
 * Every value is snapshotted before its first write. A key that is not active
 * (the user has no stored choice) restores the snapshot, so the siblings end
 * up exactly as the site set them. When the site changes a value after our
 * write (the live value no longer equals what we wrote), the live value
 * becomes the new snapshot.
 */
import { normalizeValue, type SettingsKey, type SettingsValues } from './schema.js';

export const BOUND_KEYS: readonly SettingsKey[] = Object.freeze([
  'player.seekStep',
  'player.numberKeys',
  'player.autoSkipIntro',
  'player.autoSkipOutro',
  'player.autoSkipDelay',
  'player.autoAdvance',
] as const);

/** Seek step of Video.js when a seekStep hotkey has no `value`. */
const VIDEOJS_SEEK_STEP = 10;
const ALL_SEGMENT_TYPES = ['intro', 'recap', 'outro', 'sponsor'] as const;
const INTRO_TYPES = ['intro', 'recap'];
const OUTRO_TYPES = ['outro'];

const SEEK_FORWARD = 'media-hotkey[action="seekStep"][keys="ArrowRight"], media-hotkey[action="seekStep"][keys="l"]';
const SEEK_BACK = 'media-hotkey[action="seekStep"][keys="ArrowLeft"], media-hotkey[action="seekStep"][keys="j"]';
const GESTURE_FORWARD = 'media-gesture[action="seekStep"][region="right"]';
const GESTURE_BACK = 'media-gesture[action="seekStep"][region="left"]';
const NUMBER_KEYS = 'media-hotkey[keys="0-9"]';
const SKIP = 'caramel-skip-segments';
const PLAYLIST = 'caramel-playlist';

/**
 * One value on one element, read and written as a string (`null` means
 * "absent", like a missing attribute). Attributes and properties share the
 * snapshot logic through this shape.
 */
interface Binding {
  name: string;
  read(element: Element): string | null;
  write(element: Element, value: string | null): void;
}

interface Snapshot {
  /** The site's value, captured before our first write. */
  site: string | null;
  /** What we wrote last; a live value that differs means the site changed it. */
  written: string | null;
}

const snapshots = new WeakMap<Element, Map<string, Snapshot>>();

function attribute(name: string): Binding {
  return {
    name,
    read: (element) => element.getAttribute(name),
    write: (element, value) => {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    },
  };
}

/**
 * Tokens of an `auto-skip` list in canonical order (intro, recap, outro,
 * sponsor, then unknown tokens as written); `all` and `*` expand to every
 * type. One order for attribute and property values keeps the comparisons
 * between what we wrote and what the site holds exact.
 */
function autoSkipTokens(value: string | null): string[] {
  const seen: string[] = [];
  for (const part of (value ?? '').split(',')) {
    const token = part.trim();
    const expanded = token === 'all' || token === '*' ? ALL_SEGMENT_TYPES : token ? [token] : [];
    for (const t of expanded) if (!seen.includes(t)) seen.push(t);
  }
  const known: readonly string[] = ALL_SEGMENT_TYPES;
  return [...known.filter((t) => seen.includes(t)), ...seen.filter((t) => !known.includes(t))];
}

type SkipLike = Element & { autoSkip?: Record<string, boolean>; autoSkipDelay?: number; skip?: unknown };
type PlaylistLike = Element & { autoAdvance?: boolean; select?: unknown };

/** The element has upgraded to the caramel class (its methods exist). */
const upgradedSkip = (element: Element): element is SkipLike & { autoSkip: Record<string, boolean> } =>
  typeof (element as SkipLike).skip === 'function' && typeof (element as SkipLike).autoSkip === 'object';
const upgradedPlaylist = (element: Element): element is PlaylistLike & { autoAdvance: boolean } =>
  typeof (element as PlaylistLike).select === 'function' && typeof (element as PlaylistLike).autoAdvance === 'boolean';

const AUTO_SKIP_ATTRIBUTE = attribute('auto-skip');
/** `auto-skip` tokens: the `autoSkip` property on an upgraded element, else the attribute. */
const AUTO_SKIP: Binding = {
  name: 'auto-skip',
  read: (element) => {
    if (!upgradedSkip(element)) return AUTO_SKIP_ATTRIBUTE.read(element);
    const tokens = ALL_SEGMENT_TYPES.filter((type) => element.autoSkip[type] === true);
    return tokens.length ? tokens.join(',') : null;
  },
  write: (element, value) => {
    if (!upgradedSkip(element)) return AUTO_SKIP_ATTRIBUTE.write(element, value);
    const config: Record<string, boolean> = {};
    for (const token of autoSkipTokens(value)) config[token] = true;
    element.autoSkip = config;
  },
};

const DELAY_ATTRIBUTE = attribute('auto-skip-delay');
/** Auto-skip delay: the `autoSkipDelay` property on an upgraded element, else the attribute. */
const AUTO_SKIP_DELAY: Binding = {
  name: 'auto-skip-delay',
  read: (element) => {
    if (!upgradedSkip(element)) return DELAY_ATTRIBUTE.read(element);
    const delay = Number(element.autoSkipDelay);
    return Number.isFinite(delay) && delay > 0 ? String(delay) : null;
  },
  write: (element, value) => {
    if (!upgradedSkip(element)) return DELAY_ATTRIBUTE.write(element, value);
    element.autoSkipDelay = value === null ? 0 : Number(value);
  },
};

const NO_AUTO_ADVANCE_ATTRIBUTE = attribute('no-auto-advance');
/** Auto advance, in the attribute's shape: `''` means off (`no-auto-advance` present), `null` means on. */
const AUTO_ADVANCE: Binding = {
  name: 'no-auto-advance',
  read: (element) => {
    if (!upgradedPlaylist(element)) return NO_AUTO_ADVANCE_ATTRIBUTE.read(element);
    return element.autoAdvance ? null : '';
  },
  write: (element, value) => {
    if (!upgradedPlaylist(element)) return NO_AUTO_ADVANCE_ATTRIBUTE.write(element, value);
    element.autoAdvance = value === null;
  },
};

const VALUE = attribute('value');
const DISABLED = attribute('disabled');

/** The site's value: the snapshot while we hold one (refreshed when the site wrote since), else the live value. */
function siteValue(element: Element, binding: Binding): string | null {
  const snapshot = snapshots.get(element)?.get(binding.name);
  const live = binding.read(element);
  if (!snapshot) return live;
  if (live !== snapshot.written) snapshot.site = live;
  return snapshot.site;
}

/** Writes a value when it differs from the live one; snapshots the site's value first. Returns true on a write. */
function write(element: Element, binding: Binding, value: string | null): boolean {
  const site = siteValue(element, binding);
  let map = snapshots.get(element);
  if (!map) {
    map = new Map();
    snapshots.set(element, map);
  }
  const snapshot = map.get(binding.name);
  // Remember what we hold even when nothing needs writing, so a later site
  // change is told apart from our own value.
  if (snapshot) snapshot.written = value;
  else map.set(binding.name, { site, written: value });
  if (binding.read(element) === value) return false;
  binding.write(element, value);
  return true;
}

/** Puts a value back to the site's and forgets the snapshot. Returns true on a write. */
function restore(element: Element, binding: Binding): boolean {
  const map = snapshots.get(element);
  const snapshot = map?.get(binding.name);
  if (!map || !snapshot) return false;
  const site = siteValue(element, binding);
  map.delete(binding.name);
  if (!map.size) snapshots.delete(element);
  if (binding.read(element) === site) return false;
  binding.write(element, site);
  return true;
}

function siteSeekStep(element: Element): number | undefined {
  const raw = siteValue(element, VALUE);
  const n = raw === null || raw.trim() === '' ? VIDEOJS_SEEK_STEP : Math.abs(Number(raw));
  return normalizeValue('player.seekStep', n);
}

function siteDelay(element: Element): number {
  const raw = siteValue(element, AUTO_SKIP_DELAY);
  const n = raw === null || raw.trim() === '' ? 0 : Number(raw);
  return normalizeValue('player.autoSkipDelay', Number.isFinite(n) && n > 0 ? n : 0) ?? 0;
}

/**
 * What the sibling elements do today, as settings values. Only keys whose
 * element exists are returned. Values we wrote ourselves are ignored: the
 * snapshot of the site's value is read instead.
 */
export function readSiteDefaults(root: ParentNode): Partial<SettingsValues> {
  const out: Partial<SettingsValues> = {};

  const seek = root.querySelector('media-hotkey[keys="ArrowRight"][action="seekStep"]');
  if (seek) {
    const step = siteSeekStep(seek);
    if (step !== undefined) out['player.seekStep'] = step;
  }

  const numbers = root.querySelector(NUMBER_KEYS);
  if (numbers) out['player.numberKeys'] = siteValue(numbers, DISABLED) === null;

  const skip = root.querySelector(SKIP);
  if (skip) {
    const tokens = autoSkipTokens(siteValue(skip, AUTO_SKIP));
    // Recap follows the intro switch when written, but a site that skips only
    // recaps does not auto-skip intros, so the switch shows off.
    out['player.autoSkipIntro'] = tokens.includes('intro');
    out['player.autoSkipOutro'] = OUTRO_TYPES.some((t) => tokens.includes(t));
    out['player.autoSkipDelay'] = siteDelay(skip);
  }

  const playlist = root.querySelector(PLAYLIST);
  if (playlist) out['player.autoAdvance'] = siteValue(playlist, AUTO_ADVANCE) === null;

  return out;
}

/**
 * The `auto-skip` list for one element: the site's list with the groups the
 * user set replaced. A group left alone keeps the site's tokens, and sponsor
 * (or any other type) is never touched.
 */
function composeAutoSkip(element: Element, values: SettingsValues, active: ReadonlySet<SettingsKey>): string {
  const intro = active.has('player.autoSkipIntro');
  const outro = active.has('player.autoSkipOutro');
  let tokens = autoSkipTokens(siteValue(element, AUTO_SKIP));
  if (intro) tokens = tokens.filter((t) => !INTRO_TYPES.includes(t));
  if (outro) tokens = tokens.filter((t) => !OUTRO_TYPES.includes(t));
  if (intro && values['player.autoSkipIntro']) tokens.push(...INTRO_TYPES);
  if (outro && values['player.autoSkipOutro']) tokens.push(...OUTRO_TYPES);
  return autoSkipTokens(tokens.join(',')).join(',');
}

function each(root: ParentNode, selector: string, fn: (element: Element) => boolean): boolean {
  let wrote = false;
  for (const element of root.querySelectorAll(selector)) if (fn(element)) wrote = true;
  return wrote;
}

/**
 * Writes the active keys to the sibling elements and restores the site's
 * values for the others. Idempotent: a value that is already there is not
 * touched. Returns the keys that caused a write.
 */
export function applyBinding(
  root: ParentNode,
  values: SettingsValues,
  active: ReadonlySet<SettingsKey>,
): SettingsKey[] {
  const wrote = new Set<SettingsKey>();
  const mark = (key: SettingsKey, did: boolean) => {
    if (did) wrote.add(key);
  };

  // Seek step: signed values on the hotkeys and the double tap gestures.
  {
    const key: SettingsKey = 'player.seekStep';
    const on = active.has(key);
    const step = values[key];
    const set = (sign: 1 | -1) => (element: Element) =>
      on ? write(element, VALUE, String(sign * step)) : restore(element, VALUE);
    mark(key, each(root, SEEK_FORWARD, set(1)));
    mark(key, each(root, SEEK_BACK, set(-1)));
    mark(key, each(root, GESTURE_FORWARD, set(1)));
    mark(key, each(root, GESTURE_BACK, set(-1)));
  }

  {
    const key: SettingsKey = 'player.numberKeys';
    const on = active.has(key);
    mark(
      key,
      each(root, NUMBER_KEYS, (element) =>
        on ? write(element, DISABLED, values[key] ? null : '') : restore(element, DISABLED),
      ),
    );
  }

  const skips = root.querySelectorAll(SKIP);
  {
    const intro = active.has('player.autoSkipIntro');
    const outro = active.has('player.autoSkipOutro');
    for (const element of skips) {
      let did: boolean;
      if (intro || outro) {
        // An empty list is written as auto-skip="" (or an empty config), which means no auto-skip.
        did = write(element, AUTO_SKIP, composeAutoSkip(element, values, active));
      } else {
        did = restore(element, AUTO_SKIP);
      }
      if (did) {
        // The value is shared; credit the active keys, or both when restoring.
        if (intro || !outro) wrote.add('player.autoSkipIntro');
        if (outro || !intro) wrote.add('player.autoSkipOutro');
      }
    }
  }

  {
    const key: SettingsKey = 'player.autoSkipDelay';
    const on = active.has(key);
    for (const element of skips) {
      if (!on) {
        mark(key, restore(element, AUTO_SKIP_DELAY));
        continue;
      }
      const delay = values[key];
      const hadNone = siteValue(element, AUTO_SKIP_DELAY) === null;
      mark(key, write(element, AUTO_SKIP_DELAY, delay === 0 && hadNone ? null : String(delay)));
    }
  }

  {
    const key: SettingsKey = 'player.autoAdvance';
    const on = active.has(key);
    mark(
      key,
      each(root, PLAYLIST, (element) =>
        on ? write(element, AUTO_ADVANCE, values[key] ? null : '') : restore(element, AUTO_ADVANCE),
      ),
    );
  }

  return BOUND_KEYS.filter((key) => wrote.has(key));
}
