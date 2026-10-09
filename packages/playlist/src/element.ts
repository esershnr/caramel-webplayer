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
import { mediaTagFor, type PlaylistItem, type PlaylistSubtitle } from './types.js';

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

function noop(): void {}

/**
 * <esp-playlist>
 *
 * Playlist controller. Renders nothing; it drives a `<video-player>`: swaps
 * the media, tracks, title, poster and skip segments when the current item
 * changes, advances on `ended`, and remembers the resume position per item.
 *
 * Place it inside the player (for example as a skin `extra`) or anywhere on
 * the page with `for="<player id>"` or the `player` property.
 *
 *   <esp-playlist for="player" items='[{"id":"a","title":"A","src":"a.mp4"}]' list-id="course-1"></esp-playlist>
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
 * Events: `esp-playlist-change` ({ item, index }), `esp-playlist-ended` ({ item, index })
 * when the last item ends and nothing follows.
 *
 * HLS items create `<hls-video>`; the host must register it with
 * `import '@videojs/html/media/hls-video'`.
 */
export class EspPlaylistElement extends Base {
  static readonly tagName = 'esp-playlist';

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
  #appliedItem: PlaylistItem | null = null;
  #appliedIndex = -1;
  /** Media element this controller created because the player had none. */
  #createdMedia: Element | null = null;
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
    this.#setItems(normalizeItems(value));
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
    this.#model.loop = value;
  }

  get autoAdvance(): boolean {
    return this.#model.autoAdvance;
  }

  set autoAdvance(value: boolean) {
    this.#model.autoAdvance = value;
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
    this.#unsubscribeModel ??= this.#model.subscribe(() => this.requestUpdate());
    this.#lookupRetries = 0;
    this.#readAttributes();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
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
    // Without a container there is nowhere to mount media. The player observer retries.
    if (!player.querySelector('media-container')) return;
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
      // Found the element, but it has not upgraded yet. Retry after definition.
      this.#waitForDefinition('video-player');
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
    this.#createdMedia = null;
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
   * (React mounts the skin's media after its elements register). A media
   * element the host adds replaces the one this controller created.
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
      if (this.#createdMedia) {
        const container = player.querySelector('media-container');
        const others = container ? Array.from(container.children).filter(isMedia) : [];
        if (others.some((el) => el !== this.#createdMedia)) {
          this.#createdMedia.remove();
          this.#createdMedia = null;
        }
      }
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

    // Leaving the previous item: persist its position and remember whether it was playing.
    this.#saveNow();
    const switching = this.#appliedItem !== null && this.#appliedItem.src !== item.src;
    this.#resumePlaying = switching && playback ? !playback.paused || playback.ended : false;
    this.#previousSrc = switching ? (source?.currentSrc ?? '') : '';
    this.#appliedItem = item;
    this.#appliedIndex = index;

    // 1. Title and poster on the player.
    player.setAttribute('content-title', item.title);
    if (item.poster) player.setAttribute('poster', item.poster);
    else player.removeAttribute('poster');

    // 2 + 3. Media element and its tracks.
    this.#applyMedia(player, item);

    // 4. Skip segments.
    const skip = player.querySelector('esp-skip-segments') as (Element & { segments?: unknown }) | null;
    if (skip) skip.segments = item.segments ?? [];

    // 5. Notify.
    this.#emit('esp-playlist-change', { item, index } satisfies PlaylistChangeDetail);

    // Resume bookkeeping for the new item.
    this.#pendingRestore = this.#storage ? readResume(this.#storage, this.#key(item)) : null;
    this.#awaitingSource = true;
    this.#lastSavedAt = null;
    this.#lastPaused = null;
    this.#lastEnded = false;
  }

  #applyMedia(player: PlayerLike, item: PlaylistItem): void {
    const container = player.querySelector('media-container');
    if (!container) return;
    const old = findMedia(container);
    const tag = mediaTagFor(item);
    const tracks = buildTracks(item);

    if (old && old.localName === tag) {
      const sameSrc = old.getAttribute('src') === item.src;
      const oldTracks = Array.from(old.children).filter((child) => child.localName === 'track');
      if (!sameSrc || !tracksEqual(oldTracks, tracks)) {
        for (const track of oldTracks) track.remove();
        old.append(...tracks);
      }
      if (!sameSrc) old.setAttribute('src', item.src);
      if (old !== this.#createdMedia) this.#createdMedia = null;
      return;
    }

    if (tag === 'hls-video' && typeof customElements !== 'undefined' && !customElements.get('hls-video')) {
      console.warn("<esp-playlist>: <hls-video> is not registered. Add `import '@videojs/html/media/hls-video'`.");
    }

    const media = document.createElement(tag);
    if (old) {
      for (const name of COPIED_MEDIA_ATTRIBUTES) {
        const value = old.getAttribute(name);
        if (value !== null) media.setAttribute(name, value);
      }
    } else {
      media.setAttribute('playsinline', '');
    }
    media.append(...tracks);
    media.setAttribute('src', item.src);
    this.#ownMedia = media;

    if (old) {
      // Insert at the same position first so the player sees a media element at all times.
      old.before(media);
      (old as Partial<HTMLMediaElement>).pause?.();
      old.remove();
      this.#createdMedia = old === this.#createdMedia ? media : null;
    } else {
      container.prepend(media);
      this.#createdMedia = media;
    }
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
      this.#emit('esp-playlist-ended', { item, index } satisfies PlaylistEndedDetail);
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

/** Track specs for an item, in the order they are appended: chapters, thumbnails, subtitles. */
export function trackSpecsFor(item: PlaylistItem): TrackSpec[] {
  const specs: TrackSpec[] = [];
  if (item.chapters) specs.push({ kind: 'chapters', src: item.chapters, srclang: 'tr', default: true });
  if (item.thumbnails) specs.push({ kind: 'metadata', src: item.thumbnails, label: 'thumbnails', default: true });
  for (const sub of item.subtitles ?? []) specs.push(subtitleSpec(sub));
  return specs;
}

function subtitleSpec(sub: PlaylistSubtitle): TrackSpec {
  return { kind: 'subtitles', src: sub.src, srclang: sub.srclang, label: sub.label, default: sub.default === true };
}

function buildTracks(item: PlaylistItem): HTMLTrackElement[] {
  return trackSpecsFor(item).map((spec) => {
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
    'esp-playlist': EspPlaylistElement;
  }
}
