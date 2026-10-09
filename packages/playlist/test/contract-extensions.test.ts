import { describe, expect, it } from 'vitest';
import { normalizeItems } from '../src/model.js';
import { chaptersUrlFor, mediaTagFor } from '../src/types.js';

describe('media kind', () => {
  it('lets an explicit kind override the URL guess', () => {
    expect(mediaTagFor({ src: 'https://cdn/x/master', type: 'hls' })).toBe('hls-video');
    expect(mediaTagFor({ src: 'https://cdn/x/a.m3u8', type: 'video' })).toBe('video');
    expect(mediaTagFor({ src: 'https://cdn/x/a.m3u8' })).toBe('hls-video');
  });
});

describe('chaptersUrlFor', () => {
  const map = { chapters: { tr: '/c.tr.vtt', en: '/c.en.vtt' } };

  it('returns a plain string as is', () => {
    expect(chaptersUrlFor({ chapters: '/c.vtt' }, 'tr')).toBe('/c.vtt');
  });

  it('matches the language, then its base, then en, then the first entry', () => {
    expect(chaptersUrlFor(map, 'tr')).toBe('/c.tr.vtt');
    expect(chaptersUrlFor(map, 'tr-TR')).toBe('/c.tr.vtt');
    expect(chaptersUrlFor(map, 'de')).toBe('/c.en.vtt');
    expect(chaptersUrlFor({ chapters: { fr: '/f.vtt' } }, null)).toBe('/f.vtt');
    expect(chaptersUrlFor({ chapters: undefined }, 'tr')).toBeNull();
  });
});

describe('normalizeItems contract extensions', () => {
  it('keeps a chapters map with string URLs only and the media kind', () => {
    const [item] = normalizeItems([{ id: 'a', src: 'a', type: 'hls', chapters: { tr: '/t.vtt', en: 3 } }]);
    expect(item?.type).toBe('hls');
    expect(item?.chapters).toEqual({ tr: '/t.vtt' });
  });

  it('drops an invalid kind and an empty chapters map', () => {
    const [item] = normalizeItems([{ id: 'a', src: 'a', type: 'dash', chapters: { tr: 1 } }]);
    expect(item?.type).toBeUndefined();
    expect(item?.chapters).toBeUndefined();
  });
});
