import { describe, expect, it } from 'vitest';
import { previewTileWidth, tileWidthFromCue } from '../src/preview-size.js';

describe('tileWidthFromCue', () => {
  it('reads the width of a #xywh fragment', () => {
    expect(tileWidthFromCue('/thumbs/bike-1.jpg#xywh=240,0,240,136')).toBe(240);
    expect(tileWidthFromCue('https://cdn.example/v1/thumbs/sprite-1.jpg#xywh=0,0,320,180')).toBe(320);
    expect(tileWidthFromCue('sprite.jpg#xywh=pixel:0,0,256,144')).toBe(256);
  });

  it('returns null without a pixel fragment', () => {
    expect(tileWidthFromCue('frame-001.jpg')).toBeNull();
    expect(tileWidthFromCue('sprite.jpg#xywh=percent:0,0,50,50')).toBeNull();
    expect(tileWidthFromCue('sprite.jpg#xywh=0,0,0,136')).toBeNull();
  });
});

describe('previewTileWidth', () => {
  it('uses the first cue that names a tile', () => {
    expect(previewTileWidth([{ text: 'a.jpg' }, { text: 'b.jpg#xywh=0,0,240,136' }])).toBe(240);
  });

  it('is null for missing or empty tracks', () => {
    expect(previewTileWidth(undefined)).toBeNull();
    expect(previewTileWidth([])).toBeNull();
  });
});
