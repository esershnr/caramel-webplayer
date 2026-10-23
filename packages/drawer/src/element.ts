import {
  I18nController,
  PlayerController,
  UIElement,
  i18nContext,
  playerContext,
  selectControls,
  selectTextTrack,
  type PropertyValues,
} from '@videojs/html';
import { createIconElement, icons } from '@esershnr/caramel-icons';
import { CHAPTERS_DEFAULTS, CHAPTERS_KEYS } from '@esershnr/caramel-chapters';
import { PLAYLIST_DEFAULTS, PLAYLIST_KEYS, type CaramelPlaylistElement } from '@esershnr/caramel-playlist';
import { DRAWER_DEFAULTS, DRAWER_KEYS, registerDrawerI18n } from './i18n.js';
import { readLastTab, writeLastTab } from './session.js';
import { undefinedAncestorTag } from './provider.js';
import { swipeDecision } from './swipe.js';
import { DRAWER_TABS, chaptersPresent, isDrawerTab, resolveTab, visibleTabs, type DrawerTab } from './tabs.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

export interface DrawerToggleDetail {
  open: boolean;
}

export interface DrawerTabDetail {
  tab: DrawerTab;
}

export interface DrawerTabsDetail {
  tabs: readonly DrawerTab[];
}

/** Frame retries while looking for the playlist controller (frameworks append siblings later). */
const LOOKUP_RETRIES = 30;
/** Below this container width a pick closes the drawer (it covers the whole video there). */
const NARROW_PICK_WIDTH = 480;

/** The playlist panel the drawer hosts; only its `controller` property is used. */
type PlaylistPanel = HTMLElement & { controller: CaramelPlaylistElement | null };

interface Drag {
  id: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  time: number;
}

let counter = 0;

/**
 * <caramel-drawer>
 *
 * A side drawer inside the player: a direct child of `<media-container>`
 * (pass it in the skin's `extras`). It opens from a `<caramel-drawer-toggle>`
 * button in the control bar and sits above the bar on the right, like the
 * settings menu, with two tabs, chapters and playlist, hosting
 * `<caramel-chapters-panel>` and `<caramel-playlist-panel>`. A tab is shown only
 * when it has content; with no content the toggle hides.
 *
 *   <caramel-drawer for="queue"></caramel-drawer>
 *
 * Attributes:
 *   for    id of the `<caramel-playlist>` controller (default: the one inside
 *          the same `<video-player>`, or an ancestor)
 *   open   boolean, reflected
 *   tab    `chapters` or `playlist`
 *
 * Properties: `open`, `tab`, `tabs`, `controller` and `panelId` (the last
 * three read only).
 * Methods: `show()`, `hide()`, `toggle()`.
 * Events: `caramel-drawer-toggle` (detail: DrawerToggleDetail),
 * `caramel-drawer-tab` (detail: DrawerTabDetail), `caramel-drawer-tabs`
 * (detail: DrawerTabsDetail, the visible tabs changed). All bubble.
 *
 * The drawer and the player's menus (the settings menu, any root
 * `<media-menu>` in the same `<video-player>`) take turns: `show()` closes
 * every open menu, and a menu that opens while the drawer is open closes the
 * drawer.
 *
 * The drawer never touches playback. Keys typed inside the panel stay inside
 * it (the player's hotkeys never see them), Escape closes it and returns
 * focus to the toggle, pointer gestures inside it are ignored by the player
 * (`data-interactive`), a touch drag to the right closes it, and the controls
 * stay visible while it is open (a controls lock).
 */
export class CaramelDrawerElement extends Base {
  static readonly tagName = 'caramel-drawer';

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'for', 'open', 'tab'];
  }

  readonly #textTrack = new PlayerController(this, playerContext, selectTextTrack);
  readonly #controls = new PlayerController(this, playerContext, selectControls);
  readonly #i18n = new I18nController(this, i18nContext);

  #open = false;
  #everOpened = false;
  #tab: DrawerTab | null = null;
  /** Tab asked for through `tab` while it was not visible; applied once it is. */
  #requestedTab: DrawerTab | null = null;
  /** True once `tab` was set from outside, so the first open keeps it. */
  #explicitTab = false;
  #visible: readonly DrawerTab[] = [];
  #release: (() => void) | null = null;

  #controller: CaramelPlaylistElement | null = null;
  #unsubscribe: (() => void) | null = null;
  #controllerAbort: AbortController | null = null;
  #retries = 0;
  #waitingForPlaylist = false;

  #track: HTMLTrackElement | null = null;
  #trackAbort: AbortController | null = null;
  /** Tag of the undefined ancestor we wait for, so one connect waits once. */
  #waitingFor: string | null = null;

  #panel: HTMLDivElement | null = null;
  #tablist: HTMLDivElement | null = null;
  #closeButton: HTMLButtonElement | null = null;
  #tabButtons = new Map<DrawerTab, HTMLButtonElement>();
  #tabpanels = new Map<DrawerTab, HTMLDivElement>();
  #playlistPanel: PlaylistPanel | null = null;

  #drag: Drag | null = null;
  #menuObserver: MutationObserver | null = null;

  /** Whether the drawer is open. Setting it opens or closes it. */
  get open(): boolean {
    return this.#open;
  }

  set open(value: boolean) {
    if (value) this.show();
    else this.hide();
  }

  /** The selected tab, or null when no tab has content. */
  get tab(): DrawerTab | null {
    return this.#tab;
  }

  set tab(value: DrawerTab | null) {
    if (!isDrawerTab(value)) return;
    this.#explicitTab = true;
    if (this.#visible.includes(value)) {
      this.#requestedTab = null;
      this.#setTab(value);
    } else {
      this.#requestedTab = value;
    }
  }

  /** The bound `<caramel-playlist>` controller, or null. */
  get controller(): CaramelPlaylistElement | null {
    return this.#controller;
  }

  /** Tabs that have content, in display order. Empty: nothing to open. */
  get tabs(): readonly DrawerTab[] {
    return this.#visible;
  }

  /** Id of the panel region, for a toggle's `aria-controls`. Empty before the first connect. */
  get panelId(): string {
    return this.#panel?.id ?? '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerDrawerI18n();
    this.#retries = 0;
    this.#ensureSkeleton();
    this.#upgradeProperty('tab');
    this.#upgradeProperty('open');
    const tab = this.getAttribute('tab');
    if (isDrawerTab(tab) && !this.#explicitTab) this.tab = tab;
    if (this.hasAttribute('open') && !this.#open) this.#show(false);
    this.#awaitProvider();
    this.#observeMenus();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#releaseLock();
    this.#detachController();
    this.#bindTrack(null);
    this.#drag = null;
    this.#menuObserver?.disconnect();
    this.#menuObserver = null;
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback?.(name, old, value);
    if (old === value) return;
    switch (name) {
      case 'for':
        if (!this.isConnected) return;
        this.#retries = 0;
        this.#detachController();
        this.requestUpdate();
        break;
      case 'open':
        // Before connect, connectedCallback reads the attribute.
        if (!this.isConnected) return;
        if (value !== null) this.show();
        else this.hide();
        break;
      case 'tab':
        if (isDrawerTab(value)) this.tab = value;
        break;
    }
  }

  /** Opens the drawer and moves focus into it. */
  show(): void {
    this.#show(true);
  }

  /** Closes the drawer. Focus inside it returns to the toggle button. */
  hide(): void {
    if (!this.#open) return;
    const panel = this.#panel;
    const active = typeof document === 'undefined' ? null : document.activeElement;
    // Focus returns to the toggle only when it was inside: a programmatic close must not steal it.
    const hadFocus = !!active && this.contains(active);
    this.#open = false;
    this.removeAttribute('data-open');
    this.removeAttribute('open');
    panel?.setAttribute('inert', '');
    this.#releaseLock();
    this.#render();
    if (hadFocus) this.#toggleButton()?.focus({ preventScroll: true });
    this.#emit('caramel-drawer-toggle', { open: false } satisfies DrawerToggleDetail);
  }

  toggle(): void {
    if (this.#open) this.hide();
    else this.show();
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    this.#resolveController();
    this.#refreshVisibility();
    if (this.#open) this.#takeLock();
    this.#render();
  }

  // Open / close -----------------------------------------------------------

  #show(focus: boolean): void {
    if (this.#open) return;
    this.#ensureSkeleton();
    this.#open = true;
    if (!this.#everOpened) {
      this.#everOpened = true;
      // First open: the last tab picked in this session wins, unless `tab` was set.
      if (!this.#explicitTab) {
        const tab = resolveTab(null, this.#visible, readLastTab());
        if (tab) this.#setTab(tab);
      }
    }
    this.setAttribute('data-open', '');
    if (!this.hasAttribute('open')) this.setAttribute('open', '');
    this.#closeMenus();
    this.#panel?.removeAttribute('inert');
    this.#takeLock();
    this.#render();
    if (focus) this.#focusInside();
    this.#emit('caramel-drawer-toggle', { open: true } satisfies DrawerToggleDetail);
  }

  #focusInside(): void {
    const tab = this.#tab;
    let target: HTMLElement | null = null;
    if (tab && this.#tablist && !this.#tablist.hidden) target = this.#tabButtons.get(tab) ?? null;
    if (!target && tab) target = this.#tabpanels.get(tab)?.querySelector<HTMLElement>('button[tabindex="0"]') ?? null;
    if (!target) target = this.#panel;
    target?.focus({ preventScroll: true });
  }

  /**
   * The button of the `<caramel-drawer-toggle>` bound to this drawer (or,
   * while none reports a binding, the first one in the player), when shown.
   */
  #toggleButton(): HTMLButtonElement | null {
    if (typeof document === 'undefined') return null;
    const toggles = Array.from(document.querySelectorAll<HTMLElement & { drawer?: unknown }>('caramel-drawer-toggle'));
    const toggle =
      toggles.find((el) => el.drawer === this) ??
      this.closest('video-player')?.querySelector<HTMLElement>('caramel-drawer-toggle') ??
      null;
    if (!toggle || toggle.hidden) return null;
    return toggle.querySelector<HTMLButtonElement>('.caramel-drawer-toggle-button');
  }

  // Menus ------------------------------------------------------------------

  /** Opening the drawer closes the player's open menus (the settings menu). */
  #closeMenus(): void {
    const player = this.closest('video-player');
    if (!player) return;
    for (const menu of player.querySelectorAll<HTMLElement & { closeMenu?: unknown }>('media-menu[data-open]')) {
      if (typeof menu.closeMenu === 'function') (menu.closeMenu as () => void).call(menu);
    }
  }

  /** A menu that opens while the drawer is open closes the drawer. */
  #observeMenus(): void {
    if (this.#menuObserver || typeof MutationObserver === 'undefined') return;
    const player = this.closest('video-player');
    if (!player) return;
    this.#menuObserver = new MutationObserver((records) => {
      if (!this.#open) return;
      // Read the current state: a menu that opened and closed again in one task is ignored.
      const opened = records.some(
        (record) =>
          record.target instanceof Element &&
          record.target.localName === 'media-menu' &&
          record.target.hasAttribute('data-open'),
      );
      if (opened) this.hide();
    });
    this.#menuObserver.observe(player, { attributes: true, attributeFilter: ['data-open'], subtree: true });
  }

  /** Keeps the control bar (and so the toggle) visible while the drawer is open. */
  #takeLock(): void {
    if (this.#release) return;
    const controls = this.#controls.value;
    if (!controls) return;
    this.#release = controls.requestControlsLock();
  }

  #releaseLock(): void {
    const release = this.#release;
    this.#release = null;
    release?.();
  }

  // Tabs -------------------------------------------------------------------

  #setTab(tab: DrawerTab | null): void {
    if (tab === this.#tab) return;
    this.#tab = tab;
    this.#render();
    if (tab) this.#emit('caramel-drawer-tab', { tab } satisfies DrawerTabDetail);
  }

  /** A tab chosen by the user: remembered for the session. */
  #pickTab(tab: DrawerTab): void {
    writeLastTab(tab);
    this.#requestedTab = null;
    this.#setTab(tab);
  }

  #refreshVisibility(): void {
    const track = this.#findTrack();
    this.#bindTrack(track);
    const chapters = chaptersPresent({
      cueCount: this.#textTrack.value?.chaptersCues.length ?? 0,
      track: track
        ? { readyState: track.readyState ?? 0, mode: (track.track as TextTrack | null | undefined)?.mode ?? 'disabled' }
        : null,
    });
    const playlist = !!this.#controller && this.#controller.items.length >= 2;
    const visible = visibleTabs({ chapters, playlist });
    if (sameTabs(visible, this.#visible)) return;
    this.#visible = visible;
    this.#emit('caramel-drawer-tabs', { tabs: visible } satisfies DrawerTabsDetail);

    let next = resolveTab(this.#tab, visible, readLastTab());
    const requested = this.#requestedTab;
    if (requested && visible.includes(requested)) {
      next = requested;
      this.#requestedTab = null;
    }
    if (next === null) this.hide();
    this.#setTab(next);
  }

  #findTrack(): HTMLTrackElement | null {
    return this.closest('video-player')?.querySelector<HTMLTrackElement>('track[kind="chapters"]') ?? null;
  }

  /** Re-evaluates the chapters tab when the track finishes loading or fails. */
  #bindTrack(track: HTMLTrackElement | null): void {
    if (track === this.#track) return;
    this.#trackAbort?.abort();
    this.#trackAbort = null;
    this.#track = track;
    if (!track) return;
    const abort = new AbortController();
    const refresh = () => this.requestUpdate();
    track.addEventListener('load', refresh, { signal: abort.signal });
    track.addEventListener('error', refresh, { signal: abort.signal });
    this.#trackAbort = abort;
  }

  // Playlist controller ----------------------------------------------------

  #resolveController(): void {
    if (this.#controller?.isConnected) return;
    this.#detachController();
    const forId = this.getAttribute('for');
    let candidate: Element | null = forId ? document.getElementById(forId) : null;
    if (!candidate) candidate = this.closest('video-player')?.querySelector('caramel-playlist') ?? null;
    if (!candidate) candidate = this.closest('caramel-playlist');
    if (candidate && typeof (candidate as CaramelPlaylistElement).subscribe !== 'function') {
      // Present but not upgraded yet: wait once for the definition.
      if (
        !this.#waitingForPlaylist &&
        typeof customElements !== 'undefined' &&
        !customElements.get('caramel-playlist')
      ) {
        this.#waitingForPlaylist = true;
        void customElements.whenDefined('caramel-playlist').then(() => {
          this.#waitingForPlaylist = false;
          if (this.isConnected) this.requestUpdate();
        });
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
    const controller = candidate as CaramelPlaylistElement;
    this.#controller = controller;
    if (this.#playlistPanel) this.#playlistPanel.controller = controller;
    this.#unsubscribe = controller.subscribe(() => this.requestUpdate());
    this.#controllerAbort = new AbortController();
    controller.addEventListener('caramel-playlist-change', () => this.requestUpdate(), {
      signal: this.#controllerAbort.signal,
    });
  }

  #detachController(): void {
    const hadController = !!this.#controller;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#controllerAbort?.abort();
    this.#controllerAbort = null;
    this.#controller = null;
    if (hadController && this.#playlistPanel) this.#playlistPanel.controller = null;
  }

  // Provider ---------------------------------------------------------------

  /**
   * The player answers context requests only once it is defined. When this
   * element registers first, its controllers ask an un-upgraded
   * `<video-player>`, nobody answers and they never ask again. Wait for the
   * nearest undefined ancestor, then ask again. Only undefined tags are
   * awaited: a resolved `whenDefined` that re-armed itself would spin a
   * microtask loop.
   */
  #awaitProvider(): void {
    if (this.#waitingFor || typeof customElements === 'undefined') return;
    const tag = undefinedAncestorTag(this);
    if (!tag) return;
    this.#waitingFor = tag;
    void customElements.whenDefined(tag).then(() => {
      this.#waitingFor = null;
      if (!this.isConnected) return;
      if (!this.#textTrack.value) {
        // Controllers dispatch their context requests on connect.
        super.disconnectedCallback();
        super.connectedCallback();
      }
      this.#awaitProvider();
    });
  }

  /**
   * A property assigned before the element upgraded (React setting `open` on
   * a not yet defined element) lands as an own property that would shadow the
   * accessor. Re-route it through the setter.
   */
  #upgradeProperty(name: 'open' | 'tab'): void {
    if (!Object.hasOwn(this, name)) return;
    const value = (this as unknown as Record<string, unknown>)[name];
    delete (this as unknown as Record<string, unknown>)[name];
    (this as unknown as Record<string, unknown>)[name] = value;
  }

  // Rendering --------------------------------------------------------------

  #ensureSkeleton(): void {
    if (this.#panel) return;
    const id = `caramel-drawer-${++counter}`;
    const panelId = `${id}-panel`;

    this.classList.add('caramel-drawer');
    // Video.js gestures (tap to play, double tap seek) ignore pointers inside.
    this.setAttribute('data-interactive', '');
    // The skin's Space redirect leaves buttons inside to their native activation.
    this.setAttribute('data-caramel-native-space', '');

    const panel = document.createElement('div');
    panel.className = 'caramel-drawer-panel caramel-theme';
    panel.id = panelId;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', DRAWER_DEFAULTS.panel);
    panel.tabIndex = -1;
    panel.setAttribute('inert', '');

    const header = document.createElement('div');
    header.className = 'caramel-drawer-header';
    const tablist = document.createElement('div');
    tablist.className = 'caramel-drawer-tabs';
    tablist.setAttribute('role', 'tablist');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'caramel-drawer-close';
    close.setAttribute('aria-label', DRAWER_DEFAULTS.close);
    close.append(createIconElement(icons.close, { className: 'caramel-drawer-close-icon' }));
    header.append(tablist, close);

    const body = document.createElement('div');
    body.className = 'caramel-drawer-body';

    for (const tab of DRAWER_TABS) {
      const tabId = `${id}-tab-${tab}`;
      const tabpanelId = `${id}-tabpanel-${tab}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'caramel-drawer-tab';
      button.id = tabId;
      button.dataset['tab'] = tab;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.setAttribute('aria-controls', tabpanelId);
      button.tabIndex = -1;
      button.textContent = tab === 'chapters' ? CHAPTERS_DEFAULTS.heading : PLAYLIST_DEFAULTS.heading;
      tablist.append(button);
      this.#tabButtons.set(tab, button);

      const tabpanel = document.createElement('div');
      tabpanel.className = 'caramel-drawer-tabpanel';
      tabpanel.id = tabpanelId;
      tabpanel.dataset['tab'] = tab;
      tabpanel.setAttribute('role', 'tabpanel');
      tabpanel.setAttribute('aria-labelledby', tabId);
      tabpanel.hidden = true;
      this.#tabpanels.set(tab, tabpanel);
      if (tab === 'chapters') {
        const chapters = document.createElement('caramel-chapters-panel');
        chapters.setAttribute('embedded', '');
        chapters.setAttribute('no-heading', '');
        tabpanel.append(chapters);
      } else {
        const playlist = document.createElement('caramel-playlist-panel') as unknown as PlaylistPanel;
        playlist.setAttribute('embedded', '');
        playlist.setAttribute('no-heading', '');
        playlist.setAttribute('nav', 'none');
        tabpanel.append(playlist);
        this.#playlistPanel = playlist;
      }
      body.append(tabpanel);
    }

    panel.append(header, body);

    // Listeners on own children live as long as the element; a disconnect
    // and reconnect must not strip them, so no abort signal here.
    panel.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') this.#onPointerDown(event);
    });
    panel.addEventListener('pointermove', (event) => this.#onPointerMove(event));
    panel.addEventListener('pointerup', (event) => this.#onPointerEnd(event));
    panel.addEventListener('pointercancel', (event) => this.#onPointerEnd(event));
    panel.addEventListener('keydown', (event) => this.#onPanelKey(event));
    panel.addEventListener('keyup', (event) => this.#onPanelKey(event));
    panel.addEventListener('caramel-chapter-select', () => this.#onPick());
    panel.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.caramel-playlist-item')) this.#onPick();
    });

    tablist.addEventListener('click', (event) => {
      const tab = tabOf(event.target);
      if (tab) this.#pickTab(tab);
    });
    tablist.addEventListener('keydown', (event) => this.#onTablistKey(event));
    close.addEventListener('click', () => this.hide());

    this.replaceChildren(panel);
    this.#panel = panel;
    this.#tablist = tablist;
    this.#closeButton = close;
    if (this.#controller && this.#playlistPanel) this.#playlistPanel.controller = this.#controller;
    this.#render();
  }

  #render(): void {
    const panel = this.#panel;
    const tablist = this.#tablist;
    if (!panel || !tablist) return;
    const visible = this.#visible;
    const selected = this.#tab;

    this.dataset['tabs'] = String(visible.length);
    tablist.hidden = visible.length < 2;

    for (const tab of DRAWER_TABS) {
      const button = this.#tabButtons.get(tab);
      const tabpanel = this.#tabpanels.get(tab);
      const isSelected = tab === selected && visible.includes(tab);
      if (button) {
        button.hidden = !visible.includes(tab);
        button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        button.tabIndex = isSelected ? 0 : -1;
      }
      if (tabpanel) tabpanel.hidden = !isSelected;
    }

    this.#renderText();
  }

  #renderText(): void {
    const t = this.#i18n.value;
    const text = (key: string, fallback: string): string => t(key, { default: fallback });
    setAttr(this.#closeButton, 'aria-label', text(DRAWER_KEYS.close, DRAWER_DEFAULTS.close));
    setAttr(this.#panel, 'aria-label', text(DRAWER_KEYS.panel, DRAWER_DEFAULTS.panel));
    setText(this.#tabButtons.get('chapters'), text(CHAPTERS_KEYS.heading, CHAPTERS_DEFAULTS.heading));
    setText(this.#tabButtons.get('playlist'), text(PLAYLIST_KEYS.heading, PLAYLIST_DEFAULTS.heading));
  }

  // Interaction ------------------------------------------------------------

  /** A touch drag on the open panel: a swipe to the right closes it. */
  #onPointerDown(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) return;
    this.#drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      time: event.timeStamp,
    };
  }

  #onPointerMove(event: PointerEvent): void {
    const drag = this.#drag;
    if (!drag || drag.id !== event.pointerId) return;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
  }

  #onPointerEnd(event: PointerEvent): void {
    const drag = this.#drag;
    if (!drag || drag.id !== event.pointerId) return;
    this.#drag = null;
    // pointercancel coordinates are unreliable; use the last move.
    const ended = event.type === 'pointerup';
    const dx = (ended ? event.clientX : drag.lastX) - drag.x;
    const dy = (ended ? event.clientY : drag.lastY) - drag.y;
    const decision = swipeDecision({ dx, dy, dt: event.timeStamp - drag.time, width: this.#containerWidth() });
    if (this.#open && decision === 'right') this.hide();
  }

  #containerWidth(): number {
    const container = this.closest('media-container') ?? this;
    return container.getBoundingClientRect().width;
  }

  /** Keys typed inside the panel never reach the player's hotkeys. */
  #onPanelKey(event: KeyboardEvent): void {
    if (event.key === 'Tab') return;
    if (event.type === 'keydown' && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      return;
    }
    event.stopPropagation();
  }

  /** Tablist pattern: arrows, Home and End move focus and select (roving tabindex). */
  #onTablistKey(event: KeyboardEvent): void {
    const current = tabOf(event.target);
    if (!current) return;
    const tabs = this.#visible;
    const index = tabs.indexOf(current);
    if (index < 0 || tabs.length === 0) return;
    let next: DrawerTab | undefined;
    switch (event.key) {
      case 'ArrowRight':
        next = tabs[(index + 1) % tabs.length];
        break;
      case 'ArrowLeft':
        next = tabs[(index - 1 + tabs.length) % tabs.length];
        break;
      case 'Home':
        next = tabs[0];
        break;
      case 'End':
        next = tabs[tabs.length - 1];
        break;
      default:
        // Enter and Space activate the native button.
        return;
    }
    event.preventDefault();
    if (!next) return;
    this.#pickTab(next);
    this.#tabButtons.get(next)?.focus();
  }

  /** A chapter or playlist item was picked: on a narrow player the drawer gets out of the way. */
  #onPick(): void {
    const width = this.#containerWidth();
    if (width > 0 && width < NARROW_PICK_WIDTH) this.hide();
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

function sameTabs(a: readonly DrawerTab[], b: readonly DrawerTab[]): boolean {
  return a.length === b.length && a.every((tab, i) => tab === b[i]);
}

function tabOf(target: EventTarget | null): DrawerTab | null {
  if (!(target instanceof Element)) return null;
  const value = target.closest<HTMLElement>('.caramel-drawer-tab')?.dataset['tab'];
  return isDrawerTab(value) ? value : null;
}

function setAttr(element: Element | null | undefined, name: string, value: string): void {
  if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function setText(element: Element | null | undefined, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-drawer': CaramelDrawerElement;
  }
}
