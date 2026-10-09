#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { CommandError, MissingBinaryError } from '@esersahiner/gen-thumbs';
import { encode } from './encode.js';
import { MetaError } from './meta.js';

const HELP = `Usage: esp-encode-hls <media/slug> --base-url <https://cdn/videos/slug/v1/> [options]

Turns media/<slug>/ (source video, subs/*.srt, meta.yaml) into out/<slug>/:
HLS (H.264 + AAC, fMP4, one file per rendition with byte-range playlists),
poster.jpg, thumbs/ sprite + thumbnails.vtt, chapters.<lang>.vtt, subs/<lang>.vtt,
segments.json and manifest.json (a PlaylistItem with absolute URLs).

Options:
  --base-url <url>     Public URL prefix written into every playlist item URL (required)
  --out <dir>          Output root (default: the out/ folder next to media/)
  --fps <auto|n>       Frame rate: auto measures motion and halves 60 fps when frames repeat (default: auto)
  --preset <name>      x264 preset (default: medium)
  --thumb-interval <s> Seconds between thumbnails (default: 10)
  --skip-video         Write everything except the HLS renditions
  --ffmpeg <path>      ffmpeg binary (default: ffmpeg on PATH)
  --ffprobe <path>     ffprobe binary (default: derived from --ffmpeg)
  -h, --help           Show this help
`;

function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'base-url': { type: 'string' },
      out: { type: 'string' },
      fps: { type: 'string' },
      preset: { type: 'string' },
      'thumb-interval': { type: 'string' },
      'skip-video': { type: 'boolean' },
      ffmpeg: { type: 'string' },
      ffprobe: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || positionals.length !== 1 || !values['base-url']) {
    process.stdout.write(HELP);
    return Promise.resolve(values.help ? 0 : 1);
  }
  const fpsRaw = values.fps ?? 'auto';
  const fps = fpsRaw === 'auto' ? 'auto' : Number(fpsRaw);
  if (fps !== 'auto' && !(fps > 0)) {
    process.stderr.write(`--fps must be "auto" or a positive number\n`);
    return Promise.resolve(1);
  }
  return encode({
    input: positionals[0]!,
    baseUrl: values['base-url'],
    outRoot: values.out,
    fps,
    preset: values.preset,
    thumbInterval: values['thumb-interval'] ? Number(values['thumb-interval']) : undefined,
    skipVideo: values['skip-video'],
    ffmpeg: values.ffmpeg,
    ffprobe: values.ffprobe,
    log: (line) => process.stderr.write(`${line}\n`),
  }).then((result) => {
    process.stdout.write(`${result.files.length} files in ${result.outDir}\nmanifest: ${result.manifestPath}\n`);
    return 0;
  });
}

main()
  .catch((error: unknown) => {
    if (error instanceof MissingBinaryError) {
      process.stderr.write(
        `${error.message}\n\nInstall ffmpeg (ffprobe comes with it):\n  winget install Gyan.FFmpeg\n  brew install ffmpeg\n  sudo apt install ffmpeg\nor pass --ffmpeg <path>.\n`,
      );
      return 2;
    }
    if (error instanceof CommandError) {
      process.stderr.write(`${error.message}\n${error.stderrTail}\n`);
      return 1;
    }
    if (error instanceof MetaError) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
    process.stderr.write(`${(error as Error).message ?? String(error)}\n`);
    return 1;
  })
  .then((code) => {
    process.exitCode = code;
  });
