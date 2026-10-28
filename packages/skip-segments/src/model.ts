import {
  autoSkipDelayFor,
  findActiveIndex,
  normalizeSegments,
  parseAutoSkipDelay,
  skipTarget,
  type AutoSkipConfig,
  type AutoSkipDelayConfig,
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
  /**
   * Seconds of media time to wait before an automatic skip, counted from the
   * point where playback entered the segment. 0 skips on the first tick. Default 0.
   */
  autoSkipDelay?: AutoSkipDelayConfig | undefined;
}

interface ResolvedOptions {
  autoSkip: AutoSkipConfig;
  hideAfter: number;
  rearmTolerance: number;
  autoSkipDelay: AutoSkipDelayConfig;
}

/** Playhead position that counts as "the start" for segments starting within the tolerance of 0. */
const REARM_AT_START = 0.05;

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
  /** Seconds left before the automatic skip while a countdown runs, otherwise null. */
  countdown: number | null;
  /** True while an automatic skip is counting down. */
  autoSkipPending: boolean;
}

export interface AutoSkipCountdownInput {
  /** Current media time. */
  time: number;
  /** Segment under the playhead. */
  segment: Segment;
  /** Media time at which this occurrence of the segment became active. */
  anchor: number;
  /** Configured delay in seconds. */
  delay: number;
}

export interface AutoSkipCountdown {
  /** Seconds left, or null when there is no countdown (no delay, or segment too short). */
  remaining: number | null;
  /** Whether the automatic skip should fire on this tick. */
  shouldSkip: boolean;
}

/**
 * Countdown for a delayed auto-skip, in media time. Pausing needs no special
 * case (media time stops) and neither does the playback rate (media time does
 * not depend on it). A segment with no more than `delay` seconds left after
 * the entry point is never skipped automatically: skipping it would save
 * nothing, so the button stays as a normal manual skip button.
 */
export function autoSkipCountdown({ time, segment, anchor, delay }: AutoSkipCountdownInput): AutoSkipCountdown {
  if (!(delay > 0)) return { remaining: null, shouldSkip: true };
  const from = Math.min(anchor, time);
  if (segment.end - from <= delay) return { remaining: null, shouldSkip: false };
  const remaining = delay - (time - from);
  if (remaining <= 0) return { remaining: 0, shouldSkip: true };
  return { remaining, shouldSkip: false };
}

interface Countdown {
  /** Index of the segment the countdown belongs to. */
  index: number;
  /** Media time the countdown counts from. */
  anchor: number;
}

/**
 * Pure state machine behind <caramel-skip-segments>. Feed it time updates, it tells
 * you which segment is active, whether to show the button and when to seek.
 * No DOM, no timers, fully testable.
 */
export class SkipModel {
  #segments: Segment[] = [];
  #options: ResolvedOptions;
  #activeIndex = -1;
  #lastTime: number | null = null;
  #autoSkipped = new Set<number>();
  #dismissed = new Set<number>();
  /** Entry point of the current occurrence, kept while a delayed auto-skip may run. */
  #countdown: Countdown | null = null;

  constructor(options: SkipModelOptions = {}) {
    this.#options = {
      autoSkip: options.autoSkip ?? {},
      hideAfter: options.hideAfter ?? 0,
      rearmTolerance: options.rearmTolerance ?? 0.5,
      autoSkipDelay: parseAutoSkipDelay(options.autoSkipDelay ?? 0),
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
      autoSkipDelay:
        options.autoSkipDelay === undefined ? this.#options.autoSkipDelay : parseAutoSkipDelay(options.autoSkipDelay),
    };
  }

  /**
   * Replaces the segment list and forgets per-segment state. The active
   * segment is re-derived from the last known time so a list refresh (for
   * example once the duration is known) does not report a second entry. A
   * running countdown survives when the same segment is still active.
   */
  setSegments(input: unknown, duration?: number): void {
    const previous = this.active;
    this.#segments = normalizeSegments(input, duration);
    this.#autoSkipped.clear();
    this.#dismissed.clear();
    this.#activeIndex = this.#lastTime === null ? -1 : findActiveIndex(this.#segments, this.#lastTime);
    const next = this.active;
    const same = previous && next && previous.start === next.start && previous.type === next.type;
    if (this.#countdown) {
      if (same) this.#countdown = { ...this.#countdown, index: this.#activeIndex };
      else this.#countdown = null;
    }
  }

  /** Forgets active, auto-skipped and dismissed state (new source, for example). */
  reset(): void {
    this.#activeIndex = -1;
    this.#lastTime = null;
    this.#autoSkipped.clear();
    this.#dismissed.clear();
    this.#countdown = null;
  }

  update(tick: SkipTick): SkipResult {
    const { time, duration } = tick;
    const previousTime = this.#lastTime;
    this.#lastTime = time;
    const previous = this.#activeIndex;
    const index = findActiveIndex(this.#segments, time);
    this.#activeIndex = index;

    // Rewinding before a segment re-arms its auto-skip and un-dismisses it.
    // The tolerance keeps playback jitter around the start from re-arming. A
    // segment that starts within the tolerance of 0 has no position before it,
    // so it re-arms when the playhead moves backward onto the media start (a
    // seek to 0 reports 0 exactly, with a small margin for engines that land a
    // hair later); sitting at 0 without moving does not count.
    const movedBack = previousTime !== null && time < previousTime;
    for (const i of [...this.#autoSkipped, ...this.#dismissed]) {
      const s = this.#segments[i];
      if (!s) continue;
      const limit = s.start - this.#options.rearmTolerance;
      if (limit > 0 ? time < limit : movedBack && time <= REARM_AT_START) {
        this.#autoSkipped.delete(i);
        this.#dismissed.delete(i);
      }
    }

    const active = this.#segments[index] ?? null;
    const entered = index !== previous && active ? active : null;
    const left = index !== previous && previous !== -1 ? (this.#segments[previous] ?? null) : null;

    // Leaving the segment drops its countdown without marking it skipped, so a
    // later entry counts the full delay again.
    if (this.#countdown && this.#countdown.index !== index) this.#countdown = null;

    let seekTo: number | null = null;
    let countdown: number | null = null;
    if (active && this.#options.autoSkip[active.type] && !this.#autoSkipped.has(index) && !this.#dismissed.has(index)) {
      // First tick of this occurrence (entry or a seek into it) is the anchor;
      // a back-seek inside the segment moves it back.
      const anchor = this.#countdown ? Math.min(this.#countdown.anchor, time) : time;
      this.#countdown = { index, anchor };
      const delay = autoSkipDelayFor(this.#options.autoSkipDelay, active.type);
      const state = autoSkipCountdown({ time, segment: active, anchor, delay });
      if (state.shouldSkip) {
        this.#autoSkipped.add(index);
        this.#countdown = null;
        seekTo = skipTarget(active, duration);
      } else {
        countdown = state.remaining;
      }
    }

    let visible = false;
    if (active && seekTo === null && !this.#dismissed.has(index)) {
      const elapsed = time - active.start;
      visible = countdown !== null || this.#options.hideAfter <= 0 || elapsed < this.#options.hideAfter;
    }

    return { active, visible, seekTo, entered, left, countdown, autoSkipPending: countdown !== null };
  }

  /**
   * Manual skip of the active segment. Returns the seek target or null when no
   * segment is active. Marks the segment dismissed so the button does not
   * flash while the seek settles, and auto-skipped so a tick that still lands
   * inside the segment does not skip a second time.
   */
  skip(duration: number): number | null {
    const active = this.active;
    if (!active) return null;
    this.#dismissed.add(this.#activeIndex);
    this.#autoSkipped.add(this.#activeIndex);
    this.#countdown = null;
    return skipTarget(active, duration);
  }

  /**
   * Hides the button for the active segment without seeking and cancels a
   * pending auto-skip. Rewinding before the segment re-arms both. Returns
   * false when no segment is active.
   */
  dismiss(): boolean {
    if (this.#activeIndex === -1) return false;
    this.#dismissed.add(this.#activeIndex);
    this.#countdown = null;
    return true;
  }
}
