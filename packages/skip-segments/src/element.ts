import {
  I18nController,
  PlayerController,
  UIElement,
  i18nContext,
  playerContext,
  selectSource,
  selectTime,
  type PropertyValues,
} from '@videojs/html';
import { createIconElement, icons } from '@esersahiner/player-icons';
import { SKIP_DEFAULTS, SKIP_KEYS, registerSkipSegmentsI18n } from './i18n.js';
import { SkipModel } from './model.js';
import { parseAutoSkip, segmentGeometry, type AutoSkipConfig, type Segment } from './segments.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

export interface SkipEventDetail {
  segment: Segment;
  /** True when auto-skip triggered the seek. */
  auto: boolean;
  to: number;
}

/**
 * <esp-skip-segments>
 *
 * Drop it anywhere inside a Video.js 10 `<media-container>`. It renders the
 * "Skip intro" button where it sits, auto-skips configured segment types and
 * paints segment markers into the player's `<media-time-slider>`.
 *
 *   <esp-skip-segments
 *     segments='[{"start":0,"end":30,"type":"intro"}]'
 *     auto-skip="recap">
 *   </esp-skip-segments>
 *
 * Attributes / properties:
 *   segments    JSON array (attribute) or Segment[] (property)
 *   auto-skip   comma separated types, or `all`
 *   hide-after  seconds after which the button hides (0 = never)
 *   no-markers  disable timeline markers
 *
 * Events: `esp-skip` (detail: SkipEventDetail), `esp-segment-enter`,
 * `esp-segment-leave` (detail: { segment }).
 */
export class EspSkipSegmentsElement extends Base {
  static readonly tagName = 'esp-skip-segments';

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'segments', 'auto-skip', 'hide-after', 'no-markers'];
  }

  readonly #time = new PlayerController(this, playerContext, selectTime);
  readonly #source = new PlayerController(this, playerContext, selectSource);
  readonly #i18n = new I18nController(this, i18nContext);
  readonly #model = new SkipModel();

  #segmentsInput: unknown = [];
  #button: HTMLButtonElement | null = null;
  #label: HTMLSpanElement | null = null;
  #markers: HTMLDivElement | null = null;
  #markerDuration = 0;
  #lastSrc: string | null = null;
  #lastDuration = 0;
  #disconnect: AbortController | null = null;

  /** Segment list. Setting it re-normalizes against the current duration. */
  get segments(): readonly Segment[] {
    return this.#model.segments;
  }

  set segments(value: unknown) {
    // React 19 assigns the JSON attribute as a property after upgrade.
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        value = [];
      }
    }
    this.#segmentsInput = value;
    this.#model.setSegments(value, this.#lastDuration);
    this.#markerDuration = 0;
    this.requestUpdate();
  }

  get autoSkip(): AutoSkipConfig {
    return this.#model.options.autoSkip;
  }

  set autoSkip(value: AutoSkipConfig) {
    this.#model.setOptions({ autoSkip: value });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerSkipSegmentsI18n();
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    this.#ensureButton();
    this.#readAttributes();
    this.#upgradeProperty('segments');
    this.#upgradeProperty('autoSkip');
  }

  /**
   * A property assigned before the element upgraded (a playlist controller
   * setting `segments` on a not yet defined element) lands as an own property
   * that would shadow the accessor. Re-route it through the setter.
   */
  #upgradeProperty(name: 'segments' | 'autoSkip'): void {
    if (!Object.prototype.hasOwnProperty.call(this, name)) return;
    const value = (this as unknown as Record<string, unknown>)[name];
    delete (this as unknown as Record<string, unknown>)[name];
    (this as unknown as Record<string, unknown>)[name] = value;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#markers?.remove();
    this.#markers = null;
    this.#markerDuration = 0;
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback?.(name, old, value);
    if (!this.isConnected) return;
    this.#readAttributes();
  }

  /** Forgets active, auto-skipped and dismissed state (a playlist switching items). */
  reset(): void {
    this.#model.reset();
    this.#markerDuration = 0;
    this.requestUpdate();
  }

  /** Skips the active segment by hand. Returns false when no segment is active. */
  skip(): boolean {
    const time = this.#time.value;
    if (!time) return false;
    const segment = this.#model.active;
    const to = this.#model.skip(time.duration);
    if (to === null || !segment) return false;
    void time.seek(to);
    this.#emit('esp-skip', { segment, auto: false, to } satisfies SkipEventDetail);
    this.requestUpdate();
    return true;
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    const time = this.#time.value;
    if (!time) return;

    const src = this.#source.value?.currentSrc ?? '';
    if (src !== this.#lastSrc) {
      // Going from "no source yet" to the first source is not a source change.
      if (this.#lastSrc) this.#model.reset();
      this.#lastSrc = src;
    }

    if (time.duration !== this.#lastDuration) {
      this.#lastDuration = time.duration;
      this.#model.setSegments(this.#segmentsInput, time.duration);
    }

    const result = this.#model.update({ time: time.currentTime, duration: time.duration });

    if (result.entered) this.#emit('esp-segment-enter', { segment: result.entered });
    if (result.left) this.#emit('esp-segment-leave', { segment: result.left });

    if (result.seekTo !== null && result.active) {
      void time.seek(result.seekTo);
      this.#emit('esp-skip', { segment: result.active, auto: true, to: result.seekTo } satisfies SkipEventDetail);
    }

    this.#renderButton(result.active, result.visible);
    this.#renderMarkers(time.duration, result.active);
  }

  #readAttributes(): void {
    const raw = this.getAttribute('segments');
    if (raw !== null) {
      try {
        this.#segmentsInput = JSON.parse(raw);
      } catch {
        this.#segmentsInput = [];
      }
      this.#model.setSegments(this.#segmentsInput, this.#lastDuration);
      this.#markerDuration = 0;
    }
    const hideAfter = Number(this.getAttribute('hide-after'));
    this.#model.setOptions({
      autoSkip: parseAutoSkip(this.getAttribute('auto-skip')),
      hideAfter: Number.isFinite(hideAfter) ? hideAfter : 0,
    });
    this.requestUpdate();
  }

  #ensureButton(): void {
    if (this.#button) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'esp-skip-button';
    button.tabIndex = -1;
    const label = document.createElement('span');
    label.className = 'esp-skip-button-label';
    const icon = document.createElement('span');
    icon.className = 'esp-skip-button-icon';
    icon.append(createIconElement(icons['skip-forward']));
    button.append(label, icon);
    // Own-child listener: lives with the element, survives reconnects.
    button.addEventListener('click', () => this.skip());
    this.replaceChildren(button);
    this.#button = button;
    this.#label = label;
  }

  #renderButton(active: Segment | null, visible: boolean): void {
    const button = this.#button;
    const label = this.#label;
    if (!button || !label) return;
    if (active) {
      const text = active.label ?? this.#i18n.value(SKIP_KEYS[active.type], { default: SKIP_DEFAULTS[active.type] });
      if (label.textContent !== text) label.textContent = text;
      button.dataset['type'] = active.type;
    }
    button.toggleAttribute('data-visible', visible);
    button.tabIndex = visible ? 0 : -1;
    button.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  #renderMarkers(duration: number, active: Segment | null): void {
    if (this.hasAttribute('no-markers')) {
      this.#markers?.remove();
      this.#markers = null;
      this.#markerDuration = 0;
      return;
    }
    const slider = this.closest('video-player')?.querySelector('media-time-slider');
    if (!slider) return;

    if (!this.#markers || this.#markers.parentElement !== slider) {
      this.#markers?.remove();
      this.#markers = document.createElement('div');
      this.#markers.className = 'esp-segment-markers';
      this.#markers.setAttribute('aria-hidden', 'true');
      slider.append(this.#markers);
      this.#markerDuration = 0;
    }

    if (duration !== this.#markerDuration) {
      this.#markerDuration = duration;
      const nodes: HTMLSpanElement[] = [];
      for (const segment of this.#model.segments) {
        const geo = segmentGeometry(segment, duration);
        if (!geo || geo.width <= 0) continue;
        const marker = document.createElement('span');
        marker.className = 'esp-segment-marker';
        marker.dataset['type'] = segment.type;
        marker.style.setProperty('--esp-seg-start', `${geo.start}%`);
        marker.style.setProperty('--esp-seg-width', `${geo.width}%`);
        nodes.push(marker);
      }
      this.#markers.replaceChildren(...nodes);
    }

    const children = this.#markers.children;
    const segments = this.#model.segments.filter((s) => segmentGeometry(s, duration)?.width);
    for (let i = 0; i < children.length; i++) {
      children[i]?.toggleAttribute('data-active', segments[i] === active);
    }
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'esp-skip-segments': EspSkipSegmentsElement;
  }
}
