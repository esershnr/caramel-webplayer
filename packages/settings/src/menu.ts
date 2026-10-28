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
    const menu = this.closest('media-menu');
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
  }

  #unbind(): void {
    this.#controllerAbort?.abort();
    this.#controllerAbort = null;
    this.#controller = null;
    if (this.#rendered) {
      for (const view of this.#rendered.views) view.element.remove();
      this.#rendered = null;
      this.replaceChildren();
    }
    this.hidden = true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-settings-menu': CaramelSettingsMenuElement;
  }
}
