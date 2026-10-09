import type { Segment } from '@esershnr/caramel-skip-segments';

/** Subtitle track attached to a playlist item. */
export interface PlaylistSubtitle {
  /** WebVTT URL. */
  src: string;
  /** BCP 47 language tag, for example `tr`. */
  srclang: string;
  /** Human readable label shown in the captions menu. */
  label: string;
  /** Turn this track on when the item loads. */
  default?: boolean | undefined;
}

/**
 * Shared playlist item contract. Every package that touches playlists reads
 * this shape; the demos and host sites author it.
 *
 * When the current item changes, `<esp-playlist>` must update all of these
 * together, in this order:
 *   1. `content-title` and `poster` attributes on `<video-player>`.
 *   2. The media element: `src` on the existing element when its tag matches
 *      (`hls-video` for `.m3u8`, `video` otherwise), a replaced element when it
 *      does not.
 *   3. The `<track>` children of the media: chapters (`kind="chapters" default`),
 *      thumbnails (`kind="metadata" label="thumbnails" default`) and subtitles.
 *   4. `segments` on the `<esp-skip-segments>` inside the same player
 *      (`[]` when the item has none).
 *   5. A bubbling `esp-playlist-change` event with `{ item, index }`.
 * The chapter panel needs nothing: it reads `chaptersCues` from the player store,
 * which follows the chapters track.
 */
export interface PlaylistItem {
  /** Stable id, also the resume storage key suffix. */
  id: string;
  title: string;
  /** MP4 or HLS (`.m3u8`) URL. */
  src: string;
  /**
   * Media kind. `hls` renders `<hls-video>`, `video` a plain `<video>`.
   * Defaults to a guess from the URL (`.m3u8` means HLS).
   */
  type?: 'hls' | 'video' | undefined;
  poster?: string | undefined;
  /**
   * WebVTT chapters URL, or one URL per language (`{ tr: '...', en: '...' }`).
   * With a map the controller picks the player's current language (nearest
   * `lang` attribute, then `<html lang>`), falling back to `en`, then the
   * first entry, and swaps the track when the language changes.
   */
  chapters?: string | Record<string, string> | undefined;
  /** WebVTT storyboard URL (`#xywh=` sprite cues). */
  thumbnails?: string | undefined;
  subtitles?: PlaylistSubtitle[] | undefined;
  segments?: Segment[] | undefined;
  /** Duration in seconds when known up front; used by the panel before playback. */
  duration?: number | undefined;
}

/** Media element tag for an item: explicit `type` first, then the URL. */
export function mediaTagFor(item: Pick<PlaylistItem, 'src' | 'type'>): 'video' | 'hls-video' {
  if (item.type === 'hls') return 'hls-video';
  if (item.type === 'video') return 'video';
  return /\.m3u8(\?|#|$)/i.test(item.src) ? 'hls-video' : 'video';
}

/** Resolves the chapters URL for a language, or null when the item has none. */
export function chaptersUrlFor(item: Pick<PlaylistItem, 'chapters'>, lang: string | null | undefined): string | null {
  const chapters = item.chapters;
  if (!chapters) return null;
  if (typeof chapters === 'string') return chapters;
  const wanted = (lang ?? '').toLowerCase();
  const base = wanted.split('-')[0] ?? '';
  const keys = Object.keys(chapters);
  const match =
    keys.find((k) => k.toLowerCase() === wanted) ??
    keys.find((k) => k.toLowerCase().split('-')[0] === base) ??
    keys.find((k) => k.toLowerCase() === 'en') ??
    keys[0];
  return match ? (chapters[match] ?? null) : null;
}
