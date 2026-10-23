// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { CaramelDrawerElement } from '../src/element.js';

interface Fixture {
  drawer: CaramelDrawerElement;
  container: HTMLElement;
  panel: HTMLElement;
}

/**
 * The element without the real Video.js player: `<video-player>` and
 * `<media-container>` stay undefined, so nothing binds; the drawer must still
 * open, close and keep keys away from the container.
 */
function mount(): Fixture {
  document.body.innerHTML = `
    <video-player>
      <media-container>
        <caramel-drawer></caramel-drawer>
      </media-container>
    </video-player>`;
  const drawer = document.querySelector('caramel-drawer') as CaramelDrawerElement;
  return {
    drawer,
    container: document.querySelector('media-container') as HTMLElement,
    panel: drawer.querySelector('.caramel-drawer-panel') as HTMLElement,
  };
}

function toggles(drawer: HTMLElement): boolean[] {
  const seen: boolean[] = [];
  drawer.addEventListener('caramel-drawer-toggle', (e) => seen.push((e as CustomEvent<{ open: boolean }>).detail.open));
  return seen;
}

beforeAll(async () => {
  await import('../src/define.js');
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('<caramel-drawer>', () => {
  it('opts out of player gestures and the Space redirect', () => {
    const { drawer } = mount();
    expect(drawer.hasAttribute('data-interactive')).toBe(true);
    expect(drawer.hasAttribute('data-caramel-native-space')).toBe(true);
    expect(drawer.querySelector('caramel-chapters-panel[embedded][no-heading]')).not.toBeNull();
    expect(drawer.querySelector('caramel-playlist-panel[embedded][no-heading][nav="none"]')).not.toBeNull();
  });

  it('renders only the panel, no edge handle', () => {
    const { drawer, panel } = mount();
    expect(Array.from(drawer.children)).toEqual([panel]);
    expect(drawer.querySelector('.caramel-drawer-handle')).toBeNull();
    expect(drawer.panelId).toBe(panel.id);
    expect(drawer.tabs).toEqual([]);
  });

  it('is inert while closed', () => {
    const { drawer, panel } = mount();
    expect(drawer.open).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(true);
  });

  it('show() opens, reflects and dispatches caramel-drawer-toggle', () => {
    const { drawer, panel } = mount();
    const seen = toggles(drawer);
    drawer.show();
    expect(drawer.open).toBe(true);
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(drawer.hasAttribute('open')).toBe(true);
    expect(drawer.hasAttribute('data-open')).toBe(true);
    drawer.show();
    expect(seen).toEqual([true]);
  });

  it('keeps keys typed inside the panel away from the container, except Tab', () => {
    const { drawer, container, panel } = mount();
    drawer.show();
    const keys: string[] = [];
    container.addEventListener('keydown', (e) => keys.push(e.key));
    const button = panel.querySelector('button') as HTMLButtonElement;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(keys).toEqual(['Tab']);
  });

  it('closes on Escape', () => {
    const { drawer, panel } = mount();
    drawer.show();
    const button = panel.querySelector('button') as HTMLButtonElement;
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(drawer.open).toBe(false);
    expect(drawer.hasAttribute('open')).toBe(false);
  });

  it('hide() restores inert and dispatches caramel-drawer-toggle once', () => {
    const { drawer, panel } = mount();
    drawer.show();
    const seen = toggles(drawer);
    drawer.hide();
    drawer.hide();
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(seen).toEqual([false]);
  });

  it('opens and closes through the open attribute and property', () => {
    const { drawer } = mount();
    drawer.setAttribute('open', '');
    expect(drawer.open).toBe(true);
    drawer.open = false;
    expect(drawer.hasAttribute('open')).toBe(false);
    drawer.toggle();
    expect(drawer.open).toBe(true);
  });
});
