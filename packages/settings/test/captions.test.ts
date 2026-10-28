import { afterEach, describe, expect, it } from 'vitest';
import {
  type CaptionColors,
  captionCss,
  captionFontFamily,
  getCaptionFonts,
  registerCaptionFont,
  resetCaptionFonts,
} from '../src/captions.js';
import { BUILTIN_CAPTION_FONTS, SETTINGS_DEFAULTS, type SettingsValues } from '../src/schema.js';

/** Text and shadow colors only; the box color joins in its own test. */
const colors: Partial<CaptionColors> = {
  white: 'rgb(255 255 255)',
  yellow: 'rgb(255 214 0)',
  cyan: 'rgb(0 220 255)',
  green: 'rgb(0 210 90)',
  magenta: 'rgb(240 80 220)',
  red: 'rgb(255 70 70)',
  shadow: 'rgb(0 0 0 / 0.9)',
};
const BOX = 'rgb(0 0 0 / 0.75)';

function css(
  partial: Partial<SettingsValues>,
  extra: { boxHeight?: number; scope?: string; colors?: Partial<CaptionColors> } = {},
) {
  return captionCss({
    values: { ...SETTINGS_DEFAULTS, ...partial },
    boxHeight: extra.boxHeight ?? 400,
    colors: extra.colors ?? colors,
    scope: extra.scope ?? '',
  });
}

describe('caption css', () => {
  afterEach(() => resetCaptionFonts());

  it('is empty for the defaults', () => {
    expect(css({})).toBe('');
    expect(css({}, { boxHeight: 0, scope: '[data-caramel-settings="a"] ' })).toBe('');
  });

  it.each<[Partial<SettingsValues>, string]>([
    [{ 'captions.scale': 1.5 }, 'video::cue { font-size: 30px; }'],
    [{ 'captions.scale': 0.5 }, 'video::cue { font-size: 10px; }'],
    [
      { 'captions.offset': 10 },
      'video::-webkit-media-text-track-container { translate: 0 min(var(--media-caption-track-y, 0px), -10%); }',
    ],
    [{ 'captions.color': 'yellow' }, 'video::cue { color: rgb(255 214 0); }'],
    [{ 'captions.background': false }, 'video::cue { background-color: transparent; }'],
    [{ 'captions.font': 'serif' }, "video::cue { font-family: 'Noto Serif', Georgia, 'Times New Roman', serif; }"],
    [{ 'captions.shadow': true }, 'video::cue { text-shadow: 0 0 4px rgb(0 0 0 / 0.9), 0 1px 2px rgb(0 0 0 / 0.9); }'],
    [{ 'captions.bold': true }, 'video::cue { font-weight: 700; }'],
  ])('emits only the rule of %o', (partial, expected) => {
    expect(css(partial)).toBe(expected);
  });

  it('adds the caramel box whenever the cue is restyled and the background is on', () => {
    expect(css({}, { colors: { ...colors, bg: BOX } })).toBe('');
    expect(css({ 'captions.bold': true }, { colors: { ...colors, bg: BOX } })).toBe(
      `video::cue { font-weight: 700; background-color: ${BOX}; }`,
    );
    expect(css({ 'captions.bold': true, 'captions.background': false }, { colors: { ...colors, bg: BOX } })).toBe(
      'video::cue { font-weight: 700; background-color: transparent; }',
    );
    expect(css({ 'captions.offset': 10 }, { colors: { ...colors, bg: BOX } })).toBe(
      'video::-webkit-media-text-track-container { translate: 0 min(var(--media-caption-track-y, 0px), -10%); }',
    );
  });

  it('rounds the font size', () => {
    expect(css({ 'captions.scale': 1.1 }, { boxHeight: 333 })).toBe('video::cue { font-size: 18px; }');
  });

  it('combines keys and applies the scope to every rule', () => {
    const scope = '[data-caramel-settings="p1"] ';
    expect(css({ 'captions.bold': true, 'captions.color': 'cyan', 'captions.offset': 4 }, { scope })).toBe(
      '[data-caramel-settings="p1"] video::cue { font-weight: 700; color: rgb(0 220 255); }\n' +
        '[data-caramel-settings="p1"] video::-webkit-media-text-track-container ' +
        '{ translate: 0 min(var(--media-caption-track-y, 0px), -4%); }',
    );
  });

  it('skips a color that did not resolve', () => {
    expect(css({ 'captions.color': 'red' }, { colors: { white: 'white' } })).toBe('');
    expect(css({ 'captions.shadow': true }, { colors: {} })).toBe('');
    expect(css({ 'captions.color': 'red', 'captions.bold': true }, { colors: {} })).toBe(
      'video::cue { font-weight: 700; }',
    );
  });

  it('skips the size rule while the box height is unknown', () => {
    expect(css({ 'captions.scale': 1.5 }, { boxHeight: 0 })).toBe('');
    expect(css({ 'captions.scale': 1.5 }, { boxHeight: Number.NaN })).toBe('');
  });

  it('skips an unknown font id', () => {
    expect(css({ 'captions.font': 'missing' })).toBe('');
  });
});

describe('caption fonts', () => {
  afterEach(() => resetCaptionFonts());

  it('lists the built-ins in order', () => {
    expect(getCaptionFonts().map((f) => f.id)).toEqual([...BUILTIN_CAPTION_FONTS]);
    expect(captionFontFamily('default')).toBe('');
    expect(captionFontFamily('mono')).toContain('monospace');
    expect(captionFontFamily('nope')).toBeUndefined();
    const labels = Object.fromEntries(getCaptionFonts().map((f) => [f.id, f.label]));
    expect(labels.default).toEqual({ tr: 'Oynatıcı yazı tipi', en: 'Player font' });
    expect(labels.legible).toEqual({ tr: 'Kolay okunur', en: 'High legibility' });
  });

  it('every built-in stack ends with a generic family', () => {
    for (const font of getCaptionFonts()) {
      if (font.id === 'default') continue;
      expect(font.family).toMatch(/(sans-serif|serif|monospace)$/);
    }
  });

  it('adds registered fonts after the built-ins and replaces by id', () => {
    registerCaptionFont({ id: 'brand', label: { tr: 'Marka', en: 'Brand' }, family: 'Brand, sans-serif' });
    registerCaptionFont({ id: 'other', label: { tr: 'Diğer', en: 'Other' }, family: 'Other, serif' });
    registerCaptionFont({ id: 'brand', label: { tr: 'Marka 2', en: 'Brand 2' }, family: 'Brand2, sans-serif' });
    const fonts = getCaptionFonts();
    expect(fonts.map((f) => f.id)).toEqual([...BUILTIN_CAPTION_FONTS, 'brand', 'other']);
    expect(fonts.find((f) => f.id === 'brand')?.family).toBe('Brand2, sans-serif');
    expect(css({ 'captions.font': 'brand' })).toBe('video::cue { font-family: Brand2, sans-serif; }');
  });

  it('replaces a built-in in place but never the inherited default', () => {
    registerCaptionFont({ id: 'serif', label: { tr: 'S', en: 'S' }, family: 'Site Serif, serif' });
    registerCaptionFont({ id: 'default', label: { tr: 'D', en: 'D' }, family: 'Nope' });
    registerCaptionFont({ id: 'bad id!', label: { tr: 'X', en: 'X' }, family: 'X' });
    expect(getCaptionFonts().map((f) => f.id)).toEqual([...BUILTIN_CAPTION_FONTS]);
    expect(captionFontFamily('serif')).toBe('Site Serif, serif');
    expect(captionFontFamily('default')).toBe('');
  });

  it('returns copies', () => {
    const fonts = getCaptionFonts();
    fonts[1]!.family = 'changed';
    fonts[1]!.label.en = 'changed';
    expect(getCaptionFonts()[1]!.family).not.toBe('changed');
    expect(getCaptionFonts()[1]!.label.en).toBe('Sans');
  });
});
