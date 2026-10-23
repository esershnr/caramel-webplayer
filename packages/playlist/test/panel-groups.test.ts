// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { CaramelPlaylistElement } from '../src/element.js';
import { CaramelPlaylistPanelElement } from '../src/panel.js';
import type { PlaylistItem } from '../src/types.js';

if (!customElements.get('caramel-playlist')) customElements.define('caramel-playlist', CaramelPlaylistElement);
if (!customElements.get('caramel-playlist-panel')) {
  customElements.define('caramel-playlist-panel', CaramelPlaylistPanelElement);
}

const ITEMS: PlaylistItem[] = [
  { id: 'trailer', title: 'Trailer', src: 't.mp4' },
  { id: 's1e1', title: 'S1E1', src: '1.mp4', group: '1. Sezon' },
  { id: 's1e2', title: 'S1E2', src: '2.mp4', group: '1. Sezon' },
  { id: 's2e1', title: 'S2E1', src: '3.mp4', group: '2. Sezon' },
  { id: 's2e2', title: 'S2E2', src: '4.mp4', group: '2. Sezon' },
  { id: 's2e3', title: 'S2E3', src: '5.mp4', group: '2. Sezon' },
];

afterEach(() => {
  document.body.replaceChildren();
});

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

async function mount(startIndex: number) {
  const controller = document.createElement('caramel-playlist');
  controller.id = 'queue';
  controller.items = ITEMS;
  const panel = document.createElement('caramel-playlist-panel');
  panel.setAttribute('for', 'queue');
  document.body.append(controller, panel);
  // Without a player the controller never applies `start-index`; select directly.
  controller.select(startIndex);
  await settle();
  return { controller, panel };
}

function headers(panel: HTMLElement): HTMLButtonElement[] {
  return Array.from(panel.querySelectorAll<HTMLButtonElement>('.caramel-playlist-group-button'));
}

function expanded(panel: HTMLElement): string[] {
  return headers(panel).map((button) => button.getAttribute('aria-expanded') ?? '');
}

function tabStop(panel: HTMLElement): HTMLButtonElement | null {
  return panel.querySelector<HTMLButtonElement>('.caramel-playlist-list button[tabindex="0"]');
}

describe('<caramel-playlist-panel> groups', () => {
  it('renders headers for grouped runs only, with counts and flat indexes', async () => {
    const { panel } = await mount(1);
    const list = panel.querySelector('.caramel-playlist-list');
    const top = Array.from(list?.children ?? []).map((li) => li.className);
    expect(top).toEqual(['caramel-playlist-row', 'caramel-playlist-group', 'caramel-playlist-group']);
    expect(headers(panel).map((h) => h.querySelector('.caramel-playlist-group-title')?.textContent)).toEqual([
      '1. Sezon',
      '2. Sezon',
    ]);
    expect(headers(panel).map((h) => h.querySelector('.caramel-playlist-group-count')?.textContent)).toEqual([
      '2',
      '3',
    ]);
    const header = headers(panel)[0];
    expect(header?.nextElementSibling?.id).toBe(header?.getAttribute('aria-controls'));
    expect(header?.querySelector('.caramel-playlist-group-chevron svg')).not.toBeNull();
    const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('.caramel-playlist-item'));
    expect(items.map((b) => b.dataset['index'])).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(items.map((b) => b.querySelector('.caramel-playlist-number')?.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
  });

  it('expands only the group of the current item and marks it active', async () => {
    const { panel } = await mount(1);
    expect(expanded(panel)).toEqual(['true', 'false']);
    const groups = panel.querySelectorAll<HTMLElement>('.caramel-playlist-group');
    expect(groups[0]?.hasAttribute('data-active')).toBe(true);
    expect(groups[1]?.hasAttribute('data-active')).toBe(false);
    expect(groups[1]?.querySelector<HTMLElement>('.caramel-playlist-group-list')?.hidden).toBe(true);
  });

  it('collapses every group when the current item is ungrouped', async () => {
    const { panel } = await mount(0);
    expect(expanded(panel)).toEqual(['false', 'false']);
  });

  it('expands the group of a newly selected item and keeps the others', async () => {
    const { controller, panel } = await mount(1);
    controller.select(4);
    await settle();
    expect(expanded(panel)).toEqual(['true', 'true']);
    const groups = panel.querySelectorAll<HTMLElement>('.caramel-playlist-group');
    expect(groups[0]?.hasAttribute('data-active')).toBe(false);
    expect(groups[1]?.hasAttribute('data-active')).toBe(true);
  });

  it('toggles a group on header click and keeps it marked active while collapsed', async () => {
    const { panel } = await mount(1);
    const header = headers(panel)[0];
    header?.click();
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    expect((header?.nextElementSibling as HTMLElement | null)?.hidden).toBe(true);
    expect(header?.parentElement?.hasAttribute('data-active')).toBe(true);
    header?.click();
    expect(header?.getAttribute('aria-expanded')).toBe('true');
  });

  it('runs the roving tabindex over visible buttons only', async () => {
    const { panel } = await mount(1);
    const list = panel.querySelector<HTMLElement>('.caramel-playlist-list');
    expect(tabStop(panel)?.dataset['index']).toBe('1');

    // Collapsing the current group moves the stop to its header.
    headers(panel)[0]?.click();
    expect(tabStop(panel)).toBe(headers(panel)[0]);

    // Visible order is now: item 0, header 1, header 2.
    const press = (key: string) => {
      tabStop(panel)?.focus();
      list?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };
    press('ArrowDown');
    expect(tabStop(panel)).toBe(headers(panel)[1]);
    press('ArrowDown');
    expect(tabStop(panel)?.dataset['index']).toBe('0');
    press('End');
    expect(tabStop(panel)).toBe(headers(panel)[1]);
    press('ArrowUp');
    expect(tabStop(panel)).toBe(headers(panel)[0]);
    press('Home');
    expect(tabStop(panel)?.dataset['index']).toBe('0');
    expect(panel.querySelectorAll('.caramel-playlist-list button[tabindex="0"]').length).toBe(1);
  });
});
