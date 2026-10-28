// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CaramelSettingsElement } from '../src/element.js';
import type { CaramelSettingsMenuElement } from '../src/menu.js';

let key = 0;

/** The skin's settings menu around the placeholder; the Video.js menu elements stay undefined. */
function mount(withController: boolean): {
  menu: HTMLElement;
  placeholder: CaramelSettingsMenuElement;
} {
  document.body.innerHTML = `
    <video-player>
      <media-container>
        <video></video>
        <media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
        <media-hotkey keys="0-9" action="seekToPercent"></media-hotkey>
        <media-menu class="media-menu-popup" id="popup">
          <media-menu-content class="media-menu-content">
            <media-menu-item commandfor="quality" class="media-menu-trigger-item">Quality</media-menu-item>
            <caramel-settings-menu class="caramel-settings-menu" hidden></caramel-settings-menu>
          </media-menu-content>
          <media-menu-content class="media-menu-content" id="quality"></media-menu-content>
        </media-menu>
        ${withController ? `<caramel-settings storage-key="menu-test-${++key}"></caramel-settings>` : ''}
      </media-container>
    </video-player>`;
  return {
    menu: document.querySelector('media-menu')!,
    placeholder: document.querySelector('caramel-settings-menu') as CaramelSettingsMenuElement,
  };
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const settle = async () => {
  await Promise.resolve();
  await frame();
  await Promise.resolve();
};

const pages = (menu: Element) => [...menu.querySelectorAll(':scope > .caramel-settings-page')] as HTMLElement[];

beforeAll(async () => {
  await import('../src/define.js');
});

beforeEach(() => localStorage.clear());

afterEach(() => {
  document.body.replaceChildren();
});

describe('<caramel-settings-menu>', () => {
  it('stays hidden and empty without a controller', async () => {
    const { menu, placeholder } = mount(false);
    await settle();
    expect(placeholder.hidden).toBe(true);
    expect(placeholder.children).toHaveLength(0);
    expect(pages(menu)).toHaveLength(0);
  });

  it('renders three rows and three pages next to the menu with a controller', async () => {
    const { menu, placeholder } = mount(true);
    await settle();
    expect(placeholder.hidden).toBe(false);
    const triggers = [...placeholder.querySelectorAll(':scope > media-menu-item.media-menu-trigger-item')];
    expect(triggers.map((t) => t.getAttribute('data-page'))).toEqual(['captions', 'player', 'display']);
    for (const trigger of triggers) {
      expect(trigger.hasAttribute('hidden')).toBe(false);
      expect(trigger.querySelector('[data-part="value"]')).toBeNull();
      expect(trigger.querySelector('[data-part="caramel-hint"].media-menu-hint-label')).not.toBeNull();
      expect(trigger.querySelector('svg.media-menu-forward-chevron.caramel-icon-chevron')).not.toBeNull();
    }
    const list = pages(menu);
    expect(list).toHaveLength(3);
    expect(list.map((p) => p.id)).toEqual(triggers.map((t) => t.getAttribute('commandfor')));
    expect(new Set(list.map((p) => p.id)).size).toBe(3);
    for (const page of list) {
      expect(page.localName).toBe('media-menu-content');
      expect(page.hasAttribute('data-caramel-native-space')).toBe(true);
      expect(page.firstElementChild?.classList.contains('media-menu-back-item')).toBe(true);
      expect(page.querySelector('.caramel-settings-reset')).not.toBeNull();
    }
    // Hints summarize each page.
    const hints = triggers.map((t) => t.querySelector('[data-part="caramel-hint"]')!.textContent);
    expect(hints[0]).toBe('White');
    expect(hints[1]).toBe('5 s');
    expect(hints[2]).toBe('Default');
  });

  it('builds the controls of each page', async () => {
    const { menu } = mount(true);
    await settle();
    const [subtitles, player, display] = pages(menu);
    const sliders = [...subtitles!.querySelectorAll('caramel-settings-slider')];
    expect(sliders.map((s) => s.getAttribute('data-key'))).toEqual(['captions.scale', 'captions.offset']);
    expect(sliders[0]!.getAttribute('role')).toBe('slider');
    expect(sliders[0]!.getAttribute('aria-valuetext')).toBe('100%');
    const label = sliders[0]!.getAttribute('aria-labelledby')!;
    expect(document.getElementById(label)?.textContent).toBe('Size');
    expect(subtitles!.querySelectorAll('media-menu-radio-group')).toHaveLength(2);
    expect(subtitles!.querySelectorAll('.caramel-settings-swatch')).toHaveLength(6);
    expect([...subtitles!.querySelectorAll('media-menu-checkbox-item')].map((s) => s.getAttribute('data-key'))).toEqual(
      ['captions.background', 'captions.shadow', 'captions.bold'],
    );
    expect(subtitles!.querySelector('[data-key="captions.background"]')!.getAttribute('aria-checked')).toBe('true');

    expect(player!.querySelector('[data-key="player.seekStep"]')!.getAttribute('aria-valuetext')).toBe('5 s');
    // No skip-segments and no playlist in this player: their rows are hidden.
    for (const name of ['player.autoSkipIntro', 'player.autoSkipOutro', 'player.autoSkipDelay', 'player.autoAdvance']) {
      expect((player!.querySelector(`[data-key="${name}"]`) as HTMLElement).hidden, name).toBe(true);
    }
    expect((player!.querySelector('[data-key="player.numberKeys"]') as HTMLElement).hidden).toBe(false);

    const values = [...display!.querySelectorAll('media-menu-radio-item')].map((i) => i.getAttribute('value'));
    expect(values).toEqual(['default', '4:3', '16:9', 'none', 'vivid', 'warm', 'cool', 'bright', 'cinema']);
  });

  it('follows the controller and writes through it', async () => {
    const { menu, placeholder } = mount(true);
    await settle();
    const controller = document.querySelector('caramel-settings') as CaramelSettingsElement;
    const [, player, display] = pages(menu);
    const reset = player!.querySelector('.caramel-settings-reset')!;
    expect(reset.getAttribute('aria-disabled')).toBe('true');

    const slider = player!.querySelector('caramel-settings-slider') as HTMLElement;
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(controller.settings['player.seekStep']).toBe(10);
    await settle();
    expect(slider.getAttribute('aria-valuetext')).toBe('10 s');
    expect(placeholder.querySelector('[data-page="player"] [data-part="caramel-hint"]')!.textContent).toBe('10 s');
    expect(reset.hasAttribute('aria-disabled')).toBe(false);

    controller.set({ 'display.aspect': '4:3' });
    await settle();
    expect(placeholder.querySelector('[data-page="display"] [data-part="caramel-hint"]')!.textContent).toBe('4:3');
    expect(display!.querySelector('[value="4:3"]')!.getAttribute('aria-checked')).toBe('true');

    reset.dispatchEvent(new Event('select', { cancelable: true }));
    expect(controller.isUserSet('player.seekStep')).toBe(false);
  });

  it('binds to a controller that arrives after the frame retries gave up', async () => {
    const { menu, placeholder } = mount(false);
    for (let i = 0; i < 40; i++) await frame();
    expect(placeholder.hidden).toBe(true);
    const controller = document.createElement('caramel-settings') as CaramelSettingsElement;
    controller.setAttribute('storage-key', `menu-test-late-${++key}`);
    document.querySelector('media-container')!.append(controller);
    await settle();
    expect(placeholder.hidden).toBe(false);
    expect(placeholder.controller).toBe(controller);
    expect(pages(menu)).toHaveLength(3);
  });

  it('removes its rows and pages when the controller is removed', async () => {
    const { menu, placeholder } = mount(true);
    await settle();
    expect(pages(menu)).toHaveLength(3);
    document.querySelector('caramel-settings')!.remove();
    await settle();
    expect(placeholder.hidden).toBe(true);
    expect(placeholder.children).toHaveLength(0);
    expect(pages(menu)).toHaveLength(0);
  });

  it('removes its pages when the placeholder leaves the menu', async () => {
    const { menu, placeholder } = mount(true);
    await settle();
    placeholder.remove();
    expect(pages(menu)).toHaveLength(0);
  });
});

describe('with the Video.js menu elements', () => {
  it('registers the slider as a navigable menu item of its page', async () => {
    await import('@videojs/html/ui/menu');
    await import('@videojs/html/ui/menu-content');
    await import('@videojs/html/ui/menu-item');
    const { menu } = mount(true);
    for (let i = 0; i < 5; i++) await settle();
    const [subtitles] = pages(menu);
    const slider = subtitles!.querySelector('caramel-settings-slider') as HTMLElement;
    // registerItem marks the element and takes it out of the tab order.
    expect(slider.hasAttribute('data-item')).toBe(true);
    expect(slider.tabIndex).toBe(-1);
    expect(subtitles!.querySelector('media-menu-checkbox-item')!.hasAttribute('data-item')).toBe(true);
    expect(subtitles!.getAttribute('role')).toBe('menu');
  });
});
