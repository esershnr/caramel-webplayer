import { describe, expect, it } from 'vitest';
import { DEFAULTS, parseCliArgs } from '../src/args.js';

describe('parseCliArgs', () => {
  it('applies defaults', () => {
    const parsed = parseCliArgs(['video.mp4']);
    expect(parsed).toEqual({
      kind: 'run',
      options: {
        input: 'video.mp4',
        interval: DEFAULTS.interval,
        width: 240,
        columns: 10,
        quality: 4,
        maxFrames: 100,
        out: './thumbs',
        name: 'sprite',
        baseUrl: undefined,
        ffmpeg: 'ffmpeg',
        ffprobe: undefined,
      },
    });
  });

  it('parses every option', () => {
    const parsed = parseCliArgs([
      '--interval',
      '2.5',
      '--width',
      '320',
      '--columns',
      '5',
      '--quality',
      '2',
      '--max-frames',
      '50',
      '--out',
      'C:\\My Thumbs\\out',
      '--name',
      'story',
      '--base-url',
      'https://cdn.example.com/t/',
      '--ffmpeg',
      'C:\\Tools\\ffmpeg.exe',
      'https://example.com/stream.m3u8',
    ]);
    expect(parsed).toMatchObject({
      kind: 'run',
      options: {
        input: 'https://example.com/stream.m3u8',
        interval: 2.5,
        width: 320,
        columns: 5,
        quality: 2,
        maxFrames: 50,
        out: 'C:\\My Thumbs\\out',
        name: 'story',
        baseUrl: 'https://cdn.example.com/t/',
        ffmpeg: 'C:\\Tools\\ffmpeg.exe',
      },
    });
  });

  it('returns help', () => {
    expect(parseCliArgs(['--help'])).toEqual({ kind: 'help' });
    expect(parseCliArgs(['-h', 'x.mp4'])).toEqual({ kind: 'help' });
  });

  it('rejects missing input, unknown flags and bad numbers', () => {
    expect(() => parseCliArgs([])).toThrow(/Missing <input>/);
    expect(() => parseCliArgs(['a.mp4', '--bogus'])).toThrow();
    expect(() => parseCliArgs(['a.mp4', '--interval', '0'])).toThrow(/--interval/);
    expect(() => parseCliArgs(['a.mp4', '--quality', '40'])).toThrow(/--quality/);
    expect(() => parseCliArgs(['a.mp4', '--width', '1.5'])).toThrow(/--width/);
    expect(() => parseCliArgs(['a.mp4', 'b.mp4'])).toThrow(/Unexpected argument/);
  });
});
