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
});
