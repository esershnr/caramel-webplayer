import { describe, expect, it } from 'vitest';
import { SKIN_TEMPLATE } from '../src/template.js';
import { applyUid, parseOpenTag, sanitizeUid, splitAtMedia, splitContainer } from '../src/template-utils.js';
import { renderSkinHtml } from '../src/index.js';

describe('skin template', () => {
  it('has no Video.js icon elements left and uses caramel morph icons', () => {
    expect(SKIN_TEMPLATE).not.toContain('<media-icon');
    expect(SKIN_TEMPLATE).toContain('<caramel-morph-icon');
    expect(SKIN_TEMPLATE).toContain('map="data-ended:restart,data-paused:play,*:pause"');
  });

  it('tags inline icons with their name and themes the popups', () => {
    expect(SKIN_TEMPLATE).toContain('caramel-icon caramel-icon-chevron');
    expect(SKIN_TEMPLATE).toContain('caramel-icon caramel-icon-cast');
    expect(SKIN_TEMPLATE).toMatch(/<media-menu [^>]*class="[^"]*media-menu-popup[^"]*caramel-theme/);
    expect(SKIN_TEMPLATE).toMatch(/<div class="media-slider-preview-content caramel-preview-card caramel-theme">/);
    expect(SKIN_TEMPLATE).toMatch(/<media-slider-preview [^>]*overflow="clamp"/);
  });

  it('draws one morphing icon per on-screen indicator', () => {
    expect(SKIN_TEMPLATE).toContain(
      'target="media-volume-indicator" map="data-level=off:volume-off,data-level=low:volume-low,*:volume-high"',
    );
    expect(SKIN_TEMPLATE).toMatch(/target="media-status-indicator" map="data-status=captions-on:captions-on,/);
    expect(SKIN_TEMPLATE).not.toMatch(/media-volume-indicator-(high|low|off)-icon/);
    expect(SKIN_TEMPLATE).not.toMatch(/media-status-indicator-(captions|fullscreen|pip)-[a-z]+-icon/);
  });

  it('contains only placeholder ids', () => {
    expect(SKIN_TEMPLATE).not.toMatch(/vjs-[A-Za-z0-9_-]{8}-0/);
    expect(SKIN_TEMPLATE).toContain('{{uid}}-0-trigger');
  });

  it('places the drawer toggle placeholder right before the settings trigger', () => {
    const toggle = SKIN_TEMPLATE.indexOf('<caramel-drawer-toggle class="caramel-drawer-toggle" hidden>');
    const settings = SKIN_TEMPLATE.indexOf(
      'class="media-button media-settings-menu-trigger video-controls-settings-button"',
    );
    expect(toggle).toBeGreaterThan(-1);
    expect(settings).toBeGreaterThan(toggle);
    const settingsStart = SKIN_TEMPLATE.lastIndexOf('<button', settings);
    expect(SKIN_TEMPLATE.slice(0, settingsStart).endsWith('</caramel-drawer-toggle>')).toBe(true);
  });

  it('steps 5 seconds on the seek hotkeys and double taps', () => {
    for (const [keys, value] of [
      ['ArrowRight', '5'],
      ['l', '5'],
      ['ArrowLeft', '-5'],
      ['j', '-5'],
    ]) {
      expect(SKIN_TEMPLATE).toContain(`<media-hotkey keys="${keys}" action="seekStep" value="${value}">`);
    }
    expect(SKIN_TEMPLATE).toContain('<media-gesture type="doubletap" action="seekStep" region="left" value="-5">');
    expect(SKIN_TEMPLATE).toContain('<media-gesture type="doubletap" action="seekStep" region="right" value="5">');
    expect(SKIN_TEMPLATE).not.toMatch(/action="seekStep"(?! value=| region=)/);
  });

  it('places the settings pages placeholder last in the root menu content', () => {
    const placeholder = '<caramel-settings-menu class="caramel-settings-menu" hidden></caramel-settings-menu>';
    expect(SKIN_TEMPLATE).toContain(
      `</media-captions-radio-group></media-menu-content>${placeholder}</media-menu-content></media-menu>`,
    );
    expect(SKIN_TEMPLATE).toMatch(/<media-menu [^>]*data-interactive/);
  });

  it('uses the caramel speed list', () => {
    expect(SKIN_TEMPLATE).toContain('<caramel-playback-rate-radio-group class="media-menu-radio-group">');
    expect(SKIN_TEMPLATE).not.toContain('<media-playback-rate-radio-group');
  });

  it('keeps every id reference resolvable after applying a uid', () => {
    const html = applyUid(SKIN_TEMPLATE, 'caramel-x');
    const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    const refs = [...html.matchAll(/ (?:trigger|commandfor)="([^"]+)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ids.has(ref!)).toBe(true);
    expect(html).not.toContain('{{uid}}');
  });
});

describe('template utils', () => {
  it('sanitizes uids', () => {
    expect(sanitizeUid(':r0:')).toBe('caramel-r0');
    expect(sanitizeUid('«r1»')).toBe('caramel-r1');
    expect(sanitizeUid('!!')).toBe('caramel');
  });

  it('splits at the media marker and around the container', () => {
    const { before, after } = splitAtMedia(SKIN_TEMPLATE);
    expect(before.startsWith('<media-container')).toBe(true);
    expect(after.endsWith('</media-container>')).toBe(true);

    const { open, inner, close } = splitContainer(SKIN_TEMPLATE);
    expect(open).toMatch(/^<media-container [^>]+>$/);
    expect(inner).not.toContain('caramel:media');
    expect(close).toBe('</media-container>');
  });

  it('parses the container attributes', () => {
    const attrs = parseOpenTag(splitContainer(SKIN_TEMPLATE).open);
    expect(attrs['data-theme']).toBe('default');
    expect(attrs['data-preset']).toBe('video');
    expect(attrs['class']).toContain('caramel-skin');
  });

  it('renders a full html string with the media in place', () => {
    const html = renderSkinHtml('<video src="a.mp4"></video>', 'demo');
    expect(html).toContain('<media-container');
    expect(html).toContain('<video src="a.mp4"></video><media-poster');
    expect(html).toContain('id="caramel-demo-0-trigger"');
  });
});
