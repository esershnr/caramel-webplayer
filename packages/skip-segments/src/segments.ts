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
