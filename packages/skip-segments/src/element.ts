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
import { createIconElement, icons } from '@esershnr/caramel-icons';
import { SEGMENT_DEFAULTS, SEGMENT_KEYS, SKIP_DEFAULTS, SKIP_KEYS, registerSkipSegmentsI18n } from './i18n.js';
import { SkipModel } from './model.js';
import {
  geometryInLane,
  laneRange,
  parseAutoSkip,
  segmentAtRatio,
  segmentGeometry,
  type AutoSkipConfig,
  type LaneRange,
  type Segment,
} from './segments.js';

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
 * <caramel-skip-segments>
 *
 * Drop it anywhere inside a Video.js 10 `<media-container>`. It renders the
 * "Skip intro" button where it sits, auto-skips configured segment types and
 * paints segment markers into the player's `<media-time-slider>`.
 *
 *   <caramel-skip-segments
 *     segments='[{"start":0,"end":30,"type":"intro"}]'
 *     auto-skip="recap">
 *   </caramel-skip-segments>
 *
 * Attributes / properties:
 *   segments    JSON array (attribute) or Segment[] (property)
 *   auto-skip   comma separated types, or `all`
 *   hide-after  seconds after which the button hides (0 = never)
 *   no-markers  disable timeline markers
 *
 * Events: `caramel-skip` (detail: SkipEventDetail), `caramel-segment-enter`,
 * `caramel-segment-leave` (detail: { segment }).
 */
export class CaramelSkipSegmentsElement extends Base {
  static readonly tagName = 'caramel-skip-segments';

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
  /** Chapter ranges the lanes were built for (see readLanes). */
  #laneSig = '';
  /** Watches the slider's chapters: new ranges rebuild, highlight is mirrored. */
  #chapterObserver: MutationObserver | null = null;
  /** Pointer listeners on the time slider, for the preview card chip. */
  #sliderEvents: AbortController | null = null;
  #chip: HTMLSpanElement | null = null;
  #lastSrc: string | null = null;
  #lastDuration = 0;
  #disconnect: AbortController | null = null;
  /** Tag of the undefined ancestor we wait for, so one connect waits once. */
  #waitingFor: string | null = null;

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
    this.#markerDuration = 0;
    this.requestUpdate();
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
    this.#awaitProvider();
  }

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
      if (!this.#time.value) {
        // Controllers dispatch their context requests on connect.
        super.disconnectedCallback();
        super.connectedCallback();
      }
      this.#awaitProvider();
    });
  }

  /**
   * A property assigned before the element upgraded (a playlist controller
   * setting `segments` on a not yet defined element) lands as an own property
   * that would shadow the accessor. Re-route it through the setter.
   */
  #upgradeProperty(name: 'segments' | 'autoSkip'): void {
    if (!Object.hasOwn(this, name)) return;
    const value = (this as unknown as Record<string, unknown>)[name];
    delete (this as unknown as Record<string, unknown>)[name];
    (this as unknown as Record<string, unknown>)[name] = value;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#removeMarkers();
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
    this.#emit('caramel-skip', { segment, auto: false, to } satisfies SkipEventDetail);
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

    if (result.entered) this.#emit('caramel-segment-enter', { segment: result.entered });
    if (result.left) this.#emit('caramel-segment-leave', { segment: result.left });

    if (result.seekTo !== null && result.active) {
      void time.seek(result.seekTo);
      this.#emit('caramel-skip', { segment: result.active, auto: true, to: result.seekTo } satisfies SkipEventDetail);
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
    this.#markerDuration = 0;
    this.requestUpdate();
  }

  #ensureButton(): void {
    if (this.#button) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'caramel-skip-button';
    button.tabIndex = -1;
    const label = document.createElement('span');
    label.className = 'caramel-skip-button-label';
    const icon = document.createElement('span');
    icon.className = 'caramel-skip-button-icon';
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

  /**
   * Paints the bands into `<media-time-slider>` as two identical layers: the
   * base layer for the unplayed part and a lighter one clipped to the played
   * part (`--media-slider-fill`), so progress stays readable inside a band.
   * Bands of auto-skipped types carry `data-auto` (striped).
   *
   * Each layer holds one lane per timeline chapter. A lane draws the part of
   * every band that falls inside its chapter, bounded like the chapter track
   * (gaps included), so a band that spans two chapters becomes two rounded
   * pieces. The lane of the chapter under the pointer grows with its track
   * (the chapter's `data-highlighted` is mirrored onto the lane).
   */
  #renderMarkers(duration: number, active: Segment | null): void {
    if (this.hasAttribute('no-markers')) {
      this.#removeMarkers();
      return;
    }
    const slider = this.closest('video-player')?.querySelector<HTMLElement>('media-time-slider');
    if (!slider) return;

    if (!this.#markers || this.#markers.parentElement !== slider) {
      this.#removeMarkers();
      this.#markers = document.createElement('div');
      this.#markers.className = 'caramel-segment-markers';
      this.#markers.setAttribute('aria-hidden', 'true');
      slider.append(this.#markers);
      this.#listenToSlider(slider);
    }

    const lanes = readLanes(slider);
    const laneSig = lanesSignature(lanes);
    const segments = this.#model.segments.filter((s) => segmentGeometry(s, duration)?.width);
    if (duration !== this.#markerDuration || laneSig !== this.#laneSig) {
      this.#markerDuration = duration;
      this.#laneSig = laneSig;
      const auto = this.#model.options.autoSkip;
      const layers = [false, true].map((played) => {
        const layer = document.createElement('div');
        layer.className = 'caramel-segment-layer';
        if (played) layer.dataset['played'] = '';
        for (const range of lanes) {
          const lane = document.createElement('div');
          lane.className = 'caramel-segment-lane';
          lane.style.cssText = range.style;
          segments.forEach((segment, index) => {
            const geo = segmentGeometry(segment, duration)!;
            if (!geometryInLane(geo, range)) return;
            const marker = document.createElement('span');
            marker.className = 'caramel-segment-marker';
            marker.dataset['type'] = segment.type;
            marker.dataset['index'] = String(index);
            if (auto[segment.type]) marker.dataset['auto'] = '';
            marker.style.setProperty('--caramel-seg-start', `${geo.start}%`);
            marker.style.setProperty('--caramel-seg-end', `${geo.start + geo.width}%`);
            lane.append(marker);
          });
          layer.append(lane);
        }
        return layer;
      });
      this.#markers.replaceChildren(...layers);
    }
    this.#syncHighlight(lanes);

    for (const marker of this.#markers.querySelectorAll<HTMLElement>('.caramel-segment-marker')) {
      marker.toggleAttribute('data-active', segments[Number(marker.dataset['index'])] === active);
    }
  }

  /** Copies the chapters' `data-highlighted` onto the matching lanes. */
  #syncHighlight(lanes: readonly Lane[]): void {
    if (!this.#markers) return;
    for (const layer of this.#markers.children) {
      const children = layer.children;
      for (let i = 0; i < children.length; i++) {
        children[i]?.toggleAttribute('data-highlighted', lanes[i]?.highlighted ?? false);
      }
    }
  }

  /**
   * Video.js renders the chapters after the track loads and flips
   * `data-highlighted` on hover; neither updates this element. New ranges
   * rebuild the lanes, anything else only mirrors the highlight.
   */
  #observeChapters(slider: HTMLElement, signal: AbortSignal): void {
    this.#chapterObserver?.disconnect();
    const chapters = slider.querySelector('media-time-slider-chapters');
    if (!chapters) return;
    const observer = new MutationObserver(() => {
      const lanes = readLanes(slider);
      if (lanesSignature(lanes) !== this.#laneSig) {
        this.requestUpdate();
      } else {
        this.#syncHighlight(lanes);
      }
    });
    observer.observe(chapters, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-highlighted', 'style'],
    });
    this.#chapterObserver = observer;
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }

  #removeMarkers(): void {
    this.#markers?.remove();
    this.#markers = null;
    this.#markerDuration = 0;
    this.#laneSig = '';
    this.#chapterObserver = null;
    this.#sliderEvents?.abort();
    this.#sliderEvents = null;
    this.#chip?.remove();
    this.#chip = null;
  }

  /**
   * Type chip in the skin's preview card (`.caramel-preview-label`): while the
   * pointer is over a band the card shows "İntro", "Sponsor", ... in the band
   * color next to the time and chapter title.
   */
  #listenToSlider(slider: HTMLElement): void {
    this.#sliderEvents?.abort();
    this.#sliderEvents = new AbortController();
    const { signal } = this.#sliderEvents;
    this.#observeChapters(slider, signal);
    const update = (event: PointerEvent) => {
      const rect = slider.getBoundingClientRect();
      const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : NaN;
      this.#renderChip(segmentAtRatio(this.#model.segments, ratio, this.#markerDuration));
    };
    slider.addEventListener('pointermove', update, { signal });
    slider.addEventListener('pointerdown', update, { signal });
    slider.addEventListener('pointerleave', () => this.#renderChip(null), { signal });
  }

  #renderChip(segment: Segment | null): void {
    const label = this.#markers?.parentElement?.querySelector('.caramel-preview-label');
    if (!label) return;
    if (!this.#chip || this.#chip.parentElement !== label) {
      this.#chip?.remove();
      this.#chip = document.createElement('span');
      this.#chip.className = 'caramel-preview-segment';
      this.#chip.hidden = true;
      label.append(this.#chip);
    }
    const chip = this.#chip;
    if (!segment) {
      chip.hidden = true;
      return;
    }
    const text = this.#i18n.value(SEGMENT_KEYS[segment.type], { default: SEGMENT_DEFAULTS[segment.type] });
    if (chip.textContent !== text) chip.textContent = text;
    chip.dataset['type'] = segment.type;
    chip.hidden = false;
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

interface Lane extends LaneRange {
  /** Range and gap insets, compared to decide when to rebuild. */
  sig: string;
  /** Inline style for the lane element. */
  style: string;
  highlighted: boolean;
}

/** One lane over the whole track, for sliders without chapters. */
const FULL_LANE: Lane = { sig: 'full', style: '', from: 0, to: 100, highlighted: false };

const lanesSignature = (lanes: readonly Lane[]): string => lanes.map((lane) => lane.sig).join('|');

/**
 * One lane per chapter element Video.js rendered in the slider, with the
 * range (`--media-slider-chapter-start/end`) and the gap insets the skin gives
 * it (`--media-chapter-inset-start/end`), so lanes line up with the tracks.
 */
function readLanes(slider: HTMLElement): Lane[] {
  const host = slider.querySelector('media-time-slider-chapters');
  if (!host) return [FULL_LANE];
  const lanes: Lane[] = [];
  const width = slider.getBoundingClientRect().width;
  for (const chapter of host.children) {
    if (!(chapter instanceof HTMLElement) || chapter.localName === 'template') continue;
    const cs = getComputedStyle(chapter);
    const start = cs.getPropertyValue('--media-slider-chapter-start').trim();
    const end = cs.getPropertyValue('--media-slider-chapter-end').trim();
    if (!start || !end) continue;
    const insetStart = cs.getPropertyValue('--media-chapter-inset-start').trim() || '0';
    const insetEnd = cs.getPropertyValue('--media-chapter-inset-end').trim() || '0';
    const spacing = Number.parseFloat(cs.getPropertyValue('--media-spacing')) || 4;
    lanes.push({
      ...laneRange(
        Number.parseFloat(start),
        Number.parseFloat(end),
        Number.parseFloat(insetStart),
        Number.parseFloat(insetEnd),
        spacing,
        width,
      ),
      sig: `${start} ${end} ${insetStart} ${insetEnd}`,
      style:
        `--caramel-lane-start: ${start}; --caramel-lane-end: ${end}; ` +
        `--caramel-lane-inset-start: ${insetStart}; --caramel-lane-inset-end: ${insetEnd};`,
      highlighted: chapter.hasAttribute('data-highlighted'),
    });
  }
  return lanes.length ? lanes : [FULL_LANE];
}

/** Local name of the closest ancestor that is a custom element not defined yet. */
function undefinedAncestorTag(element: Element): string | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const tag = node.localName;
    if (tag.includes('-') && !customElements.get(tag)) return tag;
  }
  return null;
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-skip-segments': CaramelSkipSegmentsElement;
  }
}
