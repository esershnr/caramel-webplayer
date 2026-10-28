import { I18nController, i18nContext, type PropertyValues, UIElement } from '@videojs/html';
import { createTriggerItem } from './controls/items.js';
import type { CaramelSettingsElement } from './element.js';
import { registerSettingsI18n } from './i18n.js';
import { buildDisplayPage } from './pages/display.js';
import type { SettingsPageView, Translate } from './pages/page.js';
import { text } from './pages/page.js';
import { buildPlayerPage } from './pages/player.js';
import { buildSubtitlesPage } from './pages/subtitles.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

/** Frame retries while looking for the controller (extras are appended after the template). */
const LOOKUP_RETRIES = 30;

let counter = 0;

/** Custom property on the `<media-menu>` that fixes the row width of the pages. */
export const MENU_WIDTH_PROPERTY = '--caramel-settings-menu-width';

/** Measures with temporary inline styles and puts the element's own back. */
function withStyle<T>(element: HTMLElement, css: string, read: () => T): T {
  const previous = element.getAttribute('style');
  element.style.cssText = `${previous ?? ''};${css}`;
  try {
    return read();
  } finally {
    if (previous === null) element.removeAttribute('style');
    else element.setAttribute('style', previous);
  }
}

/**
 * Widest natural (max-content) row of a page, measured row by row the way the
 * popup measures them (`width: max-content; min-width: 0` inline), while the
 * popup is on screen. Inactive pages carry `hidden`, which the skin's base
 * stylesheet enforces with an important rule, so the attribute is lifted for
 * the measurement (the page stays invisible and absolutely positioned) and put
 * back right after, within the same task.
 */
function widestRow(page: HTMLElement): number {
  const wasHidden = page.hidden;
  if (wasHidden) page.hidden = false;
  try {
    return withStyle(
      page,
      'display:flex;flex-direction:column;visibility:hidden;position:absolute;inset-inline-start:0;width:max-content;min-width:0;max-width:none',
      () => {
        // The popup is still scaling in when it reports open, so client rects
        // are transformed sizes; the page's own rect over its layout width
        // gives the scale, and rows keep their fractions.
        const scale = page.offsetWidth > 0 ? page.getBoundingClientRect().width / page.offsetWidth : 1;
        let widest = 0;
        for (const row of page.children) {
          if (!(row instanceof HTMLElement) || row.hidden) continue;
          const width = withStyle(
            row,
            'width:max-content;min-width:0;max-width:none;flex:none',
            () => row.getBoundingClientRect().width / (scale || 1),
          );
          if (width > widest) widest = width;
        }
        return widest;
      },
    );
  } finally {
    if (wasHidden) page.hidden = true;
  }
}

interface Rendered {
  views: SettingsPageView[];
  hints: HTMLSpanElement[];
}

/**
 * <caramel-settings-menu>
 *
 * Placeholder inside the root page of the skin's settings menu. Once a
 * `<caramel-settings>` controller sits in the same `<video-player>`, it shows
 * three rows (Caption style, Player, Display) and appends their pages to the
 * enclosing `<media-menu>` (Video.js keeps every page as a direct child of the
 * menu). Without a controller it stays `hidden` and renders nothing, so the
 * menu looks exactly as before. Every control writes through
 * `controller.set()`; the rows follow `caramel-settings-change`.
 */
export class CaramelSettingsMenuElement extends Base {
  static readonly tagName = 'caramel-settings-menu';

  readonly #i18n = new I18nController(this, i18nContext);
  readonly #prefix = `caramel-settings-menu-${++counter}`;

  #controller: CaramelSettingsElement | null = null;
  #controllerAbort: AbortController | null = null;
  #retries = 0;
  #waitingForController = false;
  #rendered: Rendered | null = null;
  #menuObserver: MutationObserver | null = null;
  /** The pages changed (render, locale) and the row width must be measured again at the next chance. */
  #widthDirty = true;
  #locale: string | null = null;

  /** The bound `<caramel-settings>`, or null. */
  get controller(): CaramelSettingsElement | null {
    return this.#controller;
  }

  #connectAbort: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    registerSettingsI18n();
    this.#retries = 0;
    if (!this.#controller) this.hidden = true;
    // A controller inserted later than the frame retries announces itself on
    // connect; the event bubbles through the player.
    this.#connectAbort?.abort();
    this.#connectAbort = new AbortController();
    this.closest('video-player')?.addEventListener(
      'caramel-settings-availability',
      () => {
        if (!this.#controller?.isConnected) {
          this.#retries = 0;
          this.requestUpdate();
        }
      },
      { signal: this.#connectAbort.signal },
    );
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#connectAbort?.abort();
    this.#connectAbort = null;
    this.#unbind();
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    this.#resolveController();
    if (!this.#controller) return;
    if (!this.#rendered && !this.#render()) return;
    this.#sync();
  }

  #resolveController(): void {
    if (this.#controller?.isConnected) return;
    this.#unbind();
    let candidate: Element | null = this.closest('video-player')?.querySelector('caramel-settings') ?? null;
    if (candidate && typeof (candidate as CaramelSettingsElement).set !== 'function') {
      // Present but not upgraded yet: wait once for the definition.
      if (
        !this.#waitingForController &&
        typeof customElements !== 'undefined' &&
        !customElements.get('caramel-settings')
      ) {
        this.#waitingForController = true;
        void customElements.whenDefined('caramel-settings').then(() => {
          this.#waitingForController = false;
          if (this.isConnected) this.requestUpdate();
        });
      }
      candidate = null;
    }
    if (!candidate?.isConnected) {
      if (this.#retries < LOOKUP_RETRIES && typeof requestAnimationFrame === 'function') {
        this.#retries++;
        requestAnimationFrame(() => this.isConnected && this.requestUpdate());
      }
      return;
    }
    const controller = candidate as CaramelSettingsElement;
    this.#controller = controller;
    const abort = new AbortController();
    const refresh = () => {
      if (!controller.isConnected) {
        // The controller left: hide again and look for a new one.
        this.#unbind();
        this.#retries = 0;
      }
      this.requestUpdate();
    };
    controller.addEventListener('caramel-settings-change', refresh, { signal: abort.signal });
    controller.addEventListener('caramel-settings-availability', refresh, { signal: abort.signal });
    this.#controllerAbort = abort;
  }

  /** Builds the rows and pages. Returns false when there is no menu to put the pages in. */
  #render(): boolean {
    const controller = this.#controller;
    const menu = this.closest<HTMLElement>('media-menu');
    if (!controller || !menu) return false;
    const views = [
      buildSubtitlesPage(controller, `${this.#prefix}-captions`),
      buildPlayerPage(controller, `${this.#prefix}-player`),
      buildDisplayPage(controller, `${this.#prefix}-display`),
    ];
    const hints: HTMLSpanElement[] = [];
    const items: HTMLElement[] = [];
    for (const view of views) {
      const { item, hint } = createTriggerItem(view.element.id, view.icon, text(view.title));
      item.dataset['page'] = view.page;
      items.push(item);
      hints.push(hint);
    }
    // Triggers first: a page looks its trigger up by `commandfor` when it updates.
    this.replaceChildren(...items);
    menu.append(...views.map((view) => view.element));
    this.#rendered = { views, hints };
    this.hidden = false;
    this.#widthDirty = true;
    this.#observeMenu(menu);
    if (menu.hasAttribute('data-open')) this.#measureWidth();
    return true;
  }

  #sync(): void {
    const rendered = this.#rendered;
    if (!rendered) return;
    const t = this.#i18n.value as unknown as Translate;
    rendered.views.forEach((view, index) => {
      view.sync(t);
      const hint = rendered.hints[index];
      const value = view.hint(t);
      if (hint && hint.textContent !== value) hint.textContent = value;
    });
    const locale = String(this.#i18n.locale ?? '');
    if (locale !== this.#locale) {
      // New labels: measure again once the `media-text` elements have updated.
      const first = this.#locale === null;
      this.#locale = locale;
      if (!first) {
        this.#widthDirty = true;
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => requestAnimationFrame(() => this.#measureWidth()));
        } else {
          this.#measureWidth();
        }
      }
    }
  }

  /**
   * Layout contract with the Video.js menu popup, part two: the popup sizes
   * itself per page from the max-content width of that page's rows, measured
   * with `min-width: 0` forced inline. So the pages are given one row width,
   * the widest row across the root page and the three settings pages, as a
   * custom property on the menu that the stylesheet applies as an important
   * minimum. Measured once per render and locale, while the popup is on
   * screen, never per drag or per page switch.
   */
  #measureWidth(): void {
    const rendered = this.#rendered;
    const menu = this.closest<HTMLElement>('media-menu');
    if (!rendered || !menu || !this.#widthDirty) return;
    if (!menu.hasAttribute('data-open') || typeof getComputedStyle !== 'function') return;
    const root = this.closest<HTMLElement>('media-menu-content');
    const pages = [...rendered.views.map((view) => view.element), ...(root ? [root] : [])];
    // Rows must not carry the previous width while they are measured.
    menu.style.setProperty(MENU_WIDTH_PROPERTY, '0px');
    let widest = 0;
    for (const page of pages) widest = Math.max(widest, widestRow(page));
    if (!(widest > 0)) {
      // Not laid out yet (the popup is still opening): try again on the next frame.
      menu.style.removeProperty(MENU_WIDTH_PROPERTY);
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => this.#measureWidth());
      return;
    }
    this.#widthDirty = false;
    menu.style.setProperty(MENU_WIDTH_PROPERTY, `${Math.ceil(widest)}px`);
    // The popup measured its current page before the width was set: a child
    // mutation of the root page makes it measure again.
    if (root) {
      const marker = document.createComment('');
      root.append(marker);
      marker.remove();
    }
  }

  /** Measures when the menu opens, if the pages changed since the last measurement. */
  #observeMenu(menu: HTMLElement): void {
    if (this.#menuObserver || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      if (menu.hasAttribute('data-open')) this.#measureWidth();
    });
    observer.observe(menu, { attributes: true, attributeFilter: ['data-open'] });
    this.#menuObserver = observer;
  }

  #unbind(): void {
    this.#controllerAbort?.abort();
    this.#controllerAbort = null;
    this.#controller = null;
    this.#menuObserver?.disconnect();
    this.#menuObserver = null;
    this.closest<HTMLElement>('media-menu')?.style.removeProperty(MENU_WIDTH_PROPERTY);
    if (this.#rendered) {
      for (const view of this.#rendered.views) view.element.remove();
      this.#rendered = null;
      this.replaceChildren();
    }
    this.#widthDirty = true;
    this.hidden = true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-settings-menu': CaramelSettingsMenuElement;
  }
}
