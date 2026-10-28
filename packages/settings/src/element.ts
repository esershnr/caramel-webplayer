import {
  PlayerController,
  type PropertyValues,
  playerContext,
  selectFullscreen,
  selectPlayback,
  UIElement,
} from '@videojs/html';
import { applyBinding, BOUND_KEYS, readSiteDefaults } from './binder.js';
import { type CaptionColors, captionCss } from './captions.js';
import { displayCss, fitBox } from './display.js';
import { autoFullscreenSupported, installAutoFullscreen } from './fullscreen.js';
import { registerSettingsI18n } from './i18n.js';
import {
  CAPTION_COLORS,
  changedKeys,
  isSettingsKey,
  normalizeValues,
  resolveSettings,
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  SETTINGS_PAGES,
  type SettingsKey,
  type SettingsPage,
  type SettingsValues,
} from './schema.js';
import { DEFAULT_STORAGE_KEY, getSettingsStore, type SettingsStore } from './store.js';
import { findMediaElement, SCOPE_ATTRIBUTE, SettingsStyles } from './styles.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

/** Detail of `caramel-settings-change`. */
export interface SettingsChangeDetail {
  /** Keys whose effective value or user-set state changed. */
  keys: SettingsKey[];
  settings: SettingsValues;
}

/** Detail of `caramel-settings-availability`. */
export interface SettingsAvailabilityDetail {
  /** Keys whose control has something to act on; see `availableKeys`. */
  keys: SettingsKey[];
}

/** Elements whose arrival or removal changes what the settings act on. */
const WATCHED = 'media-container, media-hotkey, media-gesture, caramel-skip-segments, caramel-playlist, video';
const BOUND: ReadonlySet<SettingsKey> = new Set(BOUND_KEYS);
const CAPTION_COLOR_NAMES = [...CAPTION_COLORS, 'bg', 'shadow'] as const;

let counter = 0;

function relevant(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  const tag = node.localName;
  if (tag.endsWith('-video') && tag !== 'video-player') return true;
  return node.matches(WATCHED) || node.querySelector(WATCHED) !== null;
}

function parseDefaults(value: unknown): Partial<SettingsValues> {
  if (typeof value === 'string') {
    try {
      return normalizeValues(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return normalizeValues(value);
}

/**
 * <caramel-settings>
 *
 * The settings controller of one player. Pass it as an extra inside
 * `<video-player>` (like `<caramel-drawer>`); the skin's settings menu shows
 * its pages through the `<caramel-settings-menu>` placeholder. It renders
 * nothing itself.
 *
 *   <caramel-settings storage-key="my-site" defaults='{"captions.scale":1.2}'></caramel-settings>
 *
 * Effective values: the user's stored choice, else the site default (the
 * `defaults` attribute, else what the sibling elements say today: hotkey seek
 * step, number keys, auto-skip of `<caramel-skip-segments>`, auto-advance of
 * `<caramel-playlist>`), else the schema default. A key the user never set and
 * the site did not name in `defaults` leaves the siblings exactly as the site
 * wrote them, and caption and display keys at their defaults emit no CSS.
 *
 * Attributes / properties:
 *   storage-key   localStorage key (default `caramel-settings`); players with
 *                 the same key share one store
 *   defaults      JSON object of site defaults keyed by settings key (attribute
 *                 or object property)
 *
 * Properties: `settings` (read only), `store`, `availableKeys`.
 * Methods: `set(partial)`, `reset(page?)`, `isUserSet(key)`.
 * Events: `caramel-settings-change` (detail: SettingsChangeDetail),
 * `caramel-settings-availability` (detail: SettingsAvailabilityDetail). Both
 * bubble.
 */
export class CaramelSettingsElement extends Base {
  static readonly tagName = 'caramel-settings';

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'storage-key', 'defaults'];
  }

  readonly #playback = new PlayerController(this, playerContext, selectPlayback);
  readonly #fullscreen = new PlayerController(this, playerContext, selectFullscreen);
  readonly #uid = `caramel-settings-${++counter}`;
  readonly #styles = new SettingsStyles(this.#uid);

  #storageKey: string | null = null;
  /** True once `defaults` was assigned as a property; the attribute then no longer wins. */
  #defaultsFromProperty = false;
  #defaults: Partial<SettingsValues> = {};
  #store: SettingsStore | null = null;
  #unsubscribe: (() => void) | null = null;
  #settings: SettingsValues = { ...SETTINGS_DEFAULTS };
  #available: SettingsKey[] = [...SETTINGS_KEYS];

  #player: Element | null = null;
  #container: HTMLElement | null = null;
  /** What the siblings said at the last refresh (see readSiteDefaults). */
  #site: Partial<SettingsValues> = {};
  #box = { width: 0, height: 0 };
  #disconnect: AbortController | null = null;
  #mutations: MutationObserver | null = null;
  #resize: ResizeObserver | null = null;
  #scheduled = false;
  #uninstallFullscreen: (() => void) | null = null;
  /** Tag of the undefined ancestor we wait for, so one connect waits once. */
  #waitingFor: string | null = null;

  /** Storage key of the shared store. */
  get storageKey(): string {
    return this.#storageKey ?? this.getAttribute('storage-key') ?? DEFAULT_STORAGE_KEY;
  }

  set storageKey(value: string) {
    this.#storageKey = typeof value === 'string' && value ? value : null;
    if (this.isConnected) this.#attachStore();
  }

  /** Site defaults keyed by settings key; invalid keys and values are dropped. */
  get defaults(): Partial<SettingsValues> {
    return { ...this.#defaults };
  }

  set defaults(value: unknown) {
    this.#defaultsFromProperty = true;
    this.#defaults = parseDefaults(value);
    if (this.isConnected) this.#refresh([]);
  }

  /** Effective values (read only copy). */
  get settings(): SettingsValues {
    return { ...this.#settings };
  }

  /** The shared store for `storageKey`, or null before the first connect. */
  get store(): SettingsStore | null {
    return this.#store;
  }

  /**
   * Keys whose control has something to act on: every key except the bound
   * player keys whose sibling element is missing (no playlist: no autoplay
   * next), and fullscreen on play where fullscreen is unsupported.
   */
  get availableKeys(): readonly SettingsKey[] {
    return this.#available;
  }

  /** Stores the user's choice. Invalid keys and values are ignored. */
  set(partial: Partial<SettingsValues>): void {
    this.#resolveStore().set(partial);
  }

  /** Forgets the user's choices: all of them, or one page. */
  reset(page?: SettingsPage): void {
    const store = this.#resolveStore();
    if (page === undefined) store.reset();
    else if ((SETTINGS_PAGES as readonly string[]).includes(page)) store.reset(page);
  }

  /** True when the user picked a value for the key (stored, shared by the store key). */
  isUserSet(key: SettingsKey): boolean {
    return isSettingsKey(key) && (this.#store?.has(key) ?? false);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerSettingsI18n();
    this.#upgradeProperty('storageKey');
    this.#upgradeProperty('defaults');
    if (!this.#defaultsFromProperty) this.#defaults = parseDefaults(this.getAttribute('defaults'));
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    this.#attachStore(false);
    this.#locate();
    this.#awaitProvider();
    this.#refresh([], false);
    // Announces the controller to a placeholder menu that gave up waiting for it.
    this.#emit('caramel-settings-availability', { keys: [...this.#available] } satisfies SettingsAvailabilityDetail);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#mutations?.disconnect();
    this.#mutations = null;
    this.#resize?.disconnect();
    this.#resize = null;
    this.#uninstallFullscreen?.();
    this.#uninstallFullscreen = null;
    this.#styles.clear();
    const root = this.#root();
    if (root) applyBinding(root, this.#settings, new Set());
    this.#container?.removeAttribute(SCOPE_ATTRIBUTE);
    this.#container = null;
    this.#player = null;
    this.#site = {};
    this.#available = [];
    // Lets a bound menu notice that the controller went away.
    this.#emit('caramel-settings-availability', { keys: [] } satisfies SettingsAvailabilityDetail);
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback?.(name, old, value);
    if (!this.isConnected || old === value) return;
    if (name === 'storage-key' && this.#storageKey === null) this.#attachStore();
    if (name === 'defaults' && !this.#defaultsFromProperty) {
      this.#defaults = parseDefaults(value);
      this.#refresh([]);
    }
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    // Player state changed (fullscreen availability arrives with the player).
    this.#updateAvailability();
  }

  #resolveStore(): SettingsStore {
    if (!this.#store) this.#store = getSettingsStore(this.storageKey);
    return this.#store;
  }

  /** Subscribes to the store of the current key; `refresh` re-resolves the values. */
  #attachStore(refresh = true): void {
    const store = getSettingsStore(this.storageKey);
    if (store === this.#store && this.#unsubscribe) return;
    this.#unsubscribe?.();
    const before = this.#store;
    this.#store = store;
    this.#unsubscribe = store.subscribe((keys) => this.#refresh(keys));
    if (refresh && before !== store) this.#refresh([...SETTINGS_KEYS]);
  }

  /**
   * The player answers context requests only once it is defined. When this
   * element registers first, its controllers ask an un-upgraded
   * `<video-player>`, nobody answers and they never ask again. Wait for the
   * nearest undefined ancestor, then ask again. Only undefined tags are
   * awaited: a resolved `whenDefined` that re-armed itself would spin a
   * microtask loop.
   */
  #awaitProvider(): void {
    if (this.#waitingFor || typeof customElements === 'undefined') return;
    const tag = undefinedAncestorTag(this);
    if (!tag) return;
    this.#waitingFor = tag;
    void customElements.whenDefined(tag).then(() => {
      this.#waitingFor = null;
      if (!this.isConnected) return;
      if (!this.#playback.value) {
        // Controllers dispatch their context requests on connect.
        super.disconnectedCallback();
        super.connectedCallback();
      }
      this.#awaitProvider();
    });
  }

  /**
   * A property assigned before the element upgraded lands as an own property
   * that would shadow the accessor. Re-route it through the setter.
   */
  #upgradeProperty(name: 'storageKey' | 'defaults'): void {
    if (!Object.hasOwn(this, name)) return;
    const value = (this as unknown as Record<string, unknown>)[name];
    delete (this as unknown as Record<string, unknown>)[name];
    (this as unknown as Record<string, unknown>)[name] = value;
  }

  /** Finds the player and its container, and (re)starts the observers. */
  #locate(): void {
    const player = this.closest('video-player');
    const container =
      this.closest<HTMLElement>('media-container') ?? player?.querySelector<HTMLElement>('media-container') ?? null;
    const signal = this.#disconnect?.signal;
    if (!signal) return;

    if (player !== this.#player || !this.#mutations) {
      this.#player = player;
      this.#mutations?.disconnect();
      this.#mutations = null;
      const target = player ?? container ?? this.parentElement;
      if (target && typeof MutationObserver === 'function') {
        const observer = new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) if (relevant(node)) return this.#schedule();
            for (const node of record.removedNodes) if (relevant(node)) return this.#schedule();
          }
        });
        observer.observe(target, { childList: true, subtree: true });
        this.#mutations = observer;
      }
      player?.addEventListener('caramel-playlist-change', () => this.#schedule(), { signal });
    }

    if (container !== this.#container) {
      this.#container?.removeAttribute(SCOPE_ATTRIBUTE);
      this.#resize?.disconnect();
      this.#resize = null;
      this.#uninstallFullscreen?.();
      this.#uninstallFullscreen = null;
      this.#container = container;
      this.#box = { width: 0, height: 0 };
      if (container) {
        container.setAttribute(SCOPE_ATTRIBUTE, this.#uid);
        if (typeof ResizeObserver === 'function') {
          const observer = new ResizeObserver((entries) => {
            const rect = entries[entries.length - 1]?.contentRect;
            if (!rect) return;
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);
            if (width === this.#box.width && height === this.#box.height) return;
            this.#box = { width, height };
            this.#applyStyles();
          });
          observer.observe(container);
          this.#resize = observer;
        }
      }
    }
  }

  /** Coalesces DOM changes into one refresh per microtask. */
  #schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (!this.isConnected) return;
      this.#locate();
      this.#refresh([]);
    });
  }

  /** The subtree the binder works in. */
  #root(): ParentNode | null {
    return this.#player ?? this.#container;
  }

  /** Keys the binder writes: the user's choices and the keys the site named in `defaults`. */
  #activeKeys(): Set<SettingsKey> {
    const active = new Set<SettingsKey>();
    const store = this.#store;
    for (const key of SETTINGS_KEYS) {
      if (store?.has(key) || Object.hasOwn(this.#defaults, key)) active.add(key);
    }
    return active;
  }

  /**
   * Re-resolves the effective values, applies them and reports what changed.
   * `storeKeys` are the keys the store reported, which count as changed even
   * when the effective value stays the same (their user-set state changed).
   */
  #refresh(storeKeys: readonly SettingsKey[], emit = true): void {
    const root = this.#root();
    const site = root ? readSiteDefaults(root) : {};
    this.#site = site;
    const next = resolveSettings(this.#store?.values ?? {}, { ...site, ...this.#defaults });
    const keys = new Set<SettingsKey>([...changedKeys(this.#settings, next), ...storeKeys]);
    this.#settings = next;
    this.#updateAvailability();
    this.#apply();
    if (emit && keys.size) {
      const ordered = SETTINGS_KEYS.filter((key) => keys.has(key));
      this.#emit('caramel-settings-change', { keys: ordered, settings: this.settings } satisfies SettingsChangeDetail);
    }
  }

  #updateAvailability(): void {
    const present = this.#site;
    const fullscreen = this.#fullscreen.value;
    const fullscreenOk = autoFullscreenSupported() && fullscreen?.fullscreenAvailability !== 'unsupported';
    const next = SETTINGS_KEYS.filter((key) => {
      if (BOUND.has(key)) return Object.hasOwn(present, key);
      if (key === 'player.autoFullscreen') return fullscreenOk;
      return true;
    });
    if (next.length === this.#available.length && next.every((key, i) => key === this.#available[i])) return;
    this.#available = next;
    if (this.isConnected) {
      this.#emit('caramel-settings-availability', { keys: [...next] } satisfies SettingsAvailabilityDetail);
    }
  }

  #apply(): void {
    const root = this.#root();
    if (root) applyBinding(root, this.#settings, this.#activeKeys());
    this.#applyStyles();
    this.#applyFullscreen();
  }

  #applyStyles(): void {
    const container = this.#container;
    if (!container) {
      this.#styles.clear();
      return;
    }
    const media = findMediaElement(container);
    const values = this.#settings;
    const needsBox =
      values['captions.scale'] !== SETTINGS_DEFAULTS['captions.scale'] ||
      values['display.aspect'] !== SETTINGS_DEFAULTS['display.aspect'];
    let { width, height } = this.#box;
    if (needsBox && (!width || !height)) {
      width = container.clientWidth;
      height = container.clientHeight;
    }
    const box = fitBox(width, height, values['display.aspect']);
    const colors = this.#captionColors(container, values);
    this.#styles.update(media, (scope) =>
      [captionCss({ values, boxHeight: box?.height ?? height, colors, scope }), displayCss({ values, box, scope })]
        .filter(Boolean)
        .join('\n'),
    );
  }

  /** Caption palette from the theme tokens; only read when a color or the shadow is in use. */
  #captionColors(container: HTMLElement, values: SettingsValues): Partial<CaptionColors> {
    const colors: Partial<CaptionColors> = {};
    const needed =
      values['captions.color'] !== SETTINGS_DEFAULTS['captions.color'] ||
      values['captions.shadow'] !== SETTINGS_DEFAULTS['captions.shadow'];
    if (!needed || typeof getComputedStyle !== 'function') return colors;
    const style = getComputedStyle(container);
    for (const name of CAPTION_COLOR_NAMES) {
      const value = style.getPropertyValue(`--caramel-caption-${name}`).trim();
      if (value) colors[name] = value;
    }
    return colors;
  }

  #applyFullscreen(): void {
    const container = this.#container;
    const wanted = Boolean(container) && this.#settings['player.autoFullscreen'];
    if (!wanted) {
      this.#uninstallFullscreen?.();
      this.#uninstallFullscreen = null;
      return;
    }
    if (this.#uninstallFullscreen || !container) return;
    this.#uninstallFullscreen = installAutoFullscreen(container, {
      paused: () => this.#playback.value?.paused,
      fullscreen: () => this.#fullscreen.value,
    });
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

/** Local name of the closest ancestor that is a custom element not defined yet. */
function undefinedAncestorTag(element: Element): string | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const tag = node.localName;
    if (tag.includes('-') && !customElements.get(tag)) return tag;
  }
  return null;
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-settings': CaramelSettingsElement;
  }
}
