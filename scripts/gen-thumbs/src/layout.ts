/** Pure sprite layout math. No I/O. */

export interface LayoutInput {
  /** Media duration in seconds. */
  duration: number;
  /** Seconds between two thumbnails. */
  interval: number;
  /** Cells per sprite row. */
  columns: number;
  /** Maximum frames placed on one sprite sheet. */
  maxFrames: number;
  /** Width of one thumbnail cell in pixels. */
  frameWidth: number;
  /** Height of one thumbnail cell in pixels. */
  frameHeight: number;
  /**
   * Known number of extracted frames. When given it overrides the count derived
   * from duration and interval; the last cue then ends at `duration` when the
   * duration falls after the last frame's start, otherwise one interval later.
   */
  frames?: number | undefined;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteSplit {
  /** Zero based sprite index. */
  index: number;
  /** Global index of the first frame on this sprite. */
  start: number;
  /** Frames on this sprite. */
  count: number;
  /** Rows needed on this sprite. */
  rows: number;
}

export interface SpriteLayout extends SpriteSplit {
  /** Sprite sheet width in pixels. */
  width: number;
  /** Sprite sheet height in pixels. */
  height: number;
}

export interface FrameLayout {
  /** Global frame index. */
  index: number;
  /** Sprite that holds the frame. */
  sprite: number;
  /** Cue start in seconds. */
  start: number;
  /** Cue end in seconds, clamped to the duration. */
  end: number;
  /** Cell rectangle inside the sprite. */
  rect: Rect;
}

export interface Layout {
  duration: number;
  interval: number;
  columns: number;
  frameWidth: number;
  frameHeight: number;
  sprites: SpriteLayout[];
  frames: FrameLayout[];
}

/**
 * Number of frames ffmpeg's `fps=1/interval` filter produces: one at 0 and one
 * for every further interval that starts before the end of the media.
 */
export function frameCount(duration: number, interval: number): number {
  if (!(interval > 0)) throw new RangeError('interval must be greater than 0');
  if (!(duration > 0)) return 0;
  return Math.max(1, Math.ceil(duration / interval - 1e-9));
}

/** Rows needed to hold `count` frames with `columns` per row. */
export function rowsFor(count: number, columns: number): number {
  if (!(columns >= 1)) throw new RangeError('columns must be at least 1');
  return Math.ceil(count / columns);
}

/** Split `total` frames into sprites of at most `maxFrames` each. */
export function splitSprites(total: number, maxFrames: number, columns: number): SpriteSplit[] {
  if (!(maxFrames >= 1)) throw new RangeError('maxFrames must be at least 1');
  const sprites: SpriteSplit[] = [];
  for (let start = 0, index = 0; start < total; start += maxFrames, index++) {
    const count = Math.min(maxFrames, total - start);
    sprites.push({ index, start, count, rows: rowsFor(count, columns) });
  }
  return sprites;
}

/** Cell rectangle of local frame `i` (its position inside one sprite). */
export function cellRect(i: number, columns: number, frameWidth: number, frameHeight: number): Rect {
  if (i < 0) throw new RangeError('frame index must not be negative');
  const col = i % columns;
  const row = Math.floor(i / columns);
  return { x: col * frameWidth, y: row * frameHeight, w: frameWidth, h: frameHeight };
}

/** Even height for a target width keeping the source aspect ratio (matches ffmpeg `scale=w:-2`). */
export function derivedHeight(sourceWidth: number, sourceHeight: number, targetWidth: number): number {
  const raw = (sourceHeight * targetWidth) / sourceWidth;
  const even = Math.round(raw / 2) * 2;
  return Math.max(2, even);
}

/** Build the complete layout for a media file. */
export function buildLayout(input: LayoutInput): Layout {
  const total = input.frames ?? frameCount(input.duration, input.interval);
  const splits = splitSprites(total, input.maxFrames, input.columns);
  const lastIndex = total - 1;
  const lastNaturalEnd = total * input.interval;
  const duration =
    input.frames === undefined
      ? input.duration
      : input.duration > lastIndex * input.interval
        ? input.duration
        : lastNaturalEnd;
  const sprites: SpriteLayout[] = splits.map((s) => ({
    ...s,
    // ffmpeg's tile filter always emits a full row width and pads empty cells.
    width: input.columns * input.frameWidth,
    height: s.rows * input.frameHeight,
  }));
  const frames: FrameLayout[] = [];
  for (const sprite of sprites) {
    for (let local = 0; local < sprite.count; local++) {
      const index = sprite.start + local;
      const start = index * input.interval;
      const end = index === lastIndex ? duration : Math.min((index + 1) * input.interval, duration);
      frames.push({
        index,
        sprite: sprite.index,
        start,
        end,
        rect: cellRect(local, input.columns, input.frameWidth, input.frameHeight),
      });
    }
  }
  return {
    duration,
    interval: input.interval,
    columns: input.columns,
    frameWidth: input.frameWidth,
    frameHeight: input.frameHeight,
    sprites,
    frames,
  };
}
