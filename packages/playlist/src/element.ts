import { UIElement, selectPlayback, selectSource, selectTime, type PropertyValues } from '@videojs/html';
import { PlaylistModel, normalizeItems, type PlaylistListener } from './model.js';
import {
  clearResume,
  createLocalStorage,
  readResume,
  restoreTime,
  resumeKey,
  saveResume,
  shouldSave,
  type ResumeEntry,
  type ResumeStorage,
} from './resume.js';
import { chaptersUrlFor, mediaTagFor, type PlaylistItem, type PlaylistSubtitle } from './types.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

export interface PlaylistChangeDetail {
  item: PlaylistItem;
  index: number;
}

export interface PlaylistEndedDetail {
  /** The item that just ended. */
  item: PlaylistItem;
  index: number;
}

/** The slice of the Video.js store this element reads. */
interface StoreLike {
  readonly state: object;
  readonly target: unknown;
  subscribe(callback: () => void): () => void;
}

/** A `<video-player>` as this element sees it. `store` is missing until the element upgrades. */
export type PlayerLike = HTMLElement & { readonly store?: StoreLike | undefined };

const MEDIA_TAGS: ReadonlySet<string> = new Set(['video', 'hls-video']);
const COPIED_MEDIA_ATTRIBUTES = ['playsinline', 'crossorigin', 'preload'] as const;
/** Frames to wait for a `for` target that is not in the document yet. */
const LOOKUP_RETRIES = 30;
let warnedHls = false;

/** Language of the nearest `lang` ancestor: the `lang` property first (reactive
 *  elements such as <media-i18n> do not reflect it to the attribute), then the attribute. */
function langOf(element: Element | null): string {
  if (!element) return '';
  const own = (element as HTMLElement).lang;
  return (typeof own === 'string' && own) || element.getAttribute('lang') || '';
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

/** Boolean attribute semantics for property writes: `''` counts as true. */
function toBoolean(value: unknown): boolean {
  return value === '' || value === true || value === 'true';
}

function noop(): void {}

/**
 * <caramel-playlist>
 *
 * Playlist controller. Renders nothing; it drives a `<video-player>`: swaps
 * the media, tracks, title, poster and skip segments when the current item
 * changes, advances on `ended`, and remembers the resume position per item.
 *
 * Place it inside the player (for example as a skin `extra`) or anywhere on
 * the page with `for="<player id>"` or the `player` property.
 *
 *   <caramel-playlist for="player" items='[{"id":"a","title":"A","src":"a.mp4"}]' list-id="course-1"></caramel-playlist>
 *
 * Attributes / properties:
 *   items            JSON array (attribute) or PlaylistItem[] (property)
 *   start-index      first item to load (default 0)
 *   loop             wrap around at both ends
 *   no-auto-advance  stay on the item when it ends
 *   list-id          resume storage namespace (default `default`)
 *   no-resume        disable resume persistence
 *   for              id of the `<video-player>` when the element lives outside it
 *   player           (property) the player element itself
 *
 * Methods: `select(indexOrId)`, `next()`, `previous()`.
 * Events: `caramel-playlist-change` ({ item, index }), `caramel-playlist-ended` ({ item, index })
 * when the last item ends and nothing follows.
 *
 * HLS items create `<hls-video>`; the host must register it with
 * `import '@videojs/html/media/hls-video'`.
 */
export class CaramelPlaylistElement extends Base {
  static readonly tagName = 'caramel-playlist';

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'items',
      'start-index',
      'loop',
      'no-auto-advance',
      'list-id',
      'no-resume',
      'for',
    ];
  }

  readonly #model = new PlaylistModel();

  #explicitPlayer: PlayerLike | null = null;
  #player: PlayerLike | null = null;
  #unsubscribeStore: (() => void) | null = null;
  #unsubscribeModel: (() => void) | null = null;
  #playerObserver: MutationObserver | null = null;
  #waitingForDefinition = false;
  #lookupRetries = 0;

  #itemsJson: string | null = null;
  #startIndex = 0;
  #listId: string | null = null;
  #resume = true;
  #storage: ResumeStorage | null = null;

  /** What is currently applied to `#player`. */
  #appliedKey: string | null = null;
  #pendingSegments: unknown[] | null = null;
  #langObserver: MutationObserver | null = null;
  #appliedLang: string | null = null;
  #appliedItem: PlaylistItem | null = null;
  #appliedIndex = -1;
  /** Media element this controller inserted last (created or replacement). */
  #ownMedia: Element | null = null;

  #pendingRestore: ResumeEntry | null = null;
  #resumePlaying = false;
  #awaitingSource = false;
  #previousSrc = '';
  #lastSavedAt: number | null = null;
  #lastPaused: boolean | null = null;
  #lastEnded = false;

  /** The queue model, for panels and advanced hosts. Read only. */
  get model(): PlaylistModel {
    return this.#model;
  }

  get items(): readonly PlaylistItem[] {
    return this.#model.items;
  }

  set items(value: unknown) {
    this.#itemsJson = null;
    // React 19 assigns the JSON attribute value as a property once the element
    // is upgraded, so a string is parsed here too.
    this.#setItems(normalizeItems(typeof value === 'string' ? parseJson(value) : value));
  }

  get index(): number {
    return this.#model.index;
  }

  get current(): PlaylistItem | null {
    return this.#model.current;
  }

  get startIndex(): number {
    return this.#startIndex;
  }

  set startIndex(value: number) {
    this.#startIndex = Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  get loop(): boolean {
    return this.#model.loop;
  }

  set loop(value: boolean) {
    this.#model.loop = toBoolean(value);
  }

  get autoAdvance(): boolean {
    return this.#model.autoAdvance;
  }

  set autoAdvance(value: boolean) {
    this.#model.autoAdvance = toBoolean(value);
  }

  get listId(): string {
    return this.#listId ?? 'default';
  }

  set listId(value: string | null) {
    this.#listId = value;
  }

  /** Whether resume positions are stored. */
  get resume(): boolean {
    return this.#resume;
  }

  set resume(value: boolean) {
    value = toBoolean(value);
    this.#resume = value;
    this.#storage = value ? (this.#storage ?? createLocalStorage()) : null;
  }

  /** The player to drive. Wins over `for` and the ancestor lookup. */
  get player(): PlayerLike | null {
    return this.#player;
  }

  set player(value: PlayerLike | null) {
    this.#explicitPlayer = value;
    if (this.isConnected) this.requestUpdate();
  }

  get hasNext(): boolean {
    return this.#model.hasNext;
  }

  get hasPrevious(): boolean {
    return this.#model.hasPrevious;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observeLang();
    this.#unsubscribeModel ??= this.#model.subscribe(() => this.requestUpdate());
    this.#lookupRetries = 0;
    this.#readAttributes();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#langObserver?.disconnect();
    this.#langObserver = null;
    this.#unsubscribeModel?.();
    this.#unsubscribeModel = null;
    this.#detachPlayer();
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback?.(name, old, value);
    if (!this.isConnected) return;
    if (name === 'for') this.#lookupRetries = 0;
    this.#readAttributes();
    this.requestUpdate();
  }

  /** Selects an item by index or id. Returns false for an unknown target. */
  select(indexOrId: number | string): boolean {
    return this.#model.select(indexOrId);
  }

  next(): boolean {
    return this.#model.next();
  }

  previous(): boolean {
    return this.#model.previous();
  }

  /** Notifies on every items or index change. Returns the unsubscribe function. */
  subscribe(listener: PlaylistListener): () => void {
    return this.#model.subscribe(listener);
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    this.#resolvePlayer();
    const player = this.#player;
    const item = this.#model.current;
    if (!player || !item) return;
    const index = this.#model.index;
    const key = `${index}:${item.id}:${item.src}`;
    if (key === this.#appliedKey) return;
    // Without a container and a host media element there is nowhere to mount
    // the item. The host owns the media element (an empty <video> or
    // <hls-video>); the player observer retries once it appears, which keeps
    // the React skin's late media mount (after its elements register) in sync.
    const container = player.querySelector('media-container');
    if (!container || !findMedia(container)) return;
    this.#appliedKey = key;
    this.#applyItem(player, item, index);
  }

  // Inputs ---------------------------------------------------------------

  #readAttributes(): void {
    const raw = this.getAttribute('items');
    if (raw !== null && raw !== this.#itemsJson) {
      this.#itemsJson = raw;
      let parsed: unknown = [];
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = [];
      }
      this.#setItems(normalizeItems(parsed));
    }
    const start = Number(this.getAttribute('start-index'));
    this.#startIndex = Number.isFinite(start) ? Math.trunc(start) : 0;
    this.#model.loop = this.hasAttribute('loop');
    this.#model.autoAdvance = !this.hasAttribute('no-auto-advance');
    this.#listId = this.getAttribute('list-id');
    this.resume = !this.hasAttribute('no-resume');
  }

  /** Replaces the list, keeping the current item when it is still present. */
  #setItems(items: PlaylistItem[]): void {
    const currentId = this.#model.current?.id;
    let start = currentId === undefined ? -1 : items.findIndex((item) => item.id === currentId);
    if (start < 0) start = this.#startIndex;
    this.#model.setItems(items, start);
  }

  // Player wiring --------------------------------------------------------

  #resolvePlayer(): void {
    let candidate: PlayerLike | null = this.#explicitPlayer;
    if (!candidate) {
      const forId = this.getAttribute('for');
      if (forId) {
        candidate = document.getElementById(forId) as PlayerLike | null;
        // The target may be rendered after this element (frameworks commit siblings in order).
        if (!candidate && this.#lookupRetries < LOOKUP_RETRIES && typeof requestAnimationFrame === 'function') {
          this.#lookupRetries++;
          requestAnimationFrame(() => {
            if (this.isConnected) this.requestUpdate();
          });
        }
      }
    }
    if (!candidate) candidate = this.closest('video-player') as PlayerLike | null;

    if (candidate && !candidate.store) {
      // Not upgraded yet: wait once for the definition. Already defined means
      // the target is not a <video-player>; do not retry.
      if (typeof customElements !== 'undefined' && !customElements.get('video-player')) {
        this.#waitForDefinition('video-player');
      }
      candidate = null;
    }

    if (candidate === this.#player) return;
    this.#detachPlayer();
    if (!candidate?.store) return;
    this.#player = candidate;
    this.#unsubscribeStore = candidate.store.subscribe(() => this.#onStoreChange());
    this.#observePlayer(candidate);
  }

  #detachPlayer(): void {
    if (this.#player) this.#saveNow();
    this.#unsubscribeStore?.();
    this.#unsubscribeStore = null;
    this.#playerObserver?.disconnect();
    this.#playerObserver = null;
    this.#player = null;
    this.#appliedKey = null;
    this.#appliedItem = null;
    this.#appliedIndex = -1;
    this.#ownMedia = null;
    this.#awaitingSource = false;
    this.#pendingRestore = null;
    this.#resumePlaying = false;
    this.#lastPaused = null;
    this.#lastEnded = false;
  }

  #waitForDefinition(tag: string): void {
    if (this.#waitingForDefinition || typeof customElements === 'undefined') return;
    this.#waitingForDefinition = true;
    void customElements.whenDefined(tag).then(() => {
      this.#waitingForDefinition = false;
      if (this.isConnected) this.requestUpdate();
    });
  }

  /**
   * Watches the player for a container or media element that appears later
   * (React mounts the skin's media after its elements register).
   */
  #observePlayer(player: PlayerLike): void {
    if (typeof MutationObserver === 'undefined') return;
    this.#playerObserver = new MutationObserver((records) => {
      let relevant = false;
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (!(node instanceof Element) || node === this.#ownMedia) continue;
          if (node.localName === 'media-container' || MEDIA_TAGS.has(node.localName)) relevant = true;
          else if (node.querySelector('media-container, video, hls-video')) relevant = true;
        }
      }
      if (!relevant) return;
      this.#appliedKey = null;
      this.requestUpdate();
    });
    this.#playerObserver.observe(player, { childList: true, subtree: true });
  }

  // Item switch (contract steps 1-5 from types.ts) -----------------------

  #applyItem(player: PlayerLike, item: PlaylistItem, index: number): void {
    const store = player.store;
    const playback = store ? selectPlayback(store.state) : undefined;
    const source = store ? selectSource(store.state) : undefined;
    const time = store ? selectTime(store.state) : undefined;

    // Leaving the previous item: persist its position and remember whether it was playing.
    this.#saveNow();
    const switching = this.#appliedItem !== null && this.#appliedItem.src !== item.src;
    this.#resumePlaying = switching && playback ? !playback.paused || playback.ended : false;
    this.#previousSrc = switching ? (source?.currentSrc ?? '') : '';
    const hadPrevious = this.#appliedItem !== null;
    this.#appliedItem = item;
    this.#appliedIndex = index;

    // 1. Title and poster on the player.
    player.setAttribute('content-title', item.title);
    if (item.poster) player.setAttribute('poster', item.poster);
    else player.removeAttribute('poster');

    // 2 + 3. Media element and its tracks.
    const container = player.querySelector('media-container');
    const previousMedia = container ? findMedia(container) : null;
    const sameSrc = hadPrevious && previousMedia?.getAttribute('src') === item.src;
    this.#applyMedia(player, item);

    // 4. Skip segments. Applied once the new source is attached so the new
    // segments never run against the old item's time (see #onStoreChange).
    this.#pendingSegments = item.segments ?? [];
    if (sameSrc) this.#applySegments(player, true);

    // 5. Notify.
    this.#emit('caramel-playlist-change', { item, index } satisfies PlaylistChangeDetail);

    // Resume bookkeeping for the new item.
    this.#pendingRestore = this.#storage ? readResume(this.#storage, this.#key(item)) : null;
    this.#lastSavedAt = null;
    this.#lastPaused = null;
    this.#lastEnded = false;
    if (sameSrc) {
      // Same source as the previous item: nothing reloads, so restart by hand
      // and keep playing when the previous item was playing or had ended.
      this.#awaitingSource = false;
      const resume = restoreTime(this.#pendingRestore, time?.duration);
      this.#pendingRestore = null;
      time?.seek(resume ?? 0).catch(noop);
      if (playback && (!playback.paused || playback.ended)) playback.play().catch(noop);
    } else {
      this.#awaitingSource = true;
    }
  }

  /** Step 4 of the contract: hands the item's segments to the skip element. */
  #applySegments(player: PlayerLike, reset: boolean): void {
    const segments = this.#pendingSegments;
    if (segments === null) return;
    this.#pendingSegments = null;
    const skip = player.querySelector('caramel-skip-segments') as
      | (Element & { segments?: unknown; reset?: () => void })
      | null;
    if (!skip) return;
    if (reset) skip.reset?.();
    skip.segments = segments;
  }

  /** Language the chapters track follows: nearest `lang`, then `<html lang>`. */
  #currentLang(): string | null {
    const lang = langOf(this.closest('[lang]')) || document.documentElement.lang || null;
    this.#appliedLang = lang;
    return lang;
  }

  /** Swaps the chapters track when the page language changes (per-language chapters only). */
  #observeLang(): void {
    if (this.#langObserver || typeof MutationObserver === 'undefined') return;
    this.#langObserver = new MutationObserver(() => {
      const item = this.#appliedItem;
      const player = this.#player;
      if (!item || !player || typeof item.chapters !== 'object') return;
      const previous = this.#appliedLang;
      const next = langOf(this.closest('[lang]')) || document.documentElement.lang || null;
      if (next === previous) return;
      const container = player.querySelector('media-container');
      const media = container ? findMedia(container) : null;
      if (!media) return;
      const tracks = buildTracks(item, this.#currentLang());
      for (const track of Array.from(media.children)) if (track.localName === 'track') track.remove();
      media.append(...tracks);
    });
    const targets = new Set<Element>([document.documentElement]);
    const scoped = this.closest('[lang]');
    if (scoped) targets.add(scoped);
    for (const target of targets) this.#langObserver.observe(target, { attributes: true, attributeFilter: ['lang'] });
  }

  #applyMedia(player: PlayerLike, item: PlaylistItem): void {
    const container = player.querySelector('media-container');
    if (!container) return;
    const old = findMedia(container);
    const tag = mediaTagFor(item);
    const tracks = buildTracks(item, this.#currentLang());
    const src = resolveMediaSrc(item.src, tag);

    if (old && old.localName === tag) {
      const sameSrc = old.getAttribute('src') === src;
      const oldTracks = Array.from(old.children).filter((child) => child.localName === 'track');
      if (!sameSrc || !tracksEqual(oldTracks, tracks)) {
        for (const track of oldTracks) track.remove();
        old.append(...tracks);
      }
      if (!sameSrc) old.setAttribute('src', src);
      return;
    }

    if (
      tag === 'hls-video' &&
      typeof customElements !== 'undefined' &&
      !customElements.get('hls-video') &&
      !warnedHls
    ) {
      warnedHls = true;
      console.warn("<caramel-playlist>: <hls-video> is not registered. Add `import '@videojs/html/media/hls-video'`.");
    }

    // Tag mismatch: swap the element in place, keeping the host's media attributes.
    if (!old) return;
    const media = document.createElement(tag);
    for (const name of COPIED_MEDIA_ATTRIBUTES) {
      const value = old.getAttribute(name);
      if (value !== null) media.setAttribute(name, value);
    }
    media.append(...tracks);
    media.setAttribute('src', src);
    this.#ownMedia = media;
    // Insert at the same position first so the player sees a media element at all times.
    old.before(media);
    (old as Partial<HTMLMediaElement>).pause?.();
    old.remove();
  }

  // Store subscription: resume, progress saving, auto advance -------------

  #onStoreChange(): void {
    const store = this.#player?.store;
    const item = this.#appliedItem;
    if (!store || !item) return;
    const state = store.state;
    const time = selectTime(state);
    const playback = selectPlayback(state);
    if (!time || !playback) return;

    if (this.#awaitingSource) {
      const src = selectSource(state)?.currentSrc ?? '';
      const attached = store.target !== null && store.target !== undefined;
      const fresh = src !== '' && (src !== this.#previousSrc || this.#previousSrc === '');
      if (!attached || !fresh || !(time.duration > 0)) return;
      this.#awaitingSource = false;
      if (this.#player) this.#applySegments(this.#player, false);
      const at = restoreTime(this.#pendingRestore, time.duration);
      this.#pendingRestore = null;
      if (at !== null) time.seek(at).catch(noop);
      if (this.#resumePlaying) {
        this.#resumePlaying = false;
        playback.play().catch(noop);
      }
      this.#lastPaused = playback.paused;
      this.#lastEnded = playback.ended;
      return;
    }

    const key = this.#key(item);

    if (playback.ended && !this.#lastEnded) {
      this.#lastEnded = true;
      this.#lastPaused = playback.paused;
      clearResume(this.#storage, key);
      this.#advanceAfterEnd(item, time, playback);
      return;
    }
    this.#lastEnded = playback.ended;

    if (playback.ended) {
      this.#lastPaused = playback.paused;
      return;
    }

    const now = Date.now();
    if (playback.paused && this.#lastPaused === false) {
      // Pause: save right away, ignoring the throttle.
      saveResume(this.#storage, key, time.currentTime, time.duration, now);
      this.#lastSavedAt = now;
    } else if (!playback.paused && shouldSave(this.#lastSavedAt, now)) {
      saveResume(this.#storage, key, time.currentTime, time.duration, now);
      this.#lastSavedAt = now;
    }
    this.#lastPaused = playback.paused;
  }

  #advanceAfterEnd(
    item: PlaylistItem,
    time: { seek: (t: number) => Promise<number> },
    playback: { play: () => Promise<void> },
  ): void {
    const index = this.#appliedIndex;
    if (this.#model.index !== index) return; // A selection is already pending.
    const target = this.#model.onEnded();
    if (target === null) {
      this.#emit('caramel-playlist-ended', { item, index } satisfies PlaylistEndedDetail);
      return;
    }
    if (target === index) {
      // Single item with loop: restart in place.
      time
        .seek(0)
        .then(() => playback.play())
        .catch(noop);
      return;
    }
    this.#model.select(target);
  }

  /** Saves the applied item's position now (item switch, player change, disconnect) or clears it after the end. */
  #saveNow(): void {
    const store = this.#player?.store;
    const item = this.#appliedItem;
    if (!store || !item || this.#awaitingSource || !this.#storage) return;
    const time = selectTime(store.state);
    const playback = selectPlayback(store.state);
    if (!time || !playback) return;
    const key = this.#key(item);
    if (playback.ended) clearResume(this.#storage, key);
    else saveResume(this.#storage, key, time.currentTime, time.duration);
  }

  #key(item: PlaylistItem): string {
    return resumeKey(this.#listId, item.id);
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

function isMedia(element: Element): boolean {
  return MEDIA_TAGS.has(element.localName);
}

/** First `<video>` or `<hls-video>` child of the container. */
export function findMedia(container: Element): Element | null {
  for (const child of Array.from(container.children)) {
    if (isMedia(child)) return child;
  }
  return null;
}

export interface TrackSpec {
  kind: string;
  src: string;
  srclang?: string | undefined;
  label?: string | undefined;
  default: boolean;
}

/**
 * The HLS engine resolves playlist URIs against the source URL and rejects a
 * relative one ("Invalid base URL"), so HLS sources become absolute here.
 */
export function resolveMediaSrc(src: string, tag: 'video' | 'hls-video'): string {
  if (tag !== 'hls-video' || typeof document === 'undefined') return src;
  try {
    return new URL(src, document.baseURI).href;
  } catch {
    return src;
  }
}

/** Track specs for an item, in the order they are appended: chapters, thumbnails, subtitles. */
export function trackSpecsFor(item: PlaylistItem, lang?: string | null): TrackSpec[] {
  const specs: TrackSpec[] = [];
  const chapters = chaptersUrlFor(item, lang);
  if (chapters) specs.push({ kind: 'chapters', src: chapters, default: true });
  if (item.thumbnails) specs.push({ kind: 'metadata', src: item.thumbnails, label: 'thumbnails', default: true });
  for (const sub of item.subtitles ?? []) specs.push(subtitleSpec(sub));
  return specs;
}

function subtitleSpec(sub: PlaylistSubtitle): TrackSpec {
  return { kind: 'subtitles', src: sub.src, srclang: sub.srclang, label: sub.label, default: sub.default === true };
}

function buildTracks(item: PlaylistItem, lang?: string | null): HTMLTrackElement[] {
  return trackSpecsFor(item, lang).map((spec) => {
    const track = document.createElement('track');
    track.setAttribute('kind', spec.kind);
    track.setAttribute('src', spec.src);
    if (spec.srclang) track.setAttribute('srclang', spec.srclang);
    if (spec.label) track.setAttribute('label', spec.label);
    if (spec.default) track.setAttribute('default', '');
    return track;
  });
}

function trackSignature(track: Element): string {
  return [
    track.getAttribute('kind') ?? '',
    track.getAttribute('src') ?? '',
    track.getAttribute('srclang') ?? '',
    track.getAttribute('label') ?? '',
    track.hasAttribute('default') ? '1' : '0',
  ].join('|');
}

function tracksEqual(a: readonly Element[], b: readonly Element[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((track, i) => {
    const other = b[i];
    return other !== undefined && trackSignature(track) === trackSignature(other);
  });
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-playlist': CaramelPlaylistElement;
  }
}
