import { I18nController, UIElement, i18nContext, type PropertyValues } from '@videojs/html';
import { createIconElement, icons } from '@esershnr/caramel-icons';
import type { CaramelDrawerElement } from './element.js';
import { DRAWER_DEFAULTS, DRAWER_KEYS, registerDrawerI18n } from './i18n.js';
import { undefinedAncestorTag } from './provider.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

/** Frame retries while looking for the drawer (it is appended after the control bar). */
const LOOKUP_RETRIES = 30;

/**
 * <caramel-drawer-toggle>
 *
 * The control bar button that opens and closes a `<caramel-drawer>`. The
 * `@esershnr/caramel-skin` template carries it as a placeholder left of the
 * settings button; with another skin, place it anywhere inside the player.
 * It stays `hidden` until it is bound to a drawer that has at least one tab
 * with content.
 *
 *   <caramel-drawer-toggle for="side"></caramel-drawer-toggle>
 *
 * Attributes:
 *   for    id of the `<caramel-drawer>` (default: the one inside the same
 *          `<video-player>`)
 *
 * Properties: `drawer` (read only, the bound drawer or null).
 *
 * The button is a plain `media-button`: Enter activates it natively and Space
 * follows the skin's redirect like every other bar button. `aria-expanded`
 * mirrors the drawer, which also gives it the skin's pressed look.
 */
export class CaramelDrawerToggleElement extends Base {
  static readonly tagName = 'caramel-drawer-toggle';

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'for'];
  }

  readonly #i18n = new I18nController(this, i18nContext);

  #drawer: CaramelDrawerElement | null = null;
  #drawerAbort: AbortController | null = null;
  #retries = 0;
  #waitingForDrawer = false;
  /** Tag of the undefined ancestor we wait for, so one connect waits once. */
  #waitingFor: string | null = null;
  #button: HTMLButtonElement | null = null;

  /** The bound `<caramel-drawer>`, or null. */
  get drawer(): CaramelDrawerElement | null {
    return this.#drawer;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerDrawerI18n();
    this.#retries = 0;
    this.#ensureButton();
    this.#awaitProvider();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#detach();
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback?.(name, old, value);
    if (!this.isConnected || old === value) return;
    if (name === 'for') {
      this.#retries = 0;
      this.#detach();
    }
    this.requestUpdate();
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    this.#resolveDrawer();
    const drawer = this.#drawer;
    this.hidden = !drawer || drawer.tabs.length === 0;
    const button = this.#button;
    if (!drawer || !button) return;

    const open = drawer.open;
    const t = this.#i18n.value;
    const text = open
      ? t(DRAWER_KEYS.close, { default: DRAWER_DEFAULTS.close })
      : t(DRAWER_KEYS.open, { default: DRAWER_DEFAULTS.open });
    setAttr(button, 'aria-expanded', open ? 'true' : 'false');
    const panelId = drawer.panelId;
    if (panelId) setAttr(button, 'aria-controls', panelId);
    setAttr(button, 'aria-label', text);
    setAttr(button, 'title', text);
  }

  #ensureButton(): void {
    if (this.#button) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-button caramel-drawer-toggle-button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', DRAWER_DEFAULTS.open);
    button.append(
      createIconElement(icons.playlist, { className: 'media-button-icon caramel-icon caramel-icon-playlist' }),
    );
    // Own-child listener: lives with the element, survives reconnects.
    button.addEventListener('click', () => this.#drawer?.toggle());
    this.replaceChildren(button);
    this.#button = button;
  }

  #resolveDrawer(): void {
    if (this.#drawer?.isConnected) return;
    this.#detach();
    const forId = this.getAttribute('for');
    let candidate: Element | null = forId ? document.getElementById(forId) : null;
    if (!candidate) candidate = this.closest('video-player')?.querySelector('caramel-drawer') ?? null;
    if (candidate && typeof (candidate as CaramelDrawerElement).toggle !== 'function') {
      // Present but not upgraded yet: wait once for the definition.
      if (!this.#waitingForDrawer && typeof customElements !== 'undefined' && !customElements.get('caramel-drawer')) {
        this.#waitingForDrawer = true;
        void customElements.whenDefined('caramel-drawer').then(() => {
          this.#waitingForDrawer = false;
          if (this.isConnected) this.requestUpdate();
        });
      }
      candidate = null;
    }
    if (!candidate) {
      // The drawer is appended after the control bar (skin extras, React siblings).
      if (this.#retries < LOOKUP_RETRIES && typeof requestAnimationFrame === 'function') {
        this.#retries++;
        requestAnimationFrame(() => this.isConnected && this.requestUpdate());
      }
      return;
    }
    const drawer = candidate as CaramelDrawerElement;
    this.#drawer = drawer;
    const abort = new AbortController();
    const refresh = () => this.requestUpdate();
    drawer.addEventListener('caramel-drawer-tabs', refresh, { signal: abort.signal });
    drawer.addEventListener('caramel-drawer-toggle', refresh, { signal: abort.signal });
    this.#drawerAbort = abort;
  }

  #detach(): void {
    this.#drawerAbort?.abort();
    this.#drawerAbort = null;
    this.#drawer = null;
  }

  /**
   * The player answers context requests only once it is defined. When this
   * element registers first, its i18n controller asks an un-upgraded
   * `<video-player>` (or `<media-i18n>`), nobody answers and it never asks
   * again. Wait for the nearest undefined ancestor, then ask again.
   */
  #awaitProvider(): void {
    if (this.#waitingFor || typeof customElements === 'undefined') return;
    const tag = undefinedAncestorTag(this);
    if (!tag) return;
    this.#waitingFor = tag;
    void customElements.whenDefined(tag).then(() => {
      this.#waitingFor = null;
      if (!this.isConnected) return;
      // Controllers dispatch their context requests on connect.
      super.disconnectedCallback();
      super.connectedCallback();
      this.#awaitProvider();
    });
  }
}

function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-drawer-toggle': CaramelDrawerToggleElement;
  }
}
