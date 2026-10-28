export const SEGMENT_TYPES = ['intro', 'recap', 'outro', 'sponsor'] as const;
export type SegmentType = (typeof SEGMENT_TYPES)[number];

export interface Segment {
  /** Start time in seconds (inclusive). */
  start: number;
  /** End time in seconds (exclusive). */
  end: number;
  type: SegmentType;
  /** Optional custom button label; overrides the translated default. */
  label?: string | undefined;
}

export type AutoSkipConfig = Partial<Record<SegmentType, boolean>>;

/** Seconds to count down before an automatic skip: one value for every type, or per type (missing types: 0). */
export type AutoSkipDelayConfig = number | Partial<Record<SegmentType, number>>;

export function isSegmentType(value: unknown): value is SegmentType {
  return typeof value === 'string' && (SEGMENT_TYPES as readonly string[]).includes(value);
}

/**
 * Validates and sorts raw segment data. Invalid entries are dropped, ends are
 * clamped to the duration when one is known, and overlapping segments of the
 * same type are merged.
 */
export function normalizeSegments(input: unknown, duration?: number): Segment[] {
  if (!Array.isArray(input)) return [];
  const clean: Segment[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const { start, end, type, label } = raw as Record<string, unknown>;
    if (typeof start !== 'number' || typeof end !== 'number' || !isSegmentType(type)) continue;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const s = Math.max(0, start);
    const e = duration && Number.isFinite(duration) && duration > 0 ? Math.min(end, duration) : end;
    if (e <= s) continue;
    const segment: Segment = { start: s, end: e, type };
    if (typeof label === 'string' && label.trim()) segment.label = label.trim();
    clean.push(segment);
  }
  clean.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Segment[] = [];
  for (const segment of clean) {
    const last = merged[merged.length - 1];
    if (last && last.type === segment.type && segment.start <= last.end) {
      last.end = Math.max(last.end, segment.end);
      if (!last.label && segment.label) last.label = segment.label;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

/** Parses the `auto-skip` attribute: a comma separated list of types, or `all`. */
export function parseAutoSkip(value: string | null | undefined): AutoSkipConfig {
  const config: AutoSkipConfig = {};
  if (!value) return config;
  for (const part of value.split(',')) {
    const type = part.trim();
    if (type === 'all' || type === '*') {
      for (const t of SEGMENT_TYPES) config[t] = true;
    } else if (isSegmentType(type)) {
      config[type] = true;
    }
  }
  return config;
}

function toDelay(value: unknown): number {
  const n = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Parses `auto-skip-delay`: `"3"` (every type), `"intro:0,outro:3"` (per type,
 * types not listed get 0), a number, or an object keyed by type. Anything
 * invalid or negative means 0.
 */
export function parseAutoSkipDelay(value: unknown): AutoSkipDelayConfig {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return toDelay(value);
  if (typeof value === 'string') {
    if (!value.includes(':')) return toDelay(value);
    const config: Partial<Record<SegmentType, number>> = {};
    for (const part of value.split(',')) {
      const [type = '', seconds = ''] = part.split(':').map((s) => s.trim());
      if (isSegmentType(type)) config[type] = toDelay(seconds);
    }
    return config;
  }
  if (typeof value === 'object') {
    const config: Partial<Record<SegmentType, number>> = {};
    for (const type of SEGMENT_TYPES) {
      const seconds = (value as Record<string, unknown>)[type];
      if (seconds !== undefined) config[type] = toDelay(seconds);
    }
    return config;
  }
  return 0;
}

/** Seconds of countdown for one segment type. */
export function autoSkipDelayFor(config: AutoSkipDelayConfig, type: SegmentType): number {
  return typeof config === 'number' ? config : (config[type] ?? 0);
}

/** Index of the segment containing `time`, or -1. */
export function findActiveIndex(segments: readonly Segment[], time: number): number {
  if (!Number.isFinite(time)) return -1;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]!;
    if (time >= s.start && time < s.end) return i;
    if (s.start > time) break;
  }
  return -1;
}

/**
 * Segment under a timeline position given as a 0 to 1 ratio of the track
 * width (the hovered point of the preview card), or null.
 */
export function segmentAtRatio(segments: readonly Segment[], ratio: number, duration: number): Segment | null {
  if (!Number.isFinite(ratio) || !Number.isFinite(duration) || duration <= 0) return null;
  const time = Math.min(1, Math.max(0, ratio)) * duration;
  return segments[findActiveIndex(segments, time)] ?? null;
}

/**
 * Where a skip lands. Never beyond the media duration. A segment that runs to
 * the very end (an outro) seeks to the end so `ended` fires and a playlist can
 * advance.
 */
export function skipTarget(segment: Segment, duration: number): number {
  if (Number.isFinite(duration) && duration > 0) return Math.min(segment.end, duration);
  return segment.end;
}

export interface SegmentGeometry {
  /** Start as a percentage of the duration, 0 to 100. */
  start: number;
  /** Width as a percentage of the duration, 0 to 100. */
  width: number;
}

/** Timeline geometry for a segment; null when the duration is unknown. */
export function segmentGeometry(segment: Segment, duration: number): SegmentGeometry | null {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const start = Math.min(100, Math.max(0, (segment.start / duration) * 100));
  const end = Math.min(100, Math.max(0, (segment.end / duration) * 100));
  return { start, width: Math.max(0, end - start) };
}

/** Drawn range of a timeline chapter, in percent of the track. */
export interface LaneRange {
  from: number;
  to: number;
}

/**
 * The part of a chapter (start and end in percent) that its track covers: the
 * skin leaves `spacing * inset` pixels free on each inner edge as the gap
 * between chapters. Gaps are ignored while the track has no width yet.
 */
export function laneRange(
  start: number,
  end: number,
  insetStart: number,
  insetEnd: number,
  spacing: number,
  width: number,
): LaneRange {
  const gap = (inset: number) => (width > 0 ? ((spacing * inset) / width) * 100 : 0);
  return { from: start + gap(insetStart), to: end - gap(insetEnd) };
}

/** True when a band reaches into the lane, past its gaps. */
export function geometryInLane(geo: SegmentGeometry, lane: LaneRange): boolean {
  return Math.min(geo.start + geo.width, lane.to) - Math.max(geo.start, lane.from) > 0;
}
