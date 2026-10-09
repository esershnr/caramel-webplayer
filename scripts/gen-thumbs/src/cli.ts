#!/usr/bin/env node
import { HELP, type ParsedArgs, parseCliArgs } from './args.js';
import { CommandError, MissingBinaryError } from './ffmpeg.js';
import { generateThumbnails } from './generate.js';

const INSTALL_HINT = `Install ffmpeg (it ships ffprobe too):
  Windows:  winget install Gyan.FFmpeg
  macOS:    brew install ffmpeg
  Debian:   sudo apt install ffmpeg
Or pass the binary explicitly with --ffmpeg <path> (and --ffprobe <path>).`;

async function main(argv: string[]): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseCliArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${HELP}`);
    return 1;
  }
  if (parsed.kind === 'help') {
    process.stdout.write(HELP);
    return 0;
  }
  const o = parsed.options;
  try {
    const result = await generateThumbnails({
      input: o.input,
      interval: o.interval,
      width: o.width,
      columns: o.columns,
      quality: o.quality,
      maxFrames: o.maxFrames,
      out: o.out,
      name: o.name,
      baseUrl: o.baseUrl,
      ffmpeg: o.ffmpeg,
      ffprobe: o.ffprobe,
      log: (line) => process.stderr.write(`${line}\n`),
    });
    const frames = result.layout.frames.length;
    const size = `${result.layout.frameWidth}x${result.layout.frameHeight}`;
    process.stdout.write(
      `${frames} frames (${size}) in ${result.sprites.length} sprite${result.sprites.length === 1 ? '' : 's'}, vtt: ${result.vtt}\n`,
    );
    return 0;
  } catch (err) {
    if (err instanceof MissingBinaryError) {
      process.stderr.write(
        `Error: ${err.binary} was not found. Looked for "${err.lookedFor}" on PATH.\n${INSTALL_HINT}\n`,
      );
      return 2;
    }
    if (err instanceof CommandError) {
      process.stderr.write(`Error: ${err.message}\n${err.stderrTail}\n`);
      return 1;
    }
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    return 1;
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    process.exitCode = 1;
  },
);
