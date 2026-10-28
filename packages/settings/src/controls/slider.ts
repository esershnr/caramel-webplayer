import { UIElement } from '@videojs/html';
import { type SettingsRange, snapToRange } from '../schema.js';
import { MenuItemRegistration } from './menu-context.js';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

/** Detail of `caramel-settings-slider-change`. */
export interface SettingsSliderChangeDetail {
  value: number;
}

/** Position of a value on the track, 0 to 1. */
export function sliderRatio(value: number, range: SettingsRange): number {
  const span = range.max - range.min;
  if (!(span > 0) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, (value - range.min) / span));
}

/** Value at a track position (0 to 1), clamped and snapped to the range's step. */
export function sliderValueFromRatio(ratio: number, range: SettingsRange): number {
  const r = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return snapToRange(range.min + r * (range.max - range.min), range);
}

/** Step of PageUp / PageDown: about a fifth of the range, never less than one step. */
export function sliderPageStep(range: SettingsRange): number {
  const steps = Math.max(1, Math.round((range.max - range.min) / range.step / 5));
  return steps * range.step;
}

/**
 * New value for a key press, or null when the slider does not handle the key.
 * ArrowUp and ArrowDown are not handled: they move between menu items. In a
 * right-to-left layout the horizontal arrows swap, like a native range input.
 */
export function sliderKeyValue(key: string, value: number, range: SettingsRange, rtl = false): number | null {
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case forward:
      return snapToRange(value + range.step, range);
    case back:
      return snapToRange(value - range.step, range);
    case 'PageUp':
      return snapToRange(value + sliderPageStep(range), range);
    case 'PageDown':
      return snapToRange(value - sliderPageStep(range), range);
    case 'Home':
      return range.min;
    case 'End':
      return range.max;
    default:
      return null;
  }
}

/** Keys the slider consumes so the menu never sees them. */
const OWN_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ' ']);

let counter = 0;

/**
 * <caramel-settings-slider>
 *
 * A numeric control that is itself a menu item: the menu highlights and
 * focuses it like any other row, ArrowUp and ArrowDown still move between
 * rows, and ArrowLeft / ArrowRight / Home / End / PageUp / PageDown change the
 * value (the menu never sees those, so ArrowLeft does not close the page).
 * Pointer drags on the track preview the value and commit it on release.
 *
 * Properties: `range` ({ min, max, step }), `value`, `format` (value text,
 * also the `aria-valuetext`). Methods: `setLabel(node)`.
 * Event: `caramel-settings-slider-change` (detail: { value }) after a key step
 * or a drag, bubbling.
 */
export class CaramelSettingsSliderElement extends Base {
  static readonly tagName = 'caramel-settings-slider';

  readonly #registration: MenuItemRegistration | null =
    typeof HTMLElement === 'undefined' ? null : new MenuItemRegistration(this);
  #range: SettingsRange = { min: 0, max: 100, step: 1 };
  #value = 0;
  /** Value shown while a drag is running; committed on release. */
  #preview: number | null = null;
  #format: (value: number) => string = (value) => String(value);
  #label: HTMLSpanElement | null = null;
  #text: HTMLSpanElement | null = null;
  #track: HTMLSpanElement | null = null;
  #pointer: number | null = null;

  get range(): SettingsRange {
    return this.#range;
  }

  set range(value: SettingsRange) {
    if (!value || !(value.max > value.min) || !(value.step > 0)) return;
    this.#range = { min: value.min, max: value.max, step: value.step };
    this.#value = snapToRange(this.#value, this.#range);
    this.#render();
  }

  get value(): number {
    return this.#value;
  }

  set value(value: number) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    this.#value = snapToRange(n, this.#range);
    this.#render();
  }

  get format(): (value: number) => string {
    return this.#format;
  }

  set format(fn: (value: number) => string) {
    if (typeof fn !== 'function') return;
    this.#format = fn;
    this.#render();
  }

  /** True while a pointer drag is running (the host should not overwrite the value then). */
  get dragging(): boolean {
    return this.#pointer !== null;
  }

  /** Puts the visible label (text or a `<media-text>`) into the row; it names the slider. */
  setLabel(node: Node | string): void {
    this.#ensure();
    this.#label!.replaceChildren(node);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#ensure();
    this.#registration?.connect();
    this.#render();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#registration?.disconnect();
    this.#endDrag(false);
  }

  /** Builds the row once. Own-child listeners live with the element and survive reconnects. */
  #ensure(): void {
    if (this.#track) return;
    const id = `caramel-settings-slider-${++counter}`;
    const head = document.createElement('span');
    head.className = 'caramel-settings-slider-head';
    const label = document.createElement('span');
    label.className = 'caramel-settings-slider-label';
    label.id = `${id}-label`;
    const text = document.createElement('span');
    text.className = 'caramel-settings-slider-value';
    text.setAttribute('aria-hidden', 'true');
    head.append(label, text);

    const track = document.createElement('span');
    track.className = 'caramel-settings-slider-track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.className = 'caramel-settings-slider-fill';
    const thumb = document.createElement('span');
    thumb.className = 'caramel-settings-slider-thumb';
    track.append(fill, thumb);

    this.append(head, track);
    this.setAttribute('role', 'slider');
    this.setAttribute('aria-labelledby', label.id);
    this.#label = label;
    this.#text = text;
    this.#track = track;

    this.addEventListener('keydown', (event) => this.#onKeyDown(event));
    this.addEventListener('pointerenter', () => this.#registration?.highlightFromPointer());
    track.addEventListener('pointerdown', (event) => this.#onPointerDown(event));
    track.addEventListener('pointermove', (event) => this.#onPointerMove(event));
    track.addEventListener('pointerup', (event) => {
      event.stopPropagation();
      if (event.pointerId === this.#pointer) this.#endDrag(true);
    });
    track.addEventListener('pointercancel', (event) => {
      if (event.pointerId === this.#pointer) this.#endDrag(true);
    });
    track.addEventListener('lostpointercapture', (event) => {
      if (event.pointerId === this.#pointer) this.#endDrag(true);
    });
  }

  #isRtl(): boolean {
    try {
      return this.matches(':dir(rtl)');
    } catch {
      return this.closest('[dir]')?.getAttribute('dir') === 'rtl';
    }
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (!OWN_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    // The menu moves its highlight on Home / End even when default-prevented: stop it here.
    event.preventDefault();
    event.stopPropagation();
    const next = sliderKeyValue(event.key, this.#value, this.#range, this.#isRtl());
    if (next === null) return;
    this.#commit(next);
  }

  #ratioAt(event: PointerEvent): number {
    const rect = this.#track!.getBoundingClientRect();
    if (!(rect.width > 0)) return sliderRatio(this.#value, this.#range);
    const ratio = (event.clientX - rect.left) / rect.width;
    return this.#isRtl() ? 1 - ratio : ratio;
  }

  #onPointerDown(event: PointerEvent): void {
    // Nothing behind the menu (the gesture layer) gets the press.
    event.stopPropagation();
    if (event.button !== 0 || this.#pointer !== null) return;
    event.preventDefault();
    this.#pointer = event.pointerId;
    try {
      this.#track!.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events have no active pointer to capture.
    }
    this.toggleAttribute('data-dragging', true);
    this.focus({ preventScroll: true });
    this.#preview = sliderValueFromRatio(this.#ratioAt(event), this.#range);
    this.#render();
  }

  #onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.#pointer) return;
    const next = sliderValueFromRatio(this.#ratioAt(event), this.#range);
    if (next === this.#preview) return;
    this.#preview = next;
    this.#render();
  }

  #endDrag(commit: boolean): void {
    if (this.#pointer === null) return;
    const pointer = this.#pointer;
    const preview = this.#preview;
    this.#pointer = null;
    this.#preview = null;
    this.removeAttribute('data-dragging');
    try {
      if (this.#track?.hasPointerCapture?.(pointer)) this.#track.releasePointerCapture(pointer);
    } catch {
      // Already released.
    }
    if (commit && preview !== null) this.#commit(preview);
    else this.#render();
  }

  #commit(value: number): void {
    const changed = value !== this.#value;
    this.#value = value;
    this.#render();
    if (!changed) return;
    this.dispatchEvent(
      new CustomEvent<SettingsSliderChangeDetail>('caramel-settings-slider-change', {
        detail: { value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #render(): void {
    if (!this.#track || !this.#text) return;
    const value = this.#preview ?? this.#value;
    const text = this.#format(value);
    setAttr(this, 'aria-valuemin', String(this.#range.min));
    setAttr(this, 'aria-valuemax', String(this.#range.max));
    setAttr(this, 'aria-valuenow', String(value));
    setAttr(this, 'aria-valuetext', text);
    if (this.#text.textContent !== text) this.#text.textContent = text;
    this.style.setProperty('--caramel-settings-slider-progress', String(sliderRatio(value, this.#range)));
  }
}

function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-settings-slider': CaramelSettingsSliderElement;
  }
}
