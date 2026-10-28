// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { CaramelSettingsSliderElement } from '../src/controls/slider.js';

/**
 * The Video.js menu popup watches each page with a MutationObserver
 * (childList, subtree, characterData) and re-measures every row on each
 * record, so a slider must not mutate the DOM while its value moves. This
 * counts what the popup would see during a ten step keyboard drag.
 */
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
  await import('../src/define.js');
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('<caramel-settings-slider> under the popup observer', () => {
  it('moves ten steps without a mutation the popup observes and commits once', async () => {
    const page = document.createElement('media-menu-content');
    const slider = document.createElement('caramel-settings-slider') as CaramelSettingsSliderElement;
    slider.range = { min: 5, max: 30, step: 5 };
    slider.format = (value) => `${value} sn`;
    slider.setLabel('Seek step');
    page.append(slider);
    document.body.append(page);
    slider.value = 5;
    await frame();

    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(page, { childList: true, subtree: true, characterData: true });
    let changes = 0;
    slider.addEventListener('caramel-settings-slider-change', () => changes++);

    for (let i = 0; i < 10; i++) {
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    }
    slider.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
    await frame();
    await wait(300);
    observer.disconnect();

    expect(slider.value).toBe(30);
    expect(records.length).toBe(0);
    expect(changes).toBe(1);
    expect(slider.getAttribute('aria-valuenow')).toBe('30');
  });

  it('ignores keys and shows its hint while disabled, and is marked unavailable for the menu', async () => {
    const slider = document.createElement('caramel-settings-slider') as CaramelSettingsSliderElement;
    slider.range = { min: 0, max: 10, step: 1 };
    slider.format = (value) => `${value} s`;
    slider.setLabel('Countdown');
    document.body.append(slider);
    slider.value = 3;
    slider.hint = 'Skipping at once';
    slider.disabled = true;
    await frame();
    expect(slider.getAttribute('aria-disabled')).toBe('true');
    expect(slider.getAttribute('data-availability')).toBe('unavailable');
    expect(slider.querySelector('.caramel-settings-slider-value')!.getAttribute('data-value')).toBe('Skipping at once');
    let changes = 0;
    slider.addEventListener('caramel-settings-slider-change', () => changes++);
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    slider.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
    await frame();
    expect(slider.value).toBe(3);
    expect(changes).toBe(0);
    slider.disabled = false;
    await frame();
    expect(slider.hasAttribute('aria-disabled')).toBe(false);
    expect(slider.querySelector('.caramel-settings-slider-value')!.getAttribute('data-value')).toBe('3 s');
  });
});
