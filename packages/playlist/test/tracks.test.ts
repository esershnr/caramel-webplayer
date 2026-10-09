import { describe, expect, it } from 'vitest';
import { trackSpecsFor } from '../src/element.js';
import { CaramelPlaylistElement, CaramelPlaylistPanelElement, defineCaramelPlaylist } from '../src/index.js';

describe('element modules in Node', () => {
  it('import without a DOM and define is a no-op', () => {
    expect(typeof CaramelPlaylistElement).toBe('function');
    expect(typeof CaramelPlaylistPanelElement).toBe('function');
    expect(() => defineCaramelPlaylist()).not.toThrow();
  });
});

describe('trackSpecsFor', () => {
  it('orders chapters, thumbnails, then subtitles with the contract attributes', () => {
    const specs = trackSpecsFor({
      id: 'a',
      title: 'A',
      src: 'a.mp4',
      chapters: '/ch.vtt',
      thumbnails: '/thumbs.vtt',
      subtitles: [
        { src: '/tr.vtt', srclang: 'tr', label: 'Türkçe', default: true },
        { src: '/en.vtt', srclang: 'en', label: 'English' },
      ],
    });
    expect(specs).toEqual([
      { kind: 'chapters', src: '/ch.vtt', default: true },
      { kind: 'metadata', src: '/thumbs.vtt', label: 'thumbnails', default: true },
      { kind: 'subtitles', src: '/tr.vtt', srclang: 'tr', label: 'Türkçe', default: true },
      { kind: 'subtitles', src: '/en.vtt', srclang: 'en', label: 'English', default: false },
    ]);
  });

  it('is empty for a bare item', () => {
    expect(trackSpecsFor({ id: 'a', title: 'A', src: 'a.mp4' })).toEqual([]);
  });
});
