// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { CaramelPlaylistElement } from '../src/element.js';

if (!customElements.get('caramel-playlist')) customElements.define('caramel-playlist', CaramelPlaylistElement);

afterEach(() => {
  document.body.replaceChildren();
});

describe('playlist resume thresholds', () => {
  it('reads both attributes and falls back for missing or invalid values', () => {
    const playlist = document.createElement('caramel-playlist');
    expect(playlist.resumeMinTime).toBe(3);
    expect(playlist.resumeEndMargin).toBe(5);

    playlist.setAttribute('resume-min-time', '1.5');
    playlist.setAttribute('resume-end-margin', '0');
    document.body.append(playlist);
    expect(playlist.resumeMinTime).toBe(1.5);
    expect(playlist.resumeEndMargin).toBe(0);

    playlist.setAttribute('resume-min-time', '-2');
    playlist.setAttribute('resume-end-margin', 'not a number');
    expect(playlist.resumeMinTime).toBe(3);
    expect(playlist.resumeEndMargin).toBe(5);

    playlist.setAttribute('resume-min-time', '2');
    playlist.setAttribute('resume-end-margin', '1');
    playlist.removeAttribute('resume-min-time');
    playlist.removeAttribute('resume-end-margin');
    expect(playlist.resumeMinTime).toBe(3);
    expect(playlist.resumeEndMargin).toBe(5);
  });

  it('uses property writes immediately and keeps them across unrelated attributes', () => {
    const playlist = document.createElement('caramel-playlist');
    playlist.resumeMinTime = 7;
    playlist.resumeEndMargin = 2;
    document.body.append(playlist);
    playlist.setAttribute('list-id', 'course');
    expect(playlist.resumeMinTime).toBe(7);
    expect(playlist.resumeEndMargin).toBe(2);

    playlist.resumeMinTime = Number.NaN;
    playlist.resumeEndMargin = -1;
    expect(playlist.resumeMinTime).toBe(3);
    expect(playlist.resumeEndMargin).toBe(5);

    playlist.setAttribute('resume-min-time', '4');
    playlist.setAttribute('resume-end-margin', '3');
    expect(playlist.resumeMinTime).toBe(4);
    expect(playlist.resumeEndMargin).toBe(3);
  });
});
