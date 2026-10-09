import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateThumbnails, probeDuration, ffprobeFor, run } from '@esersahiner/gen-thumbs';
import { chaptersToVtt } from './chapters.js';
import { buildLadder, type Ladder, type SourceInfo, type Variant } from './ladder.js';
import { parseMeta, type Meta } from './meta.js';
import { srtToVtt } from './srt.js';

export interface EncodeOptions {
  /** `media/<slug>` folder. */
  input: string;
  /** Public URL prefix for every file, ends with `/`. */
  baseUrl: string;
  /** Output root, default `out`. */
  outRoot?: string | undefined;
  ffmpeg?: string | undefined;
  ffprobe?: string | undefined;
  /** `auto` (measure motion), or a number. */
  fps?: 'auto' | number | undefined;
  /** x264 preset, default `medium`. */
  preset?: string | undefined;
  /** Thumbnail interval in seconds, default 10. */
  thumbInterval?: number | undefined;
  /** Skip the HLS encode (everything else is written). */
  skipVideo?: boolean | undefined;
  log?: ((line: string) => void) | undefined;
}

export interface EncodeResult {
  outDir: string;
  manifestPath: string;
  manifest: Record<string, unknown>;
  ladder: Ladder;
  files: string[];
}

const SOURCE_NAMES = ['source.mp4', 'source.mkv', 'source.mov', 'source.webm', 'source.m4v', 'source.ts'];

export function findSource(folder: string): string {
  for (const name of SOURCE_NAMES) {
    const candidate = path.join(folder, name);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`no source video in ${folder} (looked for ${SOURCE_NAMES.join(', ')})`);
}

interface Probe extends SourceInfo {
  duration: number;
  audioCodec: string | null;
}

async function probeSource(ffprobe: string, input: string): Promise<Probe> {
  const { stdout } = await run(ffprobe, [
    '-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate,bit_rate',
    '-of', 'json', input,
  ]);
  const data = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: { codec_type: string; codec_name?: string; width?: number; height?: number; avg_frame_rate?: string; bit_rate?: string }[];
  };
  const video = data.streams?.find((s) => s.codec_type === 'video');
  const audio = data.streams?.find((s) => s.codec_type === 'audio');
  if (!video || !video.width || !video.height) throw new Error('the source has no video stream');
  const [num, den] = (video.avg_frame_rate ?? '30/1').split('/').map(Number);
  const fps = den ? num! / den : num!;
  return {
    width: video.width,
    height: video.height,
    fps: Math.round(fps * 1000) / 1000,
    videoBitrate: Number(video.bit_rate ?? 0) || 0,
    duration: Number(data.format?.duration ?? 0),
    audioCodec: audio?.codec_name ?? null,
  };
}

/**
 * Share of frames that differ from the previous one (0 to 1), measured with
 * mpdecimate on three 20 second samples spread over the video. mpdecimate
 * drops frames that are near duplicates of the previous frame; the last
 * `frame=` counter in ffmpeg's progress output is the number it kept.
 */
export async function measureMotion(ffmpeg: string, input: string, duration: number, fps: number): Promise<number> {
  const sample = 20;
  const offsets = [0.1, 0.4, 0.75].map((f) => Math.max(0, Math.floor(duration * f)));
  let kept = 0;
  for (const ss of offsets) {
    const { stderr } = await run(ffmpeg, [
      '-v', 'info', '-ss', String(ss), '-t', String(sample), '-i', input,
      '-vf', 'mpdecimate=hi=768:lo=320:frac=0.33', '-an', '-f', 'null', '-',
    ]);
    kept += keptFrames(stderr);
  }
  return Math.min(1, kept / (offsets.length * sample * fps));
}

/** Last `frame=N` counter in ffmpeg progress output. */
export function keptFrames(stderr: string): number {
  const frames = [...stderr.matchAll(/frame=\s*(\d+)/g)].map((m) => Number(m[1]));
  return frames.length ? frames[frames.length - 1]! : 0;
}

function variantArgs(v: Variant, index: number, preset: string): string[] {
  return [
    `-map`, `[v${index}]`, `-map`, `0:a:0`,
    `-c:v:${index}`, 'libx264', `-preset:v:${index}`, preset, `-profile:v:${index}`, 'high',
    `-crf:v:${index}`, String(v.crf), `-maxrate:v:${index}`, `${v.maxrate}k`, `-bufsize:v:${index}`, `${v.bufsize}k`,
    `-g:v:${index}`, String(v.fps * 2), `-keyint_min:v:${index}`, String(v.fps * 2), `-sc_threshold:v:${index}`, '0',
    `-pix_fmt:v:${index}`, 'yuv420p', `-tune:v:${index}`, 'film',
    `-c:a:${index}`, 'aac', `-b:a:${index}`, `${v.audioBitrate}k`, `-ac:a:${index}`, '2',
  ];
}

export async function encode(options: EncodeOptions): Promise<EncodeResult> {
  const log = options.log ?? (() => {});
  const ffmpeg = options.ffmpeg ?? 'ffmpeg';
  const ffprobe = options.ffprobe ?? ffprobeFor(ffmpeg);
  const folder = path.resolve(options.input);
  const baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
  const source = findSource(folder);
  const metaPath = path.join(folder, 'meta.yaml');
  if (!existsSync(metaPath)) throw new Error(`${metaPath} not found`);

  log(`Probing ${path.basename(source)}`);
  const probe = await probeSource(ffprobe, source);
  const duration = probe.duration || (await probeDuration(ffprobe, source)) || 0;
  if (!(duration > 0)) throw new Error('could not read the video duration');

  const meta: Meta = parseMeta(readFileSync(metaPath, 'utf8'), {
    duration,
    folderName: path.basename(folder),
    fileExists: (rel) => existsSync(path.join(folder, rel)),
  });

  const outDir = path.resolve(options.outRoot ?? 'out', meta.slug);
  mkdirSync(path.join(outDir, 'subs'), { recursive: true });
  mkdirSync(path.join(outDir, 'thumbs'), { recursive: true });
  const files: string[] = [];
  const url = (rel: string) => baseUrl + rel.split(path.sep).join('/');

  // Frame rate decision -----------------------------------------------------
  let motion: number | undefined;
  if (options.fps === undefined || options.fps === 'auto') {
    if (probe.fps > 30) {
      log('Measuring motion (three 20 s samples)');
      motion = await measureMotion(ffmpeg, source, duration, probe.fps);
    }
  }
  const ladder = buildLadder({ ...probe, motion }, { fps: typeof options.fps === 'number' ? options.fps : undefined });
  for (const reason of ladder.reasons) log(`  ${reason}`);

  // HLS ---------------------------------------------------------------------
  if (!options.skipVideo) {
    const filters = ladder.variants
      .map((v, i) => `[s${i}]scale=w=${v.width}:h=${v.height}:flags=lanczos[v${i}]`)
      .join(';');
    const split = `[0:v]fps=${ladder.fps},split=${ladder.variants.length}${ladder.variants.map((_, i) => `[s${i}]`).join('')}`;
    const args = [
      '-y', '-hide_banner', '-v', 'warning', '-stats', '-i', source,
      '-filter_complex', `${split};${filters}`,
      ...ladder.variants.flatMap((v, i) => variantArgs(v, i, options.preset ?? 'medium')),
      '-var_stream_map', ladder.variants.map((v, i) => `v:${i},a:${i},name:${v.name}`).join(' '),
      '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
      '-hls_flags', 'single_file+independent_segments', '-master_pl_name', 'master.m3u8',
      '-hls_segment_filename', path.join(outDir, '%v', 'stream.m4s'),
      path.join(outDir, '%v', 'stream.m3u8'),
    ];
    for (const v of ladder.variants) mkdirSync(path.join(outDir, v.name), { recursive: true });
    log(`Encoding ${ladder.variants.map((v) => `${v.name}@${v.maxrate}k`).join(' + ')} at ${ladder.fps} fps (this takes a while)`);
    await run(ffmpeg, args);
    files.push('master.m3u8', ...ladder.variants.flatMap((v) => [`${v.name}/stream.m3u8`, `${v.name}/stream.m4s`]));
  }

  // Poster ------------------------------------------------------------------
  const posterAt = meta.poster ?? Math.min(duration / 10, 30);
  log(`Poster at ${posterAt.toFixed(1)} s`);
  await run(ffmpeg, ['-y', '-v', 'error', '-ss', String(posterAt), '-i', source, '-frames:v', '1', '-q:v', '3', '-vf', 'scale=1920:-2', path.join(outDir, 'poster.jpg')]);
  files.push('poster.jpg');

  // Thumbnails --------------------------------------------------------------
  log('Thumbnails (gen-thumbs)');
  const thumbs = await generateThumbnails({
    input: source,
    interval: options.thumbInterval ?? 10,
    width: 240,
    columns: 10,
    out: path.join(outDir, 'thumbs'),
    name: 'sprite',
    baseUrl: url('thumbs'),
    ffmpeg,
    ffprobe,
  });
  files.push(...thumbs.sprites.map((f) => `thumbs/${path.basename(f)}`));
  // The storyboard gets the contract name; the sprite images keep theirs.
  writeFileSync(path.join(outDir, 'thumbs', 'thumbnails.vtt'), readFileSync(thumbs.vtt));
  rmSync(thumbs.vtt, { force: true });
  files.push('thumbs/thumbnails.vtt');

  // Chapters, subtitles, segments -------------------------------------------
  const chapterUrls: Record<string, string> = {};
  for (const lang of ['tr', 'en']) {
    const name = `chapters.${lang}.vtt`;
    writeFileSync(path.join(outDir, name), chaptersToVtt(meta.chapters, lang, duration));
    chapterUrls[lang] = url(name);
    files.push(name);
  }
  const subtitles = meta.subtitles.map((sub) => {
    const name = `subs/${sub.lang}.vtt`;
    writeFileSync(path.join(outDir, name), srtToVtt(readFileSync(path.join(folder, sub.file), 'utf8')));
    files.push(name);
    return { src: url(name), srclang: sub.lang, label: sub.label, ...(sub.default ? { default: true } : {}) };
  });
  writeFileSync(path.join(outDir, 'segments.json'), JSON.stringify(meta.segments, null, 2) + '\n');
  files.push('segments.json');

  // Manifest ----------------------------------------------------------------
  const manifest = {
    id: meta.slug,
    title: meta.title['tr'] ?? meta.slug,
    titles: meta.title,
    src: url('master.m3u8'),
    type: 'hls',
    poster: url('poster.jpg'),
    chapters: chapterUrls,
    thumbnails: url('thumbs/thumbnails.vtt'),
    subtitles,
    segments: meta.segments,
    duration: Math.round(duration * 1000) / 1000,
  };
  const manifestPath = path.join(outDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  files.push('manifest.json');

  const report = {
    source: { file: path.basename(source), ...probe, duration },
    motion,
    fps: ladder.fps,
    variants: ladder.variants,
    reasons: ladder.reasons,
    baseUrl,
    files,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(path.join(outDir, 'encode-report.json'), JSON.stringify(report, null, 2) + '\n');

  return { outDir, manifestPath, manifest, ladder, files };
}
