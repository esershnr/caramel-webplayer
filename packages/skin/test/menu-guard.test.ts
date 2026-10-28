// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installMenuGuard, isInsideMenu } from '../src/menu-guard.js';

let uninstall: () => void;
let container: HTMLElement;
let menu: HTMLElement;
let trigger: HTMLElement;
let outside: HTMLElement;
let item: HTMLElement;
let seen: string[];

function press(target: Element, pointerId = 1, upId = pointerId): void {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId, button: 0 }));
  target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: upId, button: 0 }));
}

beforeEach(() => {
  document.body.innerHTML = `
    <media-container class="media-skin caramel-skin">
      <video></video>
      <button commandfor="menu-1" id="trigger">Settings</button>
      <media-menu id="menu-1"><media-menu-item id="item">Speed</media-menu-item></media-menu>
    </media-container>`;
  container = document.querySelector('media-container')!;
  menu = document.querySelector('media-menu')!;
  trigger = document.getElementById('trigger')!;
  outside = document.querySelector('video')!;
  item = document.getElementById('item')!;
  seen = [];
  container.addEventListener('pointerdown', () => seen.push('down'));
  container.addEventListener('pointerup', () => seen.push('up'));
  uninstall = installMenuGuard();
});

afterEach(() => {
  uninstall();
  document.body.innerHTML = '';
});

describe('installMenuGuard', () => {
  it('keeps the pointerup of an outside press away from the player while the menu is open', () => {
    menu.setAttribute('data-open', '');
    press(outside);
    expect(seen).toEqual(['down']);
  });

  it('lets presses through when the menu is closed', () => {
    press(outside);
    expect(seen).toEqual(['down', 'up']);
  });

  it('lets presses inside the menu and on its trigger through', () => {
    menu.setAttribute('data-open', '');
    press(item);
    press(trigger);
    expect(seen).toEqual(['down', 'up', 'down', 'up']);
  });

  it('only swallows the pointer that started outside', () => {
    menu.setAttribute('data-open', '');
    press(outside, 1, 2);
    expect(seen).toEqual(['down', 'up']);
    // Pointer 1 is still remembered; its own pointerup is stopped once.
    outside.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    outside.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    expect(seen).toEqual(['down', 'up', 'up']);
  });

  it('forgets a press on pointercancel', () => {
    menu.setAttribute('data-open', '');
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3 }));
    outside.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 3 }));
    menu.removeAttribute('data-open');
    outside.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 }));
    expect(seen).toEqual(['down', 'up']);
  });

  it('ignores presses outside a caramel player', () => {
    menu.setAttribute('data-open', '');
    const page = document.createElement('div');
    document.body.append(page);
    let ups = 0;
    page.addEventListener('pointerup', () => ups++);
    press(page);
    expect(ups).toBe(1);
  });

  it('installs once', () => {
    const second = installMenuGuard();
    menu.setAttribute('data-open', '');
    press(outside);
    second();
    expect(seen).toEqual(['down']);
  });
});

describe('isInsideMenu', () => {
  it('matches the menu, its descendants through the path and the commandfor trigger', () => {
    expect(isInsideMenu([item, menu, container], [menu])).toBe(true);
    expect(isInsideMenu([trigger, container], [menu])).toBe(true);
    expect(isInsideMenu([outside, container], [menu])).toBe(false);
  });
});
