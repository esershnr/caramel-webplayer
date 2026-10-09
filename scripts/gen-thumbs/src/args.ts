/** CLI argument parsing with node:util parseArgs. No I/O. */
import { parseArgs } from 'node:util';

export interface CliOptions {
  input: string;
  interval: number;
  width: number;
  columns: number;
  quality: number;
  maxFrames: number;
  out: string;
  name: string;
  baseUrl: string | undefined;
  ffmpeg: string;
  ffprobe: string | undefined;
}

export type ParsedArgs = { kind: 'help' } | { kind: 'run'; options: CliOptions };

export const DEFAULTS = {
  interval: 5,
  width: 320,
  columns: 10,
  quality: 4,
  maxFrames: 100,
  out: './thumbs',
  name: 'sprite',
  ffmpeg: 'ffmpeg',
} as const;

export const HELP = `Usage: caramel-gen-thumbs <input> [options]

Generate timeline thumbnail sprites and a WebVTT storyboard with ffmpeg.
<input> is a local media file or an HTTP/HLS URL.

Options:
  --interval <sec>     Seconds between thumbnails (default ${DEFAULTS.interval})
  --width <px>         Thumbnail width, height keeps the aspect ratio (default ${DEFAULTS.width})
  --columns <n>        Cells per sprite row (default ${DEFAULTS.columns})
  --quality <1-31>     JPEG quality, lower is better (default ${DEFAULTS.quality})
  --max-frames <n>     Frames per sprite sheet (default ${DEFAULTS.maxFrames})
  --out <dir>          Output directory (default ${DEFAULTS.out})
  --name <base>        Base file name, gives <base>-1.jpg and <base>.vtt (default ${DEFAULTS.name})
  --base-url <prefix>  URL prefix for image references in the VTT (default: relative names)
  --ffmpeg <path>      ffmpeg binary (default ${DEFAULTS.ffmpeg} on PATH)
  --ffprobe <path>     ffprobe binary (default: derived from --ffmpeg)
  -h, --help           Show this help
`;

function num(
  name: string,
  raw: string | undefined,
  fallback: number,
  check: (n: number) => boolean,
): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !check(n)) {
    throw new Error(`Invalid value for --${name}: ${raw}`);
  }
  return n;
}

/** Parse argv (without node and script) into options. Throws on invalid input. */
export function parseCliArgs(argv: readonly string[]): ParsedArgs {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      interval: { type: 'string' },
      width: { type: 'string' },
      columns: { type: 'string' },
      quality: { type: 'string' },
      'max-frames': { type: 'string' },
      out: { type: 'string' },
      name: { type: 'string' },
      'base-url': { type: 'string' },
      ffmpeg: { type: 'string' },
      ffprobe: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) return { kind: 'help' };
  const input = positionals[0];
  if (!input) throw new Error('Missing <input>. Pass a media file path or URL.');
  if (positionals.length > 1) throw new Error(`Unexpected argument: ${positionals[1]}`);
  const isInt = (n: number) => Number.isInteger(n) && n >= 1;
  return {
    kind: 'run',
    options: {
      input,
      interval: num('interval', values.interval, DEFAULTS.interval, (n) => n > 0),
      width: num('width', values.width, DEFAULTS.width, isInt),
      columns: num('columns', values.columns, DEFAULTS.columns, isInt),
      quality: num('quality', values.quality, DEFAULTS.quality, (n) => isInt(n) && n <= 31),
      maxFrames: num('max-frames', values['max-frames'], DEFAULTS.maxFrames, isInt),
      out: values.out ?? DEFAULTS.out,
      name: values.name ?? DEFAULTS.name,
      baseUrl: values['base-url'],
      ffmpeg: values.ffmpeg ?? DEFAULTS.ffmpeg,
      ffprobe: values.ffprobe,
    },
  };
}
