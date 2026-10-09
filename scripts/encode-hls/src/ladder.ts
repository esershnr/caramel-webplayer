/** Source facts the ladder is derived from (from ffprobe plus a motion sample). */
export interface SourceInfo {
  width: number;
  height: number;
  fps: number;
  /** Video bitrate in bits per second (0 when unknown). */
  videoBitrate: number;
  /**
   * Share of frames that differ from the previous one (0 to 1) measured with
   * ffmpeg's mpdecimate on a few samples. Undefined when not measured.
   */
  motion?: number | undefined;
}

export interface Variant {
  name: string;
  width: number;
  height: number;
  fps: number;
  crf: number;
  /** kbps */
  maxrate: number;
  /** kbps */
  bufsize: number;
  /** kbps, AAC stereo */
  audioBitrate: number;
}

export interface Ladder {
  variants: Variant[];
  fps: number;
  /** Human readable reasons, one per decision. */
  reasons: string[];
}

/** Bitrate caps per height for screen content (text) and for camera content. */
const CAPS_SCREEN: Record<number, number> = { 2160: 6000, 1440: 3500, 1080: 1600, 720: 900, 540: 550, 360: 350 };
const CAPS_CAMERA: Record<number, number> = { 2160: 12000, 1440: 8000, 1080: 4500, 720: 2500, 540: 1400, 360: 800 };
const HEIGHTS = [2160, 1440, 1080, 720, 540, 360];

function even(n: number): number {
  return Math.round(n / 2) * 2;
}

/**
 * Builds the rendition ladder from the source. Never exceeds the source
 * resolution, never raises the bitrate above what the content needs, keeps
 * the top rendition at the source height so text stays readable, and halves
 * the frame rate when most frames repeat (screen recordings).
 */
export function buildLadder(source: SourceInfo, options: { fps?: 'auto' | number | undefined } = {}): Ladder {
  const reasons: string[] = [];
  const screenLike = source.videoBitrate > 0 && source.videoBitrate < 1_000_000;
  reasons.push(
    screenLike
      ? `source video is ${Math.round(source.videoBitrate / 1000)} kbps at ${source.height}p: treated as screen content (text), low bitrate caps`
      : `source video is ${Math.round(source.videoBitrate / 1000)} kbps at ${source.height}p: treated as camera content`,
  );

  let fps = source.fps;
  if (typeof options.fps === 'number') {
    fps = options.fps;
    reasons.push(`frame rate forced to ${fps} fps`);
  } else if (source.fps > 30) {
    if (source.motion === undefined) {
      fps = 30;
      reasons.push(`source is ${source.fps} fps but motion was not measured: using 30 fps`);
    } else if (source.motion < 0.5) {
      fps = 30;
      reasons.push(
        `only ${Math.round(source.motion * 100)}% of frames change: ${source.fps} fps adds no information, using 30 fps`,
      );
    } else {
      reasons.push(`${Math.round(source.motion * 100)}% of frames change: keeping ${source.fps} fps`);
    }
  }

  const caps = screenLike ? CAPS_SCREEN : CAPS_CAMERA;
  const top = HEIGHTS.find((h) => h <= source.height) ?? 360;
  // Screen content: the source height plus one readable fallback about half
  // the height. Camera content: a standard three step ladder.
  const heights = screenLike
    ? [top, ...HEIGHTS.filter((h) => h <= top / 2).slice(0, 1)]
    : HEIGHTS.filter((h) => h <= top).slice(0, 3);
  reasons.push(`renditions: ${heights.map((h) => `${h}p`).join(', ')} (source ${source.height}p, never upscaled)`);

  const aspect = source.width / source.height;
  const variants = heights.map((height, i) => {
    const cap = caps[height] ?? 1000;
    const fpsFactor = fps > 30 ? 1.4 : 1;
    const maxrate = Math.round(cap * fpsFactor);
    return {
      name: `${height}p`,
      width: even(height * aspect),
      height,
      fps,
      crf: i === 0 ? 22 : 23,
      maxrate,
      bufsize: maxrate * 2,
      audioBitrate: i === 0 ? 128 : 96,
    };
  });
  return { variants, fps, reasons };
}
