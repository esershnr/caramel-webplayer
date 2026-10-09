import { describe, expect, it } from 'vitest';
import { buildLadder } from '../src/ladder.js';
import { MetaError, parseMeta } from '../src/meta.js';
import { keptFrames } from '../src/encode.js';

const GOOD = `
slug: openwrt-rehber
title: { tr: OpenWrt Kurulum Rehberi, en: OpenWrt Setup Guide }
poster: "0:39"
chapters:
  - { at: "0:00", tr: Giriş, en: Introduction }
  - { at: "0:54", tr: Gereklilikler, en: Requirements }
segments:
  - { type: intro, start: "0:00", end: "0:05" }
subtitles:
  - { lang: tr, label: Türkçe, file: subs/tr.srt, default: true }
  - { lang: en, label: English, file: subs/en.srt }
`;

const ctx = { duration: 1701.68, folderName: 'openwrt-rehber', fileExists: (f: string) => f.endsWith('.srt') };

describe('parseMeta', () => {
  it('parses a valid file', () => {
    const meta = parseMeta(GOOD, ctx);
    expect(meta.slug).toBe('openwrt-rehber');
    expect(meta.poster).toBe(39);
    expect(meta.chapters.map((c) => c.at)).toEqual([0, 54]);
    expect(meta.chapters[1]?.titles).toEqual({ tr: 'Gereklilikler', en: 'Requirements' });
    expect(meta.segments).toEqual([{ type: 'intro', start: 0, end: 5 }]);
    expect(meta.subtitles[0]).toEqual({ lang: 'tr', label: 'Türkçe', file: 'subs/tr.srt', default: true });
  });

  it('lists every problem in one error', () => {
    const bad = GOOD.replace('at: "0:54"', 'at: "0:00"')
      .replace('end: "0:05"', 'end: "0:00"')
      .replace('file: subs/en.srt', 'file: subs/missing.vtt');
    let error: MetaError | null = null;
    try {
      parseMeta(bad, ctx);
    } catch (e) {
      error = e as MetaError;
    }
    expect(error).toBeInstanceOf(MetaError);
    expect(error!.problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('chapters[1] (0:00) must start after the previous chapter'),
        expect.stringContaining('segments[0] end (0:00) must be after start'),
        expect.stringContaining('subs/missing.vtt'),
      ]),
    );
  });

  it('rejects chapters and posters past the end, bad segment types and duplicate subtitle languages', () => {
    const bad = GOOD.replace('at: "0:54"', 'at: "40:00"')
      .replace('poster: "0:39"', 'poster: "1:00:00"')
      .replace('type: intro', 'type: ad')
      .replace('lang: en', 'lang: tr');
    expect(() => parseMeta(bad, ctx)).toThrow(/past the end.*\n.*past the end|chapters\[1\] starts at 40:00/s);
    try {
      parseMeta(bad, ctx);
    } catch (e) {
      const problems = (e as MetaError).problems.join('\n');
      expect(problems).toMatch(/poster 1:00:00 is past the end/);
      expect(problems).toMatch(/segments\[0\].type must be one of/);
      expect(problems).toMatch(/repeats language "tr"/);
    }
  });

  it('checks the slug against the folder and requires both titles', () => {
    const bad = GOOD.replace('slug: openwrt-rehber', 'slug: other').replace('en: OpenWrt Setup Guide', 'en: ""');
    expect(() => parseMeta(bad, ctx)).toThrow(/does not match the folder name/);
    expect(() => parseMeta(bad, ctx)).toThrow(/title.en/);
  });
});

describe('buildLadder', () => {
  const screen = { width: 1920, height: 1080, fps: 60, videoBitrate: 292_900 };

  it('keeps 1080p for text, adds one half-height fallback and drops to 30 fps when frames repeat', () => {
    const ladder = buildLadder({ ...screen, motion: 0.2 });
    expect(ladder.fps).toBe(30);
    expect(ladder.variants.map((v) => v.name)).toEqual(['1080p', '540p']);
    expect(ladder.variants[0]).toMatchObject({ width: 1920, height: 1080, crf: 22, maxrate: 1600, bufsize: 3200, audioBitrate: 128 });
    expect(ladder.variants[1]).toMatchObject({ width: 960, height: 540, maxrate: 550 });
    expect(ladder.reasons.join(' ')).toMatch(/20% of frames change/);
  });

  it('keeps 60 fps when most frames change and raises the caps', () => {
    const ladder = buildLadder({ ...screen, motion: 0.9 });
    expect(ladder.fps).toBe(60);
    expect(ladder.variants[0]?.maxrate).toBe(Math.round(1600 * 1.4));
  });

  it('never upscales and uses a three step ladder for camera content', () => {
    const ladder = buildLadder({ width: 1280, height: 720, fps: 25, videoBitrate: 4_000_000 });
    expect(ladder.fps).toBe(25);
    expect(ladder.variants.map((v) => v.name)).toEqual(['720p', '540p', '360p']);
  });

  it('honours a forced frame rate and even widths', () => {
    const ladder = buildLadder({ width: 1366, height: 768, fps: 60, videoBitrate: 500_000 }, { fps: 30 });
    expect(ladder.fps).toBe(30);
    expect(ladder.variants[0]?.name).toBe('720p');
    expect(ladder.variants[0]!.width % 2).toBe(0);
  });
});

describe('keptFrames', () => {
  it('reads the last progress counter', () => {
    expect(keptFrames('frame=  100 fps=0\rframe=  395 fps=1\rframe=  768 fps=2 q=-0.0 Lsize=N/A')).toBe(768);
    expect(keptFrames('')).toBe(0);
  });
});
