import { scrollIntoContainer } from '@esershnr/caramel-theme';
import { UIElement, type PropertyValues } from '@videojs/html';
import type { Translator } from '@videojs/html/i18n';
import { createIconElement, icons } from '@esershnr/caramel-icons';
import type { CaramelPlaylistElement } from './element.js';
import { formatDuration } from './format.js';
import { PLAYLIST_DEFAULTS, PLAYLIST_KEYS, createPlaylistTranslator, registerPlaylistI18n } from './i18n.js';
import type { PlaylistItem } from './types.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

type NavPlacement = 'top' | 'bottom' | 'none';

let headingCounter = 0;
const EMPTY_ITEMS: readonly PlaylistItem[] = [];

/**
 * <caramel-playlist-panel>
 *
 * Themed item list rendered outside the video. Connects to an `<caramel-playlist>`
 * controller through `for="<id>"`, the `controller` property or an
 * `<caramel-playlist>` ancestor, and mirrors its items and current index.
 *
 *   <caramel-playlist id="queue" for="player" items="..."></caramel-playlist>
 *   <caramel-playlist-panel for="queue" heading="Bölümler"></caramel-playlist-panel>
 *
 * Attributes:
 *   for          id of the controller element
 *   heading      heading text (default: localized "Playlist")
 *   no-heading   hide the heading
 *   nav          `top` (default), `bottom` or `none`: where previous/next sit
 *
 * The root element carries the `.caramel-theme` scope class, so the page theme
 * (light/dark) applies. Strings follow the nearest `lang` attribute, or
 * `<html lang>`, and re-resolve when the document language changes.
 */
/** Language of the nearest `lang` ancestor: the `lang` property first (reactive
 *  elements such as <media-i18n> do not reflect it to the attribute), then the attribute. */
function langOf(element: Element | null): string {
  if (!element) return '';
  const own = (element as HTMLElement).lang;
  return (typeof own === 'string' && own) || element.getAttribute('lang') || '';
}

export class CaramelPlaylistPanelElement extends Base {
  static readonly tagName = 'caramel-playlist-panel';

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'for', 'heading', 'no-heading', 'nav'];
  }

  #explicitController: CaramelPlaylistElement | null = null;
  #controller: CaramelPlaylistElement | null = null;
  #unsubscribe: (() => void) | null = null;
  #controllerAbort: AbortController | null = null;
  #disconnect: AbortController | null = null;
  #langObserver: MutationObserver | null = null;
  #waitingForDefinition = false;

  #translator: Translator | null = null;
  #lang = '';

  #headingEl: HTMLHeadingElement | null = null;
  #navEl: HTMLDivElement | null = null;
  #prevButton: HTMLButtonElement | null = null;
  #nextButton: HTMLButtonElement | null = null;
  #scrollEl: HTMLDivElement | null = null;
  #listEl: HTMLOListElement | null = null;
  #emptyEl: HTMLParagraphElement | null = null;

  #renderedItems: readonly PlaylistItem[] | null = null;
  #renderedIndex = -1;
  #focusIndex = -1;
  #navPlacement: NavPlacement = 'top';

  /** The controller to mirror. Wins over `for` and the ancestor lookup. */
  get controller(): CaramelPlaylistElement | null {
    return this.#controller;
  }

  set controller(value: CaramelPlaylistElement | null) {
    this.#explicitController = value;
    if (this.isConnected) this.requestUpdate();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerPlaylistI18n();
    this.classList.add('caramel-theme');
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    this.#ensureSkeleton();
    this.#observeLang();
    this.#renderedItems = null;
    this.#renderedIndex = -1;
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#langObserver?.disconnect();
    this.#langObserver = null;
    this.#detachController();
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback?.(name, old, value);
    if (!this.isConnected) return;
    if (name === 'for') this.#detachController();
    this.requestUpdate();
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    this.#resolveController();
    this.#resolveLanguage();
    this.#renderChrome();
    this.#renderList();
  }

  // Controller wiring ----------------------------------------------------

  #resolveController(): void {
    let candidate: CaramelPlaylistElement | null = this.#explicitController;
    if (!candidate) {
      const forId = this.getAttribute('for');
      if (forId) candidate = document.getElementById(forId) as CaramelPlaylistElement | null;
    }
    if (!candidate) candidate = this.closest('caramel-playlist');

    if (candidate && typeof candidate.subscribe !== 'function') {
      // Not upgraded yet: wait once for the definition. Already defined means
      // the target is not an <caramel-playlist>; do not retry.
      if (typeof customElements !== 'undefined' && !customElements.get('caramel-playlist')) {
        this.#waitForDefinition('caramel-playlist');
      }
      candidate = null;
    }
    if (candidate === this.#controller) return;

    this.#detachController();
    if (!candidate) return;
    this.#controller = candidate;
    this.#unsubscribe = candidate.subscribe(() => this.requestUpdate());
    this.#controllerAbort = new AbortController();
    candidate.addEventListener('caramel-playlist-change', () => this.requestUpdate(), {
      signal: this.#controllerAbort.signal,
    });
    this.#renderedItems = null;
  }

  #detachController(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#controllerAbort?.abort();
    this.#controllerAbort = null;
    this.#controller = null;
    this.#renderedItems = null;
    this.#renderedIndex = -1;
  }

  #waitForDefinition(tag: string): void {
    if (this.#waitingForDefinition || typeof customElements === 'undefined') return;
    this.#waitingForDefinition = true;
    void customElements.whenDefined(tag).then(() => {
      this.#waitingForDefinition = false;
      if (this.isConnected) this.requestUpdate();
    });
  }

  // Language -------------------------------------------------------------

  #observeLang(): void {
    if (this.#langObserver || typeof MutationObserver === 'undefined') return;
    this.#langObserver = new MutationObserver(() => this.requestUpdate());
    this.#langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  #resolveLanguage(): void {
    const lang = langOf(this.closest('[lang]')) || document.documentElement.lang || 'en';
    if (lang === this.#lang && this.#translator) return;
    this.#lang = lang;
    this.#translator = createPlaylistTranslator(lang);
  }

  #t(key: keyof typeof PLAYLIST_KEYS): string {
    return this.#translator?.(PLAYLIST_KEYS[key], { default: PLAYLIST_DEFAULTS[key] }) ?? PLAYLIST_DEFAULTS[key];
  }

  // Rendering ------------------------------------------------------------

  #ensureSkeleton(): void {
    if (this.#listEl) return;

    const heading = document.createElement('h2');
    heading.className = 'caramel-playlist-heading caramel-heading';
    heading.id = `caramel-playlist-heading-${++headingCounter}`;

    const nav = document.createElement('div');
    nav.className = 'caramel-playlist-nav';
    const prev = this.#navButton('skip-back', 'caramel-playlist-prev', () => this.#controller?.previous());
    const next = this.#navButton('skip-forward', 'caramel-playlist-next', () => this.#controller?.next());
    nav.append(prev, next);

    const scroll = document.createElement('div');
    scroll.className = 'caramel-playlist-scroll';
    const list = document.createElement('ol');
    list.className = 'caramel-playlist-list';
    list.setAttribute('role', 'list');
    list.setAttribute('aria-labelledby', heading.id);
    // Own-child listeners live with the element: no abort signal (reconnect safe).
    list.addEventListener('keydown', (event) => this.#onListKeydown(event));
    list.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.caramel-playlist-item');
        if (!button || !this.#listEl?.contains(button)) return;
        const index = Number(button.dataset['index']);
        if (Number.isInteger(index)) this.#controller?.select(index);
      },
    );
    const empty = document.createElement('p');
    empty.className = 'caramel-playlist-empty';
    empty.hidden = true;
    scroll.append(list, empty);

    this.#headingEl = heading;
    this.#navEl = nav;
    this.#prevButton = prev;
    this.#nextButton = next;
    this.#scrollEl = scroll;
    this.#listEl = list;
    this.#emptyEl = empty;
    this.replaceChildren(heading, nav, scroll);
  }

  #navButton(icon: 'skip-back' | 'skip-forward', className: string, action: () => void) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `caramel-playlist-nav-button ${className}`;
    const box = document.createElement('span');
    box.className = 'caramel-playlist-nav-icon';
    box.append(createIconElement(icons[icon]));
    button.append(box);
    button.addEventListener('click', action);
    return button;
  }

  #renderChrome(): void {
    const heading = this.#headingEl;
    const nav = this.#navEl;
    const scroll = this.#scrollEl;
    const list = this.#listEl;
    if (!heading || !nav || !scroll || !list) return;

    const headingText = this.getAttribute('heading') ?? this.#t('heading');
    if (heading.textContent !== headingText) heading.textContent = headingText;
    const hideHeading = this.hasAttribute('no-heading');
    heading.hidden = hideHeading;
    if (hideHeading) {
      list.removeAttribute('aria-labelledby');
      list.setAttribute('aria-label', headingText);
    } else {
      list.setAttribute('aria-labelledby', heading.id);
      list.removeAttribute('aria-label');
    }

    const placement = this.#readNav();
    if (placement !== this.#navPlacement || nav.parentElement !== this) {
      this.#navPlacement = placement;
      nav.hidden = placement === 'none';
      if (placement === 'bottom') this.append(nav);
      else scroll.before(nav);
    }

    const prevLabel = this.#t('previous');
    const nextLabel = this.#t('next');
    this.#prevButton?.setAttribute('aria-label', prevLabel);
    this.#prevButton?.setAttribute('title', prevLabel);
    this.#nextButton?.setAttribute('aria-label', nextLabel);
    this.#nextButton?.setAttribute('title', nextLabel);
    if (this.#emptyEl) this.#emptyEl.textContent = this.#t('empty');
  }

  #readNav(): NavPlacement {
    const raw = this.getAttribute('nav');
    return raw === 'bottom' || raw === 'none' ? raw : 'top';
  }

  #renderList(): void {
    const list = this.#listEl;
    const controller = this.#controller;
    if (!list) return;

    const items = controller?.items ?? EMPTY_ITEMS;
    const index = controller?.index ?? -1;

    if (items !== this.#renderedItems) {
      this.#renderedItems = items;
      this.#renderedIndex = -1;
      this.#focusIndex = -1;
      list.replaceChildren(...items.map((item, i) => this.#renderItem(item, i)));
      if (this.#emptyEl) this.#emptyEl.hidden = items.length > 0;
    }

    if (this.#prevButton) this.#prevButton.disabled = !(controller?.hasPrevious ?? false);
    if (this.#nextButton) this.#nextButton.disabled = !(controller?.hasNext ?? false);

    if (index === this.#renderedIndex) return;
    this.#renderedIndex = index;
    this.#applyActive(index);
    // Keep the user's keyboard position while the list has focus.
    if (!this.#listEl?.contains(document.activeElement)) {
      this.#focusIndex = index >= 0 ? index : items.length > 0 ? 0 : -1;
      this.#applyRoving();
    }
    this.#scrollActiveIntoView(index);
  }

  #renderItem(item: PlaylistItem, index: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'caramel-playlist-row';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'caramel-playlist-item';
    button.dataset['index'] = String(index);
    button.tabIndex = -1;

    const number = document.createElement('span');
    number.className = 'caramel-playlist-number caramel-tabular';
    number.textContent = String(index + 1);

    const thumb = document.createElement('span');
    thumb.className = 'caramel-playlist-thumb';
    if (item.poster) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = item.poster;
      thumb.append(img);
    }

    const text = document.createElement('span');
    text.className = 'caramel-playlist-text';
    const title = document.createElement('span');
    title.className = 'caramel-playlist-title';
    title.textContent = item.title;
    text.append(title);
    const duration = formatDuration(item.duration);
    if (duration) {
      const time = document.createElement('span');
      time.className = 'caramel-playlist-duration caramel-tabular';
      time.textContent = duration;
      text.append(time);
    }

    button.append(number, thumb, text);
    li.append(button);
    return li;
  }

  #buttons(): HTMLButtonElement[] {
    return this.#listEl ? Array.from(this.#listEl.querySelectorAll<HTMLButtonElement>('.caramel-playlist-item')) : [];
  }

  #applyActive(index: number): void {
    const buttons = this.#buttons();
    buttons.forEach((button, i) => {
      const active = i === index;
      const row = button.parentElement;
      if (active) {
        button.setAttribute('aria-current', 'true');
        button.setAttribute('data-active', '');
        row?.setAttribute('data-active', '');
      } else {
        button.removeAttribute('aria-current');
        button.removeAttribute('data-active');
        row?.removeAttribute('data-active');
      }
    });
  }

  #applyRoving(): void {
    const buttons = this.#buttons();
    buttons.forEach((button, i) => {
      button.tabIndex = i === this.#focusIndex ? 0 : -1;
    });
  }

  #scrollActiveIntoView(index: number): void {
    const button = this.#buttons()[index];
    const scroll = this.#scrollEl;
    if (!button || !scroll) return;
    scrollIntoContainer(scroll, button);
  }

  #onListKeydown(event: KeyboardEvent): void {
    const buttons = this.#buttons();
    if (buttons.length === 0) return;
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const from = current >= 0 ? current : Math.max(this.#focusIndex, 0);
    let to: number;
    switch (event.key) {
      case 'ArrowDown':
        to = (from + 1) % buttons.length;
        break;
      case 'ArrowUp':
        to = (from - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = buttons.length - 1;
        break;
      default:
        // Enter and Space activate the focused native <button> on their own.
        return;
    }
    event.preventDefault();
    this.#focusIndex = to;
    this.#applyRoving();
    buttons[to]?.focus();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-playlist-panel': CaramelPlaylistPanelElement;
  }
}
