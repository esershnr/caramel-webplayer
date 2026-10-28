// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { CaramelSettingsElement } from '../src/element.js';
import { MENU_WIDTH_PROPERTY } from '../src/menu.js';

/**
 * The popup sizes itself per page from the natural width of that page's rows,
 * so the placeholder gives every row one shared minimum width, measured when
 * the menu opens. happy-dom lays nothing out, so this covers the wiring: the
 * property is written on open and dropped when the pages go away. The widths
 * themselves are checked in a browser.
 */
let key = 0;
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const settle = async () => {
  await Promise.resolve();
  await frame();
  await Promise.resolve();
};

beforeAll(async () => {
  await import('../src/define.js');
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('<caramel-settings-menu> row width', () => {
  it('measures on open and clears the property when the controller leaves', async () => {
    document.body.innerHTML = `
      <video-player><media-container>
        <video></video>
        <media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
        <media-menu class="media-menu-popup" id="popup">
          <media-menu-content class="media-menu-content">
            <media-menu-item commandfor="quality" class="media-menu-trigger-item">Quality</media-menu-item>
            <caramel-settings-menu class="caramel-settings-menu" hidden></caramel-settings-menu>
          </media-menu-content>
          <media-menu-content class="media-menu-content" id="quality"></media-menu-content>
        </media-menu>
        <caramel-settings storage-key="menu-width-${++key}"></caramel-settings>
      </media-container></video-player>`;
    const menu = document.querySelector('media-menu') as HTMLElement;
    await settle();
    expect(menu.style.getPropertyValue(MENU_WIDTH_PROPERTY)).toBe('');
    menu.setAttribute('data-open', '');
    await settle();
    await frame();
    // Nothing is laid out in happy-dom, so the measurement keeps retrying and the property stays unset.
    expect(menu.style.getPropertyValue(MENU_WIDTH_PROPERTY)).toBe('');
    const controller = document.querySelector('caramel-settings') as CaramelSettingsElement;
    controller.remove();
    await settle();
    expect(menu.style.getPropertyValue(MENU_WIDTH_PROPERTY)).toBe('');
    expect(document.querySelector('.caramel-settings-page')).toBeNull();
  });
});
