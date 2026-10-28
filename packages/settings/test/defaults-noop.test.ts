// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { applyBinding, readSiteDefaults } from '../src/binder.js';
import { captionCss } from '../src/captions.js';
import { displayCss, fitBox } from '../src/display.js';
import { resolveSettings, SETTINGS_DEFAULTS } from '../src/schema.js';
// The skin's own hotkeys and gestures, so a change there that breaks the invariant fails here.
// @ts-expect-error Vite raw import; this package declares no `?raw` module type.
import skinHtml from '../../skin/src/components/videojs/video/skin.html?raw';

const colors = { white: '#fff', yellow: '#ff0', shadow: '#000', bg: '#000' };

describe('defaults', () => {
  it('with SETTINGS_DEFAULTS and no stored choice, caption and display css are empty and the binding changes nothing', () => {
    for (const boxHeight of [0, 360, 1080]) {
      for (const scope of ['', '[data-caramel-settings="a"] ']) {
        expect(captionCss({ values: SETTINGS_DEFAULTS, boxHeight, colors, scope })).toBe('');
      }
    }
    for (const box of [null, fitBox(1280, 720, '4:3')]) {
      expect(displayCss({ values: SETTINGS_DEFAULTS, box, scope: '' })).toBe('');
    }

    const root = document.createElement('video-player');
    root.innerHTML =
      `<media-container>${skinHtml as string}` +
      '<caramel-skip-segments auto-skip="recap" auto-skip-delay="2"></caramel-skip-segments>' +
      '<caramel-playlist></caramel-playlist></media-container>';
    expect(root.querySelectorAll('media-hotkey[action="seekStep"]').length).toBeGreaterThan(0);
    const before = root.outerHTML;
    expect(applyBinding(root, SETTINGS_DEFAULTS, new Set())).toEqual([]);
    expect(applyBinding(root, resolveSettings({}, readSiteDefaults(root)), new Set())).toEqual([]);
    expect(root.outerHTML).toBe(before);

    // The skin's own seek step and number keys are the schema defaults, so the panel shows what the player does.
    expect(readSiteDefaults(root)['player.seekStep']).toBe(SETTINGS_DEFAULTS['player.seekStep']);
    expect(readSiteDefaults(root)['player.numberKeys']).toBe(SETTINGS_DEFAULTS['player.numberKeys']);
  });
});
