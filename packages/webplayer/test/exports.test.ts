import { describe, expect, it } from 'vitest';
import * as webplayer from '../src/index.js';

describe('@esershnr/caramel-webplayer', () => {
  it('re-exports the pure helpers of every package', () => {
    expect(typeof webplayer.resolveTheme).toBe('function'); // theme
    expect(typeof webplayer.iconToSvg).toBe('function'); // icons
    expect(typeof webplayer.renderSkinHtml).toBe('function'); // skin
    expect(typeof webplayer.normalizeSegments).toBe('function'); // skip-segments
    expect(typeof webplayer.formatTime).toBe('function'); // chapters
    expect(typeof webplayer.PlaylistModel).toBe('function'); // playlist
    expect(typeof webplayer.swipeDecision).toBe('function'); // drawer
  });

  it('keeps both findActiveIndex helpers under explicit names', () => {
    expect(typeof webplayer.findActiveSegmentIndex).toBe('function');
    expect(typeof webplayer.findActiveChapterIndex).toBe('function');
    expect(webplayer.findActiveSegmentIndex).not.toBe(webplayer.findActiveChapterIndex);
  });
});

describe('hand-written re-export lists', () => {
  it('cover every runtime export of skip-segments and chapters', async () => {
    const segments = await import('@esershnr/caramel-skip-segments');
    const chapters = await import('@esershnr/caramel-chapters');
    for (const mod of [segments, chapters]) {
      for (const name of Reflect.ownKeys(mod)) {
        if (typeof name !== 'string' || name === 'findActiveIndex') continue;
        expect(webplayer, name).toHaveProperty(name);
      }
    }
  });
});
