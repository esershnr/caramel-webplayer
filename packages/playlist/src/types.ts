import type { Segment } from '@esersahiner/player-skip-segments';

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
  poster?: string | undefined;
  /** WebVTT chapters URL. */
  chapters?: string | undefined;
  /** WebVTT storyboard URL (`#xywh=` sprite cues). */
  thumbnails?: string | undefined;
  subtitles?: PlaylistSubtitle[] | undefined;
  segments?: Segment[] | undefined;
  /** Duration in seconds when known up front; used by the panel before playback. */
  duration?: number | undefined;
}

/** Media element tag for an item. */
export function mediaTagFor(item: Pick<PlaylistItem, 'src'>): 'video' | 'hls-video' {
  return /\.m3u8(\?|#|$)/i.test(item.src) ? 'hls-video' : 'video';
}
