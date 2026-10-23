// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CaramelPlaylistElement } from '@esershnr/caramel-playlist';
import type { CaramelDrawerElement } from '../src/element.js';
import type { CaramelDrawerToggleElement } from '../src/toggle.js';

/** A stand-in for Video.js's `<media-menu>`: `closeMenu()` drops `data-open` like the real one. */
const closeMenu = vi.fn(function (this: HTMLElement) {
  this.removeAttribute('data-open');
});

class FakeMenu extends HTMLElement {
  closeMenu = closeMenu;
}

const ITEMS = [
  { id: 'a', title: 'First', src: 'a.mp4' },
  { id: 'b', title: 'Second', src: 'b.mp4' },
];

interface Fixture {
  player: HTMLElement;
  toggle: CaramelDrawerToggleElement;
  drawer: CaramelDrawerElement;
  menu: HTMLElement;
}

/**
 * Without the real Video.js player: `<video-player>` and `<media-container>`
 * stay undefined. The toggle sits before the drawer, as in the skin, where the
 * bar comes first and the drawer is appended after it.
 */
function mount(): Fixture {
  document.body.innerHTML = `
    <video-player>
      <media-container>
        <div class="bar">
          <caramel-drawer-toggle></caramel-drawer-toggle>
          <media-menu></media-menu>
        </div>
        <caramel-drawer></caramel-drawer>
      </media-container>
    </video-player>`;
  return {
    player: document.querySelector('video-player') as HTMLElement,
    toggle: document.querySelector('caramel-drawer-toggle') as CaramelDrawerToggleElement,
    drawer: document.querySelector('caramel-drawer') as CaramelDrawerElement,
    menu: document.querySelector('media-menu') as HTMLElement,
  };
}

/** Adds a `<caramel-playlist>` with two items, so the drawer's playlist tab has content. */
function addPlaylist(player: HTMLElement): void {
  const playlist = document.createElement('caramel-playlist') as CaramelPlaylistElement;
  playlist.items = ITEMS;
  player.append(playlist);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  }
}

function button(toggle: HTMLElement): HTMLButtonElement {
  return toggle.querySelector('.caramel-drawer-toggle-button') as HTMLButtonElement;
}

beforeAll(async () => {
  if (!customElements.get('media-menu')) customElements.define('media-menu', FakeMenu);
  await import('@esershnr/caramel-playlist/define');
  await import('../src/define.js');
});

afterEach(() => {
  document.body.replaceChildren();
  closeMenu.mockClear();
});

describe('<caramel-drawer-toggle>', () => {
  it('renders one bar button with the playlist icon', () => {
    const { toggle } = mount();
    const buttons = toggle.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    const own = button(toggle);
    expect(own.type).toBe('button');
    expect(own.classList.contains('media-button')).toBe(true);
    expect(own.hasAttribute('data-caramel-native-space')).toBe(false);
    expect(own.querySelector('svg.media-button-icon.caramel-icon.caramel-icon-playlist')).not.toBeNull();
  });

  it('binds to the drawer but stays hidden while no tab has content', async () => {
    const { toggle, drawer } = mount();
    await settle();
    expect(toggle.drawer).toBe(drawer);
    expect(drawer.tabs).toEqual([]);
    expect(toggle.hidden).toBe(true);
  });

  it('shows once the playlist tab has content and mirrors the drawer', async () => {
    const { player, toggle, drawer } = mount();
    const seen: string[][] = [];
    drawer.addEventListener('caramel-drawer-tabs', (e) =>
      seen.push([...(e as CustomEvent<{ tabs: string[] }>).detail.tabs]),
    );
    addPlaylist(player);
    await settle();
    expect(drawer.tabs).toEqual(['playlist']);
    expect(seen).toEqual([['playlist']]);
    expect(toggle.hidden).toBe(false);

    const own = button(toggle);
    expect(own.getAttribute('aria-controls')).toBe(drawer.panelId);
    expect(own.getAttribute('aria-expanded')).toBe('false');
    expect(own.getAttribute('aria-label')).toBe('Open panel');
    expect(own.getAttribute('title')).toBe('Open panel');

    drawer.show();
    await settle();
    expect(own.getAttribute('aria-expanded')).toBe('true');
    expect(own.getAttribute('aria-label')).toBe('Close panel');

    drawer.hide();
    await settle();
    expect(own.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles the drawer on click', async () => {
    const { player, toggle, drawer } = mount();
    addPlaylist(player);
    await settle();
    button(toggle).click();
    expect(drawer.open).toBe(true);
    button(toggle).click();
    expect(drawer.open).toBe(false);
  });

  it('gets focus back when Escape closes the drawer', async () => {
    const { player, toggle, drawer } = mount();
    addPlaylist(player);
    await settle();
    drawer.show();
    const inside = document.activeElement as HTMLElement;
    expect(drawer.contains(inside)).toBe(true);
    inside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(drawer.open).toBe(false);
    expect(document.activeElement).toBe(button(toggle));
  });
});

describe('<caramel-drawer> and the settings menu', () => {
  it('show() closes an open menu', () => {
    const { drawer, menu } = mount();
    menu.setAttribute('data-open', '');
    drawer.show();
    expect(closeMenu).toHaveBeenCalledTimes(1);
    expect(menu.hasAttribute('data-open')).toBe(false);
  });

  it('leaves closed menus alone', () => {
    const { drawer } = mount();
    drawer.show();
    expect(closeMenu).not.toHaveBeenCalled();
  });

  it('closes when a menu opens', async () => {
    const { drawer, menu } = mount();
    drawer.show();
    await settle();
    menu.setAttribute('data-open', '');
    await settle();
    expect(drawer.open).toBe(false);
  });
});
