/** Orchestration: probe, extract, tile, write VTT. */
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildLayout, type Layout } from './layout.js';
import { layoutToVtt, spriteFileName } from './vtt.js';
import { readJpegSize } from './jpeg.js';
import { extractFrames, ffprobeFor, probeDuration, tileSprite } from './ffmpeg.js';

export interface GenerateOptions {
  input: string;
  interval?: number;
  width?: number;
  columns?: number;
  quality?: number;
  maxFrames?: number;
  out?: string;
  name?: string;
  baseUrl?: string | undefined;
  ffmpeg?: string;
  ffprobe?: string | undefined;
  /** Receives progress lines. Defaults to silent. */
  log?: ((line: string) => void) | undefined;
}

export interface GenerateResult {
  layout: Layout;
  /** Absolute sprite paths in order. */
  sprites: string[];
  /** Absolute path of the VTT file. */
  vtt: string;
  /** Whether the duration came from ffprobe (true) or from the frame count (false). */
  probed: boolean;
}

const FRAME_RE = /^frame-(\d{5,})\.jpg$/;

export async function generateThumbnails(options: GenerateOptions): Promise<GenerateResult> {
  const interval = options.interval ?? 5;
  const width = options.width ?? 320;
  const columns = options.columns ?? 10;
  const quality = options.quality ?? 4;
  const maxFrames = options.maxFrames ?? 100;
  const out = path.resolve(options.out ?? './thumbs');
  const name = options.name ?? 'sprite';
  const ffmpeg = options.ffmpeg ?? 'ffmpeg';
  const ffprobe = options.ffprobe ?? ffprobeFor(ffmpeg);
  const log = options.log ?? (() => {});

  const tmp = await mkdtemp(path.join(os.tmpdir(), 'esp-gen-thumbs-'));
  try {
    log(`Probing duration with ${ffprobe}`);
    const probedDuration = await probeDuration(ffprobe, options.input);
    if (probedDuration === undefined) log('ffprobe unavailable or silent, deriving duration from frames');

    log(`Extracting frames every ${interval}s at ${width}px`);
    await extractFrames({ ffmpeg, input: options.input, interval, width, quality, dir: tmp });

    const files = (await readdir(tmp))
      .filter((f) => FRAME_RE.test(f))
      .sort((a, b) => a.localeCompare(b));
    const first = files[0];
    if (!first) throw new Error('ffmpeg produced no frames. Is the input a video?');
    const { width: frameWidth, height: frameHeight } = readJpegSize(await readFile(path.join(tmp, first)));

    // Trust the frames ffmpeg actually produced; the probed duration only decides
    // where the last cue ends.
    const layout = buildLayout({
      duration: probedDuration ?? files.length * interval,
      frames: files.length,
      interval,
      columns,
      maxFrames,
      frameWidth,
      frameHeight,
    });

    await mkdir(out, { recursive: true });
    const sprites: string[] = [];
    for (const sprite of layout.sprites) {
      const output = path.join(out, spriteFileName(name, sprite.index));
      log(`Tiling sprite ${sprite.index + 1}/${layout.sprites.length} (${sprite.count} frames)`);
      await tileSprite({
        ffmpeg,
        dir: tmp,
        startNumber: sprite.start + 1,
        count: sprite.count,
        columns,
        rows: sprite.rows,
        quality,
        output,
      });
      sprites.push(output);
    }

    const vtt = path.join(out, `${name}.vtt`);
    await writeFile(vtt, layoutToVtt(layout, { name, baseUrl: options.baseUrl }), 'utf8');
    return { layout, sprites, vtt, probed: probedDuration !== undefined };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
