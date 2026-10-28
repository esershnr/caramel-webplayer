import { describe, expect, it } from 'vitest';
import { displayCss, fitBox, VIDEO_FILTER_CSS } from '../src/display.js';
import { SETTINGS_DEFAULTS, type SettingsValues, VIDEO_FILTERS } from '../src/schema.js';

const values = (partial: Partial<SettingsValues>): SettingsValues => ({ ...SETTINGS_DEFAULTS, ...partial });

describe('fitBox', () => {
  it('fits a landscape container', () => {
    expect(fitBox(1920, 800, '16:9')).toEqual({ width: 1422, height: 800 });
    expect(fitBox(1920, 800, '4:3')).toEqual({ width: 1067, height: 800 });
    expect(fitBox(1600, 900, '16:9')).toEqual({ width: 1600, height: 900 });
  });

  it('fits a portrait container', () => {
    expect(fitBox(390, 844, '16:9')).toEqual({ width: 390, height: 219 });
    expect(fitBox(390, 844, '4:3')).toEqual({ width: 390, height: 293 });
  });

  it('fits a wide ratio into a 4:3 container', () => {
    expect(fitBox(800, 600, '16:9')).toEqual({ width: 800, height: 450 });
    expect(fitBox(800, 600, '4:3')).toEqual({ width: 800, height: 600 });
  });

  it('is null for default and empty containers', () => {
    expect(fitBox(800, 600, 'default')).toBeNull();
    expect(fitBox(0, 600, '16:9')).toBeNull();
    expect(fitBox(800, -1, '4:3')).toBeNull();
    expect(fitBox(Number.NaN, 600, '4:3')).toBeNull();
  });
});

describe('displayCss', () => {
  const box = { width: 1067, height: 800 };

  it('is empty for the defaults', () => {
    expect(displayCss({ values: SETTINGS_DEFAULTS, box, scope: '' })).toBe('');
    expect(displayCss({ values: SETTINGS_DEFAULTS, box: null, scope: '[data-caramel-settings="a"] ' })).toBe('');
  });

  it('has a filter for every listed filter', () => {
    for (const filter of VIDEO_FILTERS) expect(VIDEO_FILTER_CSS[filter]).toBeTruthy();
  });

  it('emits a filter alone', () => {
    expect(displayCss({ values: values({ 'display.filter': 'warm' }), box: null, scope: '' })).toBe(
      'video { filter: sepia(0.18) saturate(1.1); }',
    );
  });

  it('emits an aspect box alone, and nothing without a box', () => {
    expect(displayCss({ values: values({ 'display.aspect': '4:3' }), box, scope: '' })).toBe(
      'video { position: absolute; inset: 0; margin: auto; width: 1067px; height: 800px; object-fit: fill; }',
    );
    expect(displayCss({ values: values({ 'display.aspect': '4:3' }), box: null, scope: '' })).toBe('');
  });

  it('emits both in one scoped rule', () => {
    expect(
      displayCss({
        values: values({ 'display.aspect': '16:9', 'display.filter': 'cinema' }),
        box: { width: 1422, height: 800 },
        scope: '[data-caramel-settings="p"] ',
      }),
    ).toBe(
      '[data-caramel-settings="p"] video { filter: contrast(1.12) saturate(0.9) brightness(0.97); ' +
        'position: absolute; inset: 0; margin: auto; width: 1422px; height: 800px; object-fit: fill; }',
    );
  });
});
