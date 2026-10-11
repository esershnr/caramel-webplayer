import { createElement, type JSX } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Playlist } from '../src/react.js';

describe('React playlist resume thresholds', () => {
  it('forwards configured values, including zero, to the custom element', () => {
    const html = renderToStaticMarkup(createElement(Playlist, { items: [], resumeMinTime: 1.5, resumeEndMargin: 0 }));
    expect(html).toContain('resume-min-time="1.5"');
    expect(html).toContain('resume-end-margin="0"');
  });

  it('leaves the element defaults in place when no thresholds are passed', () => {
    const html = renderToStaticMarkup(createElement(Playlist, { items: [] }));
    expect(html).not.toContain('resume-min-time=');
    expect(html).not.toContain('resume-end-margin=');
  });

  it('types raw custom element attributes for React consumers', () => {
    const attributes: JSX.IntrinsicElements['caramel-playlist'] = {
      'resume-min-time': '1',
      'resume-end-margin': '2',
    };
    const html = renderToStaticMarkup(createElement('caramel-playlist', attributes));
    expect(html).toContain('resume-min-time="1"');
    expect(html).toContain('resume-end-margin="2"');
  });
});
