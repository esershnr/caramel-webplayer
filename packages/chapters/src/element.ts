import { selectTextTrack, selectTime } from '@videojs/html';
import { onI18nRegistryChange, type Translator } from '@videojs/html/i18n';
import { cuesEqual, findActiveIndex, formatTime, nextIndex, type ChapterCue } from './chapters.js';
import { CHAPTERS_DEFAULTS, CHAPTERS_KEYS, createChaptersTranslator, registerChaptersI18n } from './i18n.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/** The slice of the Video.js player store the panel relies on. */
export interface ChapterStore {
  readonly state: object;
  subscribe(callback: () => void): () => void;
}

/** A `<video-player>` (or any element) that exposes a Video.js store. */
export type ChapterPlayerElement = HTMLElement & { readonly store?: ChapterStore | undefined };

export interface ChapterSelectDetail {
  cue: ChapterCue;
  index: number;
}

const PLAYER_TAG = 'video-player';

/**
 * <esp-chapters-panel>
 *
 * A chapter list that lives OUTSIDE the video, on a themed surface. It is fed
 * only by the player store's `chaptersCues` (the first `kind="chapters"` text
 * track), so there is no separate data format.
 *
 *   <video-player id="player">...</video-player>
 *   <esp-chapters-panel for="player"></esp-chapters-panel>
 *
 * Attributes:
 *   for         id of the `<video-player>` to follow
 *   heading     heading text (default: translated "Chapters")
 *   no-heading  hide the heading
 *   lang        overrides the resolved language for the built-in strings
 *
 * Properties:
 *   player      the `<video-player>` element (wins over `for`)
 *   cues        the current cue list (read only)
 *   activeIndex index of the active chapter, or -1 (read only)
 *
 * Events: `esp-chapter-select` (detail: ChapterSelectDetail), bubbles.
 */
export class EspChaptersPanelElement extends Base {
  static readonly tagName = 'esp-chapters-panel';

  static get observedAttributes(): string[] {
    return ['for', 'heading', 'no-heading', 'lang'];
  }

  #player: ChapterPlayerElement | null = null;
  #store: ChapterStore | null = null;
  #unsubscribe: (() => void) | null = null;
  #disconnect: AbortController | null = null;
  #langObserver: MutationObserver | null = null;
  #unsubscribeRegistry: (() => void) | null = null;
  #waitingForDefinition = false;

  #t: Translator | null = null;
  #lang = '';
  #cues: readonly ChapterCue[] = [];
  #activeIndex = -1;
  #rovingIndex = -1;

  #heading: HTMLHeadingElement | null = null;
  #empty: HTMLParagraphElement | null = null;
  #list: HTMLOListElement | null = null;

  /** The player element the panel follows. Setting it wins over `for`. */
  get player(): ChapterPlayerElement | null {
    return this.#player;
  }

  set player(value: ChapterPlayerElement | null) {
    this.#player = value;
    if (this.isConnected) this.#connectPlayer();
  }

  /** The current chapter cues. */
  get cues(): readonly ChapterCue[] {
    return this.#cues;
  }

  /** Index of the active chapter, or -1. */
  get activeIndex(): number {
    return this.#activeIndex;
  }

  connectedCallback(): void {
    registerChaptersI18n();
    this.classList.add('esp-theme');
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    this.#ensureSkeleton();
    this.#resolveTranslator(true);
    this.#observeLang();
    this.#connectPlayer();
  }

  disconnectedCallback(): void {
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#langObserver?.disconnect();
    this.#langObserver = null;
    this.#unsubscribeRegistry?.();
    this.#unsubscribeRegistry = null;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#store = null;
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (old === value || !this.isConnected) return;
    switch (name) {
      case 'for':
        this.#connectPlayer();
        break;
      case 'lang':
        this.#resolveTranslator(true);
        break;
      default:
        this.#renderText();
    }
  }

  /** Seeks to the chapter at `index` and dispatches `esp-chapter-select`. */
  select(index: number): boolean {
    const cue = this.#cues[index];
    if (!cue || !this.#store) return false;
    const time = selectTime(this.#store.state);
    if (!time) return false;
    void time.seek(cue.startTime);
    this.dispatchEvent(
      new CustomEvent<ChapterSelectDetail>('esp-chapter-select', {
        detail: { cue, index },
        bubbles: true,
        composed: true,
      }),
    );
    return true;
  }

  // Player lookup ----------------------------------------------------------

  #findPlayer(): ChapterPlayerElement | null {
    if (this.#player) return this.#player;
    const id = this.getAttribute('for');
    if (id) {
      const root = this.getRootNode();
      const scope = root instanceof Document || root instanceof ShadowRoot ? root : document;
      const found = scope.getElementById(id) ?? document.getElementById(id);
      return (found as ChapterPlayerElement | null) ?? null;
    }
    return this.closest<ChapterPlayerElement>(PLAYER_TAG);
  }

  #connectPlayer(): void {
    const player = this.#findPlayer();
    const store = player?.store ?? null;
    if (store === this.#store && this.#unsubscribe) return;

    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#store = store;

    if (!store) {
      // Not found, or not upgraded yet. Retry once the player class is defined.
      this.#applyCues([]);
      this.#waitForDefinition();
      return;
    }

    this.#unsubscribe = store.subscribe(() => this.#onStoreChange());
    this.#onStoreChange();
  }

  #waitForDefinition(): void {
    if (this.#waitingForDefinition || typeof customElements === 'undefined') return;
    this.#waitingForDefinition = true;
    void customElements
      .whenDefined(PLAYER_TAG)
      .then(() => {
        this.#waitingForDefinition = false;
        if (this.isConnected && !this.#store) this.#connectPlayer();
      })
      .catch(() => {
        this.#waitingForDefinition = false;
      });
  }

  // Store updates ----------------------------------------------------------

  #onStoreChange(): void {
    const store = this.#store;
    if (!store) return;
    const text = selectTextTrack(store.state);
    const time = selectTime(store.state);
    this.#applyCues(text?.chaptersCues ?? []);
    this.#applyActive(findActiveIndex(this.#cues, time?.currentTime ?? NaN));
  }

  #applyCues(cues: readonly ChapterCue[]): void {
    if (cuesEqual(this.#cues, cues)) return;
    this.#cues = cues;
    this.#activeIndex = -1;
    this.#rovingIndex = -1;
    this.#renderList();
  }

  #applyActive(index: number): void {
    if (index === this.#activeIndex) return;
    this.#activeIndex = index;
    const list = this.#list;
    if (!list) return;
    const items = list.children;
    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      if (!li) continue;
      const active = i === index;
      li.toggleAttribute('data-active', active);
      const button = li.firstElementChild;
      if (active) button?.setAttribute('aria-current', 'true');
      else button?.removeAttribute('aria-current');
    }
    // Keep the user's keyboard position while the list has focus.
    if (!list.contains(document.activeElement)) this.#setRoving(index >= 0 ? index : 0);
    if (index >= 0) this.#scrollToActive(index);
  }

  #scrollToActive(index: number): void {
    const li = this.#list?.children[index];
    if (!li) return;
    if (this.scrollHeight <= this.clientHeight) return;
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    li.scrollIntoView({ block: 'nearest', behavior: reduce ? 'instant' : 'smooth' });
  }

  // Rendering --------------------------------------------------------------

  #ensureSkeleton(): void {
    if (this.#list) return;
    const signal = this.#disconnect?.signal ?? new AbortController().signal;

    const heading = document.createElement('h2');
    heading.className = 'esp-chapters-heading esp-heading';

    const empty = document.createElement('p');
    empty.className = 'esp-chapters-empty';

    const list = document.createElement('ol');
    list.className = 'esp-chapters-list';
    list.setAttribute('role', 'list');
    list.addEventListener('click', (event) => this.#onClick(event), { signal });
    list.addEventListener('keydown', (event) => this.#onKeydown(event), { signal });
    list.addEventListener('focusin', (event) => this.#onFocusIn(event), { signal });

    this.replaceChildren(heading, empty, list);
    this.#heading = heading;
    this.#empty = empty;
    this.#list = list;
    this.#renderList();
  }

  #renderList(): void {
    const list = this.#list;
    if (!list) return;
    const nodes: HTMLLIElement[] = [];
    this.#cues.forEach((cue, index) => {
      const li = document.createElement('li');
      li.className = 'esp-chapter';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'esp-chapter-button';
      button.dataset['index'] = String(index);
      button.tabIndex = -1;
      const time = document.createElement('span');
      time.className = 'esp-chapter-time esp-tabular';
      time.textContent = formatTime(cue.startTime);
      const title = document.createElement('span');
      title.className = 'esp-chapter-title';
      title.textContent = cue.text;
      button.append(time, title);
      li.append(button);
      nodes.push(li);
    });
    list.replaceChildren(...nodes);
    this.toggleAttribute('data-empty', nodes.length === 0);
    if (nodes.length > 0) this.#setRoving(0);
    this.#renderText();
  }

  #renderText(): void {
    const t = this.#t;
    if (!t) return;
    const headingText = this.getAttribute('heading') ?? t(CHAPTERS_KEYS.heading, { default: CHAPTERS_DEFAULTS.heading });
    const emptyText = t(CHAPTERS_KEYS.empty, { default: CHAPTERS_DEFAULTS.empty });
    if (this.#heading) {
      if (this.#heading.textContent !== headingText) this.#heading.textContent = headingText;
      this.#heading.hidden = this.hasAttribute('no-heading');
    }
    if (this.#empty) {
      if (this.#empty.textContent !== emptyText) this.#empty.textContent = emptyText;
      this.#empty.hidden = this.#cues.length > 0;
    }
    this.#list?.setAttribute('aria-label', headingText);
  }

  // i18n -------------------------------------------------------------------

  #effectiveLang(): string {
    const own = this.closest('[lang]')?.getAttribute('lang');
    const doc = typeof document === 'undefined' ? '' : document.documentElement.lang;
    return own || doc || 'en';
  }

  #resolveTranslator(force = false): void {
    const lang = this.#effectiveLang();
    if (!force && lang === this.#lang && this.#t) return;
    this.#lang = lang;
    this.#t = createChaptersTranslator(lang);
    this.#renderText();
  }

  #observeLang(): void {
    this.#langObserver?.disconnect();
    this.#unsubscribeRegistry?.();
    if (typeof MutationObserver === 'undefined') return;
    this.#langObserver = new MutationObserver(() => this.#resolveTranslator());
    this.#langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    const ancestor = this.parentElement?.closest('[lang]');
    if (ancestor && ancestor !== document.documentElement) {
      this.#langObserver.observe(ancestor, { attributes: true, attributeFilter: ['lang'] });
    }
    this.#unsubscribeRegistry = onI18nRegistryChange(() => this.#resolveTranslator(true));
  }

  // Interaction ------------------------------------------------------------

  #buttonAt(index: number): HTMLButtonElement | null {
    const li = this.#list?.children[index];
    const button = li?.firstElementChild;
    return button instanceof HTMLButtonElement ? button : null;
  }

  #setRoving(index: number): void {
    if (index === this.#rovingIndex && this.#buttonAt(index)?.tabIndex === 0) return;
    const previous = this.#buttonAt(this.#rovingIndex);
    if (previous) previous.tabIndex = -1;
    const next = this.#buttonAt(index);
    if (next) {
      next.tabIndex = 0;
      this.#rovingIndex = index;
    } else {
      this.#rovingIndex = -1;
    }
  }

  #indexOf(target: EventTarget | null): number {
    if (!(target instanceof Element)) return -1;
    const button = target.closest<HTMLButtonElement>('.esp-chapter-button');
    if (!button || !this.#list?.contains(button)) return -1;
    const index = Number(button.dataset['index']);
    return Number.isInteger(index) ? index : -1;
  }

  #onClick(event: MouseEvent): void {
    const index = this.#indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    this.select(index);
  }

  #onFocusIn(event: FocusEvent): void {
    const index = this.#indexOf(event.target);
    if (index >= 0) this.#setRoving(index);
  }

  #onKeydown(event: KeyboardEvent): void {
    const current = this.#indexOf(event.target);
    if (current < 0) return;
    const length = this.#cues.length;
    let target = -1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        target = nextIndex(current, 1, length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        target = nextIndex(current, -1, length);
        break;
      case 'Home':
      case 'PageUp':
        target = length > 0 ? 0 : -1;
        break;
      case 'End':
      case 'PageDown':
        target = length - 1;
        break;
      default:
        // Enter and Space activate through the native button click.
        return;
    }
    event.preventDefault();
    if (target < 0) return;
    this.#setRoving(target);
    this.#buttonAt(target)?.focus();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'esp-chapters-panel': EspChaptersPanelElement;
  }
}
