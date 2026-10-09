import { describe, expect, it } from 'vitest';
import { SKIN_TEMPLATE } from '../src/template.js';
import { applyUid, parseOpenTag, sanitizeUid, splitAtMedia, splitContainer } from '../src/template-utils.js';
import { renderSkinHtml } from '../src/index.js';

describe('skin template', () => {
  it('has no Video.js icon elements left and uses esp morph icons', () => {
    expect(SKIN_TEMPLATE).not.toContain('<media-icon');
    expect(SKIN_TEMPLATE).toContain('<esp-morph-icon');
    expect(SKIN_TEMPLATE).toContain('map="data-ended:restart,data-paused:play,*:pause"');
  });

  it('contains only placeholder ids', () => {
    expect(SKIN_TEMPLATE).not.toMatch(/vjs-[A-Za-z0-9_-]{8}-0/);
    expect(SKIN_TEMPLATE).toContain('{{uid}}-0-trigger');
  });

  it('keeps every id reference resolvable after applying a uid', () => {
    const html = applyUid(SKIN_TEMPLATE, 'esp-x');
    const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    const refs = [...html.matchAll(/ (?:trigger|commandfor)="([^"]+)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ids.has(ref!)).toBe(true);
    expect(html).not.toContain('{{uid}}');
  });
});

describe('template utils', () => {
  it('sanitizes uids', () => {
    expect(sanitizeUid(':r0:')).toBe('esp-r0');
    expect(sanitizeUid('«r1»')).toBe('esp-r1');
    expect(sanitizeUid('!!')).toBe('esp');
  });

  it('splits at the media marker and around the container', () => {
    const { before, after } = splitAtMedia(SKIN_TEMPLATE);
    expect(before.startsWith('<media-container')).toBe(true);
    expect(after.endsWith('</media-container>')).toBe(true);

    const { open, inner, close } = splitContainer(SKIN_TEMPLATE);
    expect(open).toMatch(/^<media-container [^>]+>$/);
    expect(inner).not.toContain('esp:media');
    expect(close).toBe('</media-container>');
  });

  it('parses the container attributes', () => {
    const attrs = parseOpenTag(splitContainer(SKIN_TEMPLATE).open);
    expect(attrs['data-theme']).toBe('default');
    expect(attrs['data-preset']).toBe('video');
    expect(attrs['class']).toContain('esp-skin');
  });

  it('renders a full html string with the media in place', () => {
    const html = renderSkinHtml('<video src="a.mp4"></video>', 'demo');
    expect(html).toContain('<media-container');
    expect(html).toContain('<video src="a.mp4"></video><media-poster');
    expect(html).toContain('id="esp-demo-0-trigger"');
  });
});
