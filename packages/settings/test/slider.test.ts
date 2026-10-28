import { describe, expect, it } from 'vitest';
import { sliderKeyValue, sliderPageStep, sliderRatio, sliderValueFromRatio } from '../src/controls/slider.js';
import { SETTINGS_RANGES } from '../src/schema.js';

const SCALE = SETTINGS_RANGES['captions.scale'];
const SEEK = SETTINGS_RANGES['player.seekStep'];
const DELAY = SETTINGS_RANGES['player.autoSkipDelay'];
const OFFSET = SETTINGS_RANGES['captions.offset'];

describe('slider math', () => {
  it('maps values to track positions', () => {
    expect(sliderRatio(5, SEEK)).toBe(0);
    expect(sliderRatio(30, SEEK)).toBe(1);
    expect(sliderRatio(17.5, SEEK)).toBe(0.5);
    expect(sliderRatio(100, SEEK)).toBe(1);
    expect(sliderRatio(-3, SEEK)).toBe(0);
    expect(sliderRatio(Number.NaN, SEEK)).toBe(0);
  });

  it('maps track positions to snapped values', () => {
    expect(sliderValueFromRatio(0, SEEK)).toBe(5);
    expect(sliderValueFromRatio(1, SEEK)).toBe(30);
    expect(sliderValueFromRatio(0.45, SEEK)).toBe(15);
    expect(sliderValueFromRatio(0.47, SCALE)).toBe(1.2);
    expect(sliderValueFromRatio(1.4, SCALE)).toBe(2);
    expect(sliderValueFromRatio(-1, SCALE)).toBe(0.5);
    expect(sliderValueFromRatio(Number.NaN, DELAY)).toBe(0);
  });

  it('steps with the arrow keys and clamps at the ends', () => {
    expect(sliderKeyValue('ArrowRight', 5, SEEK)).toBe(10);
    expect(sliderKeyValue('ArrowLeft', 10, SEEK)).toBe(5);
    expect(sliderKeyValue('ArrowLeft', 5, SEEK)).toBe(5);
    expect(sliderKeyValue('ArrowRight', 30, SEEK)).toBe(30);
    expect(sliderKeyValue('ArrowRight', 1, SCALE)).toBe(1.1);
    expect(sliderKeyValue('ArrowRight', 1.1, SCALE)).toBe(1.2);
  });

  it('swaps the horizontal arrows in right-to-left layouts', () => {
    expect(sliderKeyValue('ArrowLeft', 10, SEEK, true)).toBe(15);
    expect(sliderKeyValue('ArrowRight', 10, SEEK, true)).toBe(5);
  });

  it('jumps to the ends with Home and End, by a page with PageUp / PageDown', () => {
    expect(sliderKeyValue('Home', 20, SEEK)).toBe(5);
    expect(sliderKeyValue('End', 5, SEEK)).toBe(30);
    expect(sliderPageStep(SEEK)).toBe(5);
    expect(sliderPageStep(SCALE)).toBeCloseTo(0.3);
    expect(sliderPageStep(OFFSET)).toBe(6);
    expect(sliderPageStep(DELAY)).toBe(2);
    expect(sliderKeyValue('PageUp', 1, SCALE)).toBe(1.3);
    expect(sliderKeyValue('PageDown', 1, SCALE)).toBe(0.7);
    expect(sliderKeyValue('PageDown', 0, DELAY)).toBe(0);
  });

  it('leaves ArrowUp, ArrowDown and other keys to the menu', () => {
    expect(sliderKeyValue('ArrowUp', 10, SEEK)).toBeNull();
    expect(sliderKeyValue('ArrowDown', 10, SEEK)).toBeNull();
    expect(sliderKeyValue(' ', 10, SEEK)).toBeNull();
    expect(sliderKeyValue('Enter', 10, SEEK)).toBeNull();
  });

  it('imports without a DOM (SSR), together with the elements and define', async () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    const { CaramelSettingsSliderElement } = await import('../src/controls/slider.js');
    const { CaramelSettingsElement } = await import('../src/element.js');
    const { CaramelSettingsMenuElement } = await import('../src/menu.js');
    const { defineCaramelSettings } = await import('../src/define.js');
    const { Settings } = await import('../src/react.js');
    expect(CaramelSettingsSliderElement.tagName).toBe('caramel-settings-slider');
    expect(CaramelSettingsElement.tagName).toBe('caramel-settings');
    expect(CaramelSettingsMenuElement.tagName).toBe('caramel-settings-menu');
    expect(() => defineCaramelSettings()).not.toThrow();
    expect(typeof Settings).toBe('function');
  });
});
