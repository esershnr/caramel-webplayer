import { menuContext } from '@videojs/html';

/** The part of the Video.js menu API an item needs (see `createMenu` in @videojs/core/dom). */
export interface MenuItemApi {
  registerItem(element: HTMLElement): () => void;
  highlight(element: HTMLElement | null, options?: { focus?: boolean; pointer?: boolean }): void;
}

interface MenuContextValueLike {
  menu?: MenuItemApi;
}

type ContextCallback = (value: MenuContextValueLike | undefined, unsubscribe?: () => void) => void;

/**
 * Registers a custom element as a navigable item of the enclosing
 * `<media-menu-content>`, the way `media-menu-item` does: it consumes the
 * menu context (the standard `context-request` protocol the Video.js
 * elements use) and calls `menu.registerItem(host)` once the page publishes
 * its menu. The menu then sorts it by document position, moves the highlight
 * to it with the arrow keys and focuses it.
 */
export class MenuItemRegistration {
  readonly #host: HTMLElement;
  #menu: MenuItemApi | null = null;
  #cleanup: (() => void) | null = null;
  #unsubscribe: (() => void) | null = null;
  #callback: ContextCallback | null = null;

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  /** The menu the host is registered with, or null. */
  get menu(): MenuItemApi | null {
    return this.#menu;
  }

  /** Asks for the menu context. Call on connect. */
  connect(): void {
    this.disconnect();
    const callback: ContextCallback = (value, unsubscribe) => {
      if (this.#callback !== callback) return;
      if (unsubscribe) this.#unsubscribe = unsubscribe;
      const menu = value?.menu ?? null;
      if (menu === this.#menu) return;
      this.#cleanup?.();
      this.#cleanup = null;
      this.#menu = menu;
      if (menu && typeof menu.registerItem === 'function') this.#cleanup = menu.registerItem(this.#host);
    };
    this.#callback = callback;
    const event = new Event('context-request', { bubbles: true, composed: true });
    Object.assign(event, { context: menuContext, contextTarget: this.#host, callback, subscribe: true });
    this.#host.dispatchEvent(event);
  }

  /** Unregisters from the menu and drops the subscription. Call on disconnect. */
  disconnect(): void {
    this.#callback = null;
    this.#cleanup?.();
    this.#cleanup = null;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#menu = null;
  }

  /** Highlights the host from a pointer, like the built-in items on `pointerenter`. */
  highlightFromPointer(): void {
    this.#menu?.highlight(this.#host, { focus: false, pointer: true });
  }
}
