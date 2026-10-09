/** Thin wrappers around the ffmpeg and ffprobe binaries. */
import { spawn } from 'node:child_process';
import path from 'node:path';

export class MissingBinaryError extends Error {
  constructor(
    public readonly binary: string,
    public readonly lookedFor: string,
  ) {
    super(`${binary} was not found (looked for "${lookedFor}")`);
    this.name = 'MissingBinaryError';
  }
}

export class CommandError extends Error {
  constructor(
    public readonly binary: string,
    public readonly args: readonly string[],
    public readonly exitCode: number | null,
    public readonly stderrTail: string,
  ) {
    super(`${binary} exited with code ${exitCode ?? 'null'}`);
    this.name = 'CommandError';
  }
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

const TAIL_LINES = 20;

export function tail(text: string, lines = TAIL_LINES): string {
  const all = text.replace(/\r/g, '\n').split('\n').filter((l) => l.trim() !== '');
  return all.slice(-lines).join('\n');
}

/** Spawn a binary with an argument array (never a shell string). */
export function run(binary: string, args: readonly string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') reject(new MissingBinaryError(path.basename(binary), binary));
      else reject(err);
    });
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new CommandError(path.basename(binary), args, code, tail(stderr)));
    });
  });
}

/** Guess the ffprobe path from the ffmpeg path (same directory, same extension). */
export function ffprobeFor(ffmpeg: string): string {
  const dir = path.dirname(ffmpeg);
  const ext = path.extname(ffmpeg);
  const base = path.basename(ffmpeg, ext);
  const probe = base.replace(/ffmpeg/i, (m) => (m === 'FFMPEG' ? 'FFPROBE' : 'ffprobe')) + ext;
  return dir === '.' && !ffmpeg.includes(path.sep) && !ffmpeg.includes('/') ? probe : path.join(dir, probe);
}

/** Media duration in seconds via ffprobe, or undefined when ffprobe is unavailable or silent. */
export async function probeDuration(ffprobe: string, input: string): Promise<number | undefined> {
  try {
    const { stdout } = await run(ffprobe, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      input,
    ]);
    const parsed = JSON.parse(stdout) as { format?: { duration?: string } };
    const value = Number(parsed.format?.duration);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  } catch (err) {
    if (err instanceof MissingBinaryError) return undefined;
    throw err;
  }
}

export interface ExtractOptions {
  ffmpeg: string;
  input: string;
  interval: number;
  width: number;
  quality: number;
  /** Directory that receives `frame-%05d.jpg`. */
  dir: string;
}

export const FRAME_PATTERN = 'frame-%05d.jpg';

/** Extract one frame every `interval` seconds, scaled to `width` with an even height. */
export async function extractFrames(options: ExtractOptions): Promise<void> {
  const vf = `fps=1/${options.interval},scale=${options.width}:-2`;
  await run(options.ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-i',
    options.input,
    '-vf',
    vf,
    '-q:v',
    String(options.quality),
    path.join(options.dir, FRAME_PATTERN),
  ]);
}

export interface TileOptions {
  ffmpeg: string;
  /** Directory holding the extracted frames. */
  dir: string;
  /** 1-based number of the first frame file to use. */
  startNumber: number;
  /** Frames to place on this sprite. */
  count: number;
  columns: number;
  rows: number;
  quality: number;
  output: string;
}

/** Tile `count` consecutive frames into one sprite sheet. */
export async function tileSprite(options: TileOptions): Promise<void> {
  await run(options.ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-start_number',
    String(options.startNumber),
    '-i',
    path.join(options.dir, FRAME_PATTERN),
    '-vf',
    // trim keeps the tile from pulling frames that belong to the next sprite
    `trim=end_frame=${options.count},tile=${options.columns}x${options.rows}`,
    '-frames:v',
    '1',
    '-q:v',
    String(options.quality),
    options.output,
  ]);
}
