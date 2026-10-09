import { describe, expect, it } from 'vitest';
import { parseSrt, srtToVtt } from '../src/srt.js';
import { formatVttTime, parseTime } from '../src/time.js';
import { chaptersToVtt } from '../src/chapters.js';

const SRT =
  '﻿1\r\n00:00:04,899 --> 00:00:06,933\r\nSelamlar. Bu videoda size tek\r\n\r\n2\r\n00:00:06,933 --> 00:00:08,733 X1:10\r\nbir USB bellekle\r\nçevrimdışı\r\n\r\n3\r\n00:01:00,000 --> 00:01:01,000\r\n\r\n\r\n4\r\n00:01:02,5 --> 00:01:03,50\r\na --> b\r\n';

describe('srtToVtt', () => {
  it('strips the BOM, normalizes line endings and converts commas', () => {
    const vtt = srtToVtt(SRT);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).not.toContain('\r');
    expect(vtt).not.toContain('﻿');
    expect(vtt).toContain('00:00:04.899 --> 00:00:06.933\nSelamlar. Bu videoda size tek\n');
  });

  it('keeps multi-line text and cue settings, drops numbering and empty cues', () => {
    const cues = parseSrt(SRT);
    expect(cues).toHaveLength(3);
    expect(cues[1]).toEqual({
      start: '00:00:06.933',
      end: '00:00:08.733',
      settings: 'X1:10',
      text: 'bir USB bellekle\nçevrimdışı',
    });
  });

  it('pads short fractions and escapes arrows inside text', () => {
    const cues = parseSrt(SRT);
    expect(cues[2]?.start).toBe('00:01:02.500');
    expect(cues[2]?.end).toBe('00:01:03.500');
    expect(cues[2]?.text).not.toContain('-->');
  });

  it('accepts timestamps without hours', () => {
    expect(parseSrt('1\n01:02,100 --> 01:03,200\nx\n')[0]?.start).toBe('00:01:02.100');
  });
});

describe('parseTime and formatVttTime', () => {
  it('parses the accepted forms', () => {
    expect(parseTime('0:00')).toBe(0);
    expect(parseTime('1:02')).toBe(62);
    expect(parseTime('19:15')).toBe(1155);
    expect(parseTime('1:02:03')).toBe(3723);
    expect(parseTime('4.5')).toBe(4.5);
    expect(parseTime('1:02.5')).toBe(62.5);
    expect(parseTime(7)).toBe(7);
  });

  it('rejects nonsense', () => {
    expect(() => parseTime('abc')).toThrow(/not a valid time/);
    expect(() => parseTime('1:75')).toThrow();
    expect(() => parseTime(-1)).toThrow();
    expect(() => parseTime(null)).toThrow();
  });

  it('formats WebVTT timestamps', () => {
    expect(formatVttTime(0)).toBe('00:00:00.000');
    expect(formatVttTime(62.5)).toBe('00:01:02.500');
    expect(formatVttTime(3723.0004)).toBe('01:02:03.000');
    expect(formatVttTime(1.9996)).toBe('00:00:02.000');
  });
});

describe('chaptersToVtt', () => {
  const chapters = [
    { at: 0, titles: { tr: 'Giriş', en: 'Intro' } },
    { at: 54, titles: { tr: 'Gereklilikler', en: 'Requirements' } },
  ];

  it('ends each chapter at the next start and the last at the duration', () => {
    expect(chaptersToVtt(chapters, 'tr', 100)).toBe(
      'WEBVTT\n\n00:00:00.000 --> 00:00:54.000\nGiriş\n\n00:00:54.000 --> 00:01:40.000\nGereklilikler\n',
    );
  });

  it('falls back to English for a missing language', () => {
    expect(chaptersToVtt(chapters, 'de', 100)).toContain('\nIntro\n');
  });
});
