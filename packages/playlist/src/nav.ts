import { UIElement, type PropertyValues } from '@videojs/html';
import { createIconElement, icons } from '@esershnr/caramel-icons';
import type { EspPlaylistElement } from './element.js';
import { PLAYLIST_DEFAULTS, PLAYLIST_KEYS, createPlaylistTranslator, registerPlaylistI18n } from './i18n.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

const LOOKUP_RETRIES = 30;
/** Like YouTube: "previous" restarts the current item after this many seconds. */
export const RESTART_AFTER_SECONDS = 3;

/**
 * Decides what the previous button does: restart the current item when it
 * has played more than `RESTART_AFTER_SECONDS` or when there is nothing
 * before it, otherwise go to the previous item.
 */
export function previousAction(currentTime: number, hasPrevious: boolean): 'restart' | 'previous' {
  return currentTime > RESTART_AFTER_SECONDS || !hasPrevious ? 'restart' : 'previous';
}

interface StoreLike {
  currentTime: number;
  seek(time: number): Promise<number>;
}

/**
 * <esp-playlist-nav>
 *
 * Previous / next buttons for the control bar. Renders nothing (and stays
 * `hidden`) unless the player contains an `<esp-playlist>` (or `for` names
 * one). Previous follows YouTube: after 3 seconds it restarts the current
 * item, otherwise it goes back; next is disabled on the last item unless the
 * playlist loops. Tooltips carry the neighbouring item's title.
 */
export class EspPlaylistNavElement extends Base {
  static readonly tagName = 'esp-playlist-nav';

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'for'];
  }

  #controller: EspPlaylistElement | null = null;
  #unsubscribe: (() => void) | null = null;
  #controllerAbort: AbortController | null = null;
  #retries = 0;
  #prev: HTMLButtonElement | null = null;
  #next: HTMLButtonElement | null = null;
  #langObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    registerPlaylistI18n();
    this.#retries = 0;
    this.#ensureButtons();
    this.#observeLang();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#langObserver?.disconnect();
    this.#langObserver = null;
    this.#detach();
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback?.(name, old, value);
    if (!this.isConnected) return;
    if (name === 'for') {
      this.#retries = 0;
      this.#detach();
    }
    this.requestUpdate();
  }

  get controller(): EspPlaylistElement | null {
    return this.#controller;
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    this.#resolveController();
    const controller = this.#controller;
    this.hidden = !controller;
    if (!controller || !this.#prev || !this.#next) return;

    const t = createPlaylistTranslator(this.#lang());
    const items = controller.items;
    const index = controller.index;
    const prevTitle = items[index - 1]?.title ?? (controller.loop ? items[items.length - 1]?.title : undefined);
    const nextTitle = items[index + 1]?.title ?? (controller.loop ? items[0]?.title : undefined);
    const prevLabel = t(PLAYLIST_KEYS.previous, { default: PLAYLIST_DEFAULTS.previous });
    const nextLabel = t(PLAYLIST_KEYS.next, { default: PLAYLIST_DEFAULTS.next });

    this.#prev.disabled = false;
    this.#next.disabled = !controller.hasNext;
    label(this.#prev, prevTitle ? `${prevLabel}: ${prevTitle}` : prevLabel);
    label(this.#next, nextTitle ? `${nextLabel}: ${nextTitle}` : nextLabel);
  }

  #ensureButtons(): void {
    if (this.#prev) return;
    this.#prev = this.#button('skip-back', 'esp-playlist-nav-prev', () => this.#previous());
    this.#next = this.#button('skip-forward', 'esp-playlist-nav-next', () => this.#controller?.next());
    this.replaceChildren(this.#prev, this.#next);
  }

  #button(icon: 'skip-back' | 'skip-forward', className: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `media-button esp-playlist-nav-button ${className}`;
    const svg = createIconElement(icons[icon], { className: `media-button-icon esp-icon esp-icon-${icon}` });
    button.append(svg);
    // Own-child listener: lives with the element, survives reconnects.
    button.addEventListener('click', action);
    return button;
  }

  #previous(): void {
    const controller = this.#controller;
    if (!controller) return;
    const store = this.#store();
    const action = previousAction(store?.currentTime ?? 0, controller.hasPrevious);
    if (action === 'previous') controller.previous();
    else store?.seek(0).catch(() => {});
  }

  #store(): StoreLike | null {
    const player = this.closest('video-player') as (Element & { store?: StoreLike }) | null;
    return player?.store ?? null;
  }

  #resolveController(): void {
    if (this.#controller?.isConnected) return;
    this.#detach();
    const forId = this.getAttribute('for');
    let candidate: Element | null = forId ? document.getElementById(forId) : null;
    if (!candidate) candidate = this.closest('video-player')?.querySelector('esp-playlist') ?? null;
    if (!candidate) candidate = this.closest('esp-playlist');
    if (candidate && typeof (candidate as EspPlaylistElement).subscribe !== 'function') {
      // Present but not upgraded yet: wait once for the definition.
      if (typeof customElements !== 'undefined' && !customElements.get('esp-playlist')) {
        void customElements.whenDefined('esp-playlist').then(() => this.isConnected && this.requestUpdate());
      }
      candidate = null;
    }
    if (!candidate) {
      // The controller may be appended after this element (React commits siblings in order).
      if (this.#retries < LOOKUP_RETRIES && typeof requestAnimationFrame === 'function') {
        this.#retries++;
        requestAnimationFrame(() => this.isConnected && this.requestUpdate());
      }
      return;
    }
    const controller = candidate as EspPlaylistElement;
    this.#controller = controller;
    this.#unsubscribe = controller.subscribe(() => this.requestUpdate());
    this.#controllerAbort = new AbortController();
    controller.addEventListener('esp-playlist-change', () => this.requestUpdate(), {
      signal: this.#controllerAbort.signal,
    });
  }

  #detach(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#controllerAbort?.abort();
    this.#controllerAbort = null;
    this.#controller = null;
  }

  #lang(): string {
    const scoped = this.closest('[lang]');
    const own = scoped ? (scoped as HTMLElement).lang || scoped.getAttribute('lang') : '';
    return own || document.documentElement.lang || 'en';
  }

  #observeLang(): void {
    if (this.#langObserver || typeof MutationObserver === 'undefined') return;
    this.#langObserver = new MutationObserver(() => this.requestUpdate());
    const targets = new Set<Element>([document.documentElement]);
    const scoped = this.closest('[lang]');
    if (scoped) targets.add(scoped);
    for (const target of targets) this.#langObserver.observe(target, { attributes: true, attributeFilter: ['lang'] });
  }
}

function label(button: HTMLButtonElement, text: string): void {
  if (button.getAttribute('aria-label') === text) return;
  button.setAttribute('aria-label', text);
  button.setAttribute('title', text);
}

declare global {
  interface HTMLElementTagNameMap {
    'esp-playlist-nav': EspPlaylistNavElement;
  }
}
