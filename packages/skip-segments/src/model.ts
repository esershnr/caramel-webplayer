import {
  findActiveIndex,
  normalizeSegments,
  skipTarget,
  type AutoSkipConfig,
  type Segment,
} from './segments.js';

export interface SkipModelOptions {
  autoSkip?: AutoSkipConfig | undefined;
  /**
   * Hide the button this many seconds after the segment starts. 0 keeps it
   * visible for the whole segment. Default 0.
   */
  hideAfter?: number | undefined;
  /** Seconds before a segment start at which a rewind re-arms auto-skip. Default 0.5. */
  rearmTolerance?: number | undefined;
}

interface ResolvedOptions {
  autoSkip: AutoSkipConfig;
  hideAfter: number;
  rearmTolerance: number;
}

export interface SkipTick {
  time: number;
  duration: number;
}

export interface SkipResult {
  /** Segment under the playhead, or null. */
  active: Segment | null;
  /** Whether the skip button should be shown. */
  visible: boolean;
  /** Time to seek to for an automatic skip, or null. */
  seekTo: number | null;
  /** Segment entered during this tick, if any. */
  entered: Segment | null;
  /** Segment left during this tick, if any. */
  left: Segment | null;
}

/**
 * Pure state machine behind <esp-skip-segments>. Feed it time updates, it tells
 * you which segment is active, whether to show the button and when to seek.
 * No DOM, no timers, fully testable.
 */
export class SkipModel {
  #segments: Segment[] = [];
  #options: ResolvedOptions;
  #activeIndex = -1;
  #autoSkipped = new Set<number>();
  #dismissed = new Set<number>();

  constructor(options: SkipModelOptions = {}) {
    this.#options = {
      autoSkip: options.autoSkip ?? {},
      hideAfter: options.hideAfter ?? 0,
      rearmTolerance: options.rearmTolerance ?? 0.5,
    };
  }

  get segments(): readonly Segment[] {
    return this.#segments;
  }

  get active(): Segment | null {
    return this.#segments[this.#activeIndex] ?? null;
  }

  get options(): Readonly<ResolvedOptions> {
    return this.#options;
  }

  setOptions(options: SkipModelOptions): void {
    this.#options = {
      autoSkip: options.autoSkip ?? this.#options.autoSkip,
      hideAfter: options.hideAfter ?? this.#options.hideAfter,
      rearmTolerance: options.rearmTolerance ?? this.#options.rearmTolerance,
    };
  }

  /** Replaces the segment list and forgets all per-segment state. */
  setSegments(input: unknown, duration?: number): void {
    this.#segments = normalizeSegments(input, duration);
    this.reset();
  }

  /** Forgets active, auto-skipped and dismissed state (new source, for example). */
  reset(): void {
    this.#activeIndex = -1;
    this.#autoSkipped.clear();
    this.#dismissed.clear();
  }

  update(tick: SkipTick): SkipResult {
    const { time, duration } = tick;
    const previous = this.#activeIndex;
    const index = findActiveIndex(this.#segments, time);
    this.#activeIndex = index;

    // Rewinding before a segment re-arms its auto-skip and un-dismisses it.
    for (const i of [...this.#autoSkipped, ...this.#dismissed]) {
      const s = this.#segments[i];
      if (s && time < s.start - this.#options.rearmTolerance) {
        this.#autoSkipped.delete(i);
        this.#dismissed.delete(i);
      }
    }

    const active = this.#segments[index] ?? null;
    const entered = index !== previous && active ? active : null;
    const left = index !== previous && previous !== -1 ? (this.#segments[previous] ?? null) : null;

    let seekTo: number | null = null;
    if (active && this.#options.autoSkip[active.type] && !this.#autoSkipped.has(index)) {
      this.#autoSkipped.add(index);
      seekTo = skipTarget(active, duration);
    }

    let visible = false;
    if (active && seekTo === null && !this.#dismissed.has(index)) {
      const elapsed = time - active.start;
      visible = this.#options.hideAfter <= 0 || elapsed < this.#options.hideAfter;
    }

    return { active, visible, seekTo, entered, left };
  }

  /**
   * Manual skip of the active segment. Returns the seek target or null when no
   * segment is active. Marks the segment dismissed so the button does not
   * flash while the seek settles.
   */
  skip(duration: number): number | null {
    const active = this.active;
    if (!active) return null;
    this.#dismissed.add(this.#activeIndex);
    return skipTarget(active, duration);
  }

  /** Hides the button for the active segment without seeking. */
  dismiss(): void {
    if (this.#activeIndex !== -1) this.#dismissed.add(this.#activeIndex);
  }
}
