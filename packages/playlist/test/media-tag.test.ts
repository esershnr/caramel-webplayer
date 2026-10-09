import { describe, expect, it } from 'vitest';
import { formatDuration } from '../src/format.js';
import { mediaTagFor } from '../src/types.js';

describe('mediaTagFor', () => {
  it('picks hls-video for m3u8 urls', () => {
    expect(mediaTagFor({ src: 'https://x/stream.m3u8' })).toBe('hls-video');
    expect(mediaTagFor({ src: 'https://x/stream.M3U8?token=1' })).toBe('hls-video');
    expect(mediaTagFor({ src: '/a/b.m3u8#t=10' })).toBe('hls-video');
  });

  it('picks video for everything else', () => {
    expect(mediaTagFor({ src: 'https://x/clip.mp4' })).toBe('video');
    expect(mediaTagFor({ src: 'https://x/clip.m3u8.mp4' })).toBe('video');
    expect(mediaTagFor({ src: 'https://x/m3u8/clip.mp4' })).toBe('video');
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3599.6)).toBe('1:00:00');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('returns an empty string for unknown values', () => {
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(Number.NaN)).toBe('');
    expect(formatDuration(-1)).toBe('');
  });
});
