import { describe, expect, it } from 'vitest';
import { buildLayout } from '../src/layout.js';
import { buildCues, formatTimestamp, joinUrl, layoutToVtt, serializeVtt, spriteFileName } from '../src/vtt.js';

describe('formatTimestamp', () => {
  it('formats HH:MM:SS.mmm', () => {
    expect(formatTimestamp(0)).toBe('00:00:00.000');
    expect(formatTimestamp(5)).toBe('00:00:05.000');
    expect(formatTimestamp(65.5)).toBe('00:01:05.500');
    expect(formatTimestamp(3600 + 61.001)).toBe('01:01:01.001');
    expect(formatTimestamp(36000)).toBe('10:00:00.000');
  });

  it('rounds to milliseconds and clamps negatives', () => {
    expect(formatTimestamp(1.23456)).toBe('00:00:01.235');
    expect(formatTimestamp(-1)).toBe('00:00:00.000');
  });
});

describe('spriteFileName and joinUrl', () => {
  it('numbers sprites from 1', () => {
    expect(spriteFileName('sprite', 0)).toBe('sprite-1.jpg');
    expect(spriteFileName('story', 2)).toBe('story-3.jpg');
  });

  it('joins with exactly one slash', () => {
    expect(joinUrl(undefined, 'a.jpg')).toBe('a.jpg');
    expect(joinUrl('', 'a.jpg')).toBe('a.jpg');
    expect(joinUrl('/thumbs', 'a.jpg')).toBe('/thumbs/a.jpg');
    expect(joinUrl('https://cdn.example.com/v/', 'a.jpg')).toBe('https://cdn.example.com/v/a.jpg');
  });
});

describe('buildCues and serializeVtt', () => {
  const layout = buildLayout({
    duration: 12.5,
    interval: 5,
    columns: 2,
    maxFrames: 100,
    frameWidth: 256,
    frameHeight: 160,
  });

  it('produces the exact VTT document for a small case', () => {
    expect(layoutToVtt(layout, { name: 'storyboard' })).toBe(
      [
        'WEBVTT',
        '',
        '00:00:00.000 --> 00:00:05.000',
        'storyboard-1.jpg#xywh=0,0,256,160',
        '',
        '00:00:05.000 --> 00:00:10.000',
        'storyboard-1.jpg#xywh=256,0,256,160',
        '',
        '00:00:10.000 --> 00:00:12.500',
        'storyboard-1.jpg#xywh=0,160,256,160',
        '',
      ].join('\n'),
    );
  });

  it('prefixes image URLs with the base url', () => {
    const cues = buildCues(layout, { name: 'sprite', baseUrl: 'https://cdn.example.com/thumbs' });
    expect(cues[0]?.text).toBe('https://cdn.example.com/thumbs/sprite-1.jpg#xywh=0,0,256,160');
    expect(cues.every((c) => c.text.startsWith('https://cdn.example.com/thumbs/'))).toBe(true);
  });

  it('references the right sprite across sheets', () => {
    const multi = buildLayout({
      duration: 20,
      interval: 5,
      columns: 2,
      maxFrames: 3,
      frameWidth: 10,
      frameHeight: 10,
    });
    const cues = buildCues(multi, { name: 's' });
    expect(cues.map((c) => c.text)).toEqual([
      's-1.jpg#xywh=0,0,10,10',
      's-1.jpg#xywh=10,0,10,10',
      's-1.jpg#xywh=0,10,10,10',
      's-2.jpg#xywh=0,0,10,10',
    ]);
  });

  it('ends the final cue at the duration', () => {
    const cues = buildCues(layout, { name: 'sprite' });
    expect(cues.at(-1)).toMatchObject({ start: 10, end: 12.5 });
    expect(serializeVtt(cues)).toContain('00:00:10.000 --> 00:00:12.500');
  });

  it('serializes an empty cue list as a bare header', () => {
    expect(serializeVtt([])).toBe('WEBVTT\n');
  });
});
