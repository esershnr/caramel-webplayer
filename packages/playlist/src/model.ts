import type { PlaylistItem } from './types.js';

export interface PlaylistModelOptions {
  /** Wrap from the last item to the first (and back). Default false. */
  loop?: boolean | undefined;
  /** Advance to the next item when the current one ends. Default true. */
  autoAdvance?: boolean | undefined;
}

export type PlaylistListener = () => void;

/**
 * Pure queue behind <esp-playlist>. Holds the items and the current index,
 * answers navigation questions and tells the element where to go when an
 * item ends. No DOM, no timers, fully testable.
 */
export class PlaylistModel {
  #items: readonly PlaylistItem[] = [];
  #index = -1;
  #loop: boolean;
  #autoAdvance: boolean;
  readonly #listeners = new Set<PlaylistListener>();

  constructor(options: PlaylistModelOptions = {}) {
    this.#loop = options.loop ?? false;
    this.#autoAdvance = options.autoAdvance ?? true;
  }

  get items(): readonly PlaylistItem[] {
    return this.#items;
  }

  /** Current index, or -1 when the list is empty. */
  get index(): number {
    return this.#index;
  }

  get current(): PlaylistItem | null {
    return this.#items[this.#index] ?? null;
  }

  get loop(): boolean {
    return this.#loop;
  }

  set loop(value: boolean) {
    if (this.#loop === value) return;
    this.#loop = value;
    this.#notify();
  }

  get autoAdvance(): boolean {
    return this.#autoAdvance;
  }

  set autoAdvance(value: boolean) {
    this.#autoAdvance = value;
  }

  get hasNext(): boolean {
    if (this.#items.length === 0) return false;
    return this.#index < this.#items.length - 1 || this.#loop;
  }

  get hasPrevious(): boolean {
    if (this.#items.length === 0) return false;
    return this.#index > 0 || this.#loop;
  }

  /**
   * Replaces the list. `startIndex` is clamped into range; an empty list puts
   * the index at -1. Always notifies, even when nothing visibly changed, so
   * consumers can re-read item data.
   */
  setItems(items: readonly PlaylistItem[], startIndex = 0): void {
    this.#items = [...items];
    this.#index = this.#clamp(startIndex);
    this.#notify();
  }

  /** Selects by index or item id. Returns false for an unknown target. */
  select(indexOrId: number | string): boolean {
    const index = typeof indexOrId === 'number' ? indexOrId : this.indexOf(indexOrId);
    if (!Number.isInteger(index) || index < 0 || index >= this.#items.length) return false;
    if (index === this.#index) return true;
    this.#index = index;
    this.#notify();
    return true;
  }

  indexOf(id: string): number {
    return this.#items.findIndex((item) => item.id === id);
  }

  /** Index after the current one, honoring `loop`. Null at the end. */
  nextIndex(): number | null {
    if (this.#items.length === 0) return null;
    if (this.#index < this.#items.length - 1) return this.#index + 1;
    return this.#loop ? 0 : null;
  }

  /** Index before the current one, honoring `loop`. Null at the start. */
  previousIndex(): number | null {
    if (this.#items.length === 0) return null;
    if (this.#index > 0) return this.#index - 1;
    return this.#loop ? this.#items.length - 1 : null;
  }

  next(): boolean {
    const target = this.nextIndex();
    if (target === null) return false;
    this.#index = target;
    this.#notify();
    return true;
  }

  previous(): boolean {
    const target = this.previousIndex();
    if (target === null) return false;
    this.#index = target;
    this.#notify();
    return true;
  }

  /**
   * Called when the current item ended. Returns the index to advance to, or
   * null when the list is done (or auto advance is off). Does not move the
   * index itself; the element decides when to `select` it.
   */
  onEnded(): number | null {
    if (!this.#autoAdvance) return null;
    return this.nextIndex();
  }

  subscribe(listener: PlaylistListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #clamp(index: number): number {
    if (this.#items.length === 0) return -1;
    if (!Number.isFinite(index)) return 0;
    return Math.min(Math.max(Math.trunc(index), 0), this.#items.length - 1);
  }

  #notify(): void {
    for (const listener of [...this.#listeners]) listener();
  }
}

/** Filters an untrusted value (JSON attribute, property) down to valid items. */
export function normalizeItems(input: unknown): PlaylistItem[] {
  if (!Array.isArray(input)) return [];
  const items: PlaylistItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const value = raw as Record<string, unknown>;
    if (typeof value['id'] !== 'string' || typeof value['src'] !== 'string') continue;
    const item: PlaylistItem = {
      id: value['id'],
      title: typeof value['title'] === 'string' ? value['title'] : '',
      src: value['src'],
    };
    if (typeof value['poster'] === 'string') item.poster = value['poster'];
    if (typeof value['chapters'] === 'string') item.chapters = value['chapters'];
    if (typeof value['thumbnails'] === 'string') item.thumbnails = value['thumbnails'];
    if (Array.isArray(value['subtitles'])) item.subtitles = value['subtitles'] as PlaylistItem['subtitles'];
    if (Array.isArray(value['segments'])) item.segments = value['segments'] as PlaylistItem['segments'];
    if (typeof value['duration'] === 'number' && Number.isFinite(value['duration'])) item.duration = value['duration'];
    items.push(item);
  }
  return items;
}
