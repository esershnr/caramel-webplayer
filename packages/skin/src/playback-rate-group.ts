import {
  type MenuRadioItemElement,
  PlaybackRateRadioGroupElement,
  PlayerController,
  playerContext,
  selectPlaybackRate,
  type PropertyValues,
} from '@videojs/html';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof PlaybackRateRadioGroupElement =
  typeof HTMLElement === 'undefined'
    ? (class {} as unknown as typeof PlaybackRateRadioGroupElement)
    : PlaybackRateRadioGroupElement;

/**
 * Rates offered in the speed menu: the Video.js list (0.2x to 2x, fixed in
 * its store and not configurable yet) plus 3x.
 */
export const CARAMEL_PLAYBACK_RATES: readonly number[] = [0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2, 3];

/** Item label, same format as the Video.js speed items ("1.5×"). */
export function formatPlaybackRate(rate: number): string {
  return `${rate}×`;
}

/** Item value, same format as the Video.js speed items ("1.5"). */
export function playbackRateValue(rate: number): string {
  return String(rate);
}

/** Rates from `wanted` that the store list does not offer, in ascending order. */
export function extraPlaybackRates(
  storeRates: readonly number[],
  wanted: readonly number[] = CARAMEL_PLAYBACK_RATES,
): number[] {
  return wanted.filter((rate) => !storeRates.includes(rate)).sort((a, b) => a - b);
}

type RadioItem = MenuRadioItemElement & { value: string; disabled: boolean };
type Indicator = Element & { checked: boolean };

/**
 * <caramel-playback-rate-radio-group>
 *
 * Video.js playback rate radio group with the rates of `CARAMEL_PLAYBACK_RATES`
 * that its store does not list (3x). Video.js renders and checks its own items
 * as usual; the extra items are cloned from the same `<template>`, kept in rate
 * order and selected through the store's `setPlaybackRate`, which sets
 * `media.playbackRate` directly.
 */
export class CaramelPlaybackRateRadioGroupElement extends Base {
  /** Registration name (the inherited `tagName` is typed as the Video.js tag). */
  static readonly caramelTagName = 'caramel-playback-rate-radio-group';

  readonly #rate = new PlayerController(this, playerContext, selectPlaybackRate);
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    this.addEventListener('value-change', this.#onValueChange, { signal: this.#disconnect.signal });
  }

  override disconnectedCallback(): void {
    this.#disconnect?.abort();
    this.#disconnect = null;
    super.disconnectedCallback();
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const state = this.#rate.value;
    if (!state) return;
    const extras = extraPlaybackRates(state.playbackRates);
    if (extras.length === 0) return;
    const disabled = this.disabled || state.playbackRates.length === 0;
    const current = playbackRateValue(state.playbackRate);
    for (const rate of extras) {
      const item = this.#ensureItem(rate);
      item.disabled = disabled;
      for (const indicator of item.querySelectorAll<Indicator>('media-menu-item-indicator')) {
        indicator.checked = item.value === current;
      }
    }
    // The base class published the trigger hint before the extra items
    // existed; publish again so "3×" shows next to "Speed" when it is selected.
    const available = state.playbackRates.length > 0;
    this.publishMenuOptionState(disabled, !available, available ? 'available' : 'unavailable');
  }

  #items(): RadioItem[] {
    return [...this.children].filter((child): child is RadioItem => child.localName === 'media-menu-radio-item');
  }

  /** Finds the item for `rate` or creates it in rate order. Video.js drops it whenever it rebuilds its list. */
  #ensureItem(rate: number): RadioItem {
    const value = playbackRateValue(rate);
    const items = this.#items();
    const existing = items.find((item) => String(item.value) === value);
    if (existing) return existing;
    const template = [...this.children].find((child): child is HTMLTemplateElement => child.localName === 'template');
    const root = template?.content.firstElementChild;
    const item = (
      root?.localName === 'media-menu-radio-item' && !root.nextElementSibling
        ? this.ownerDocument.importNode(root, true)
        : this.ownerDocument.createElement('media-menu-radio-item')
    ) as RadioItem;
    item.value = value;
    item.setAttribute('data-rate', value);
    this.setItemLabel(item, this.formatRate(rate));
    const next = items.find((other) => Number(other.value) > rate);
    if (next) next.before(item);
    else this.append(item);
    return item;
  }

  #onValueChange = (event: Event): void => {
    if (event.target !== this) return;
    const value = (event as CustomEvent<{ value: string }>).detail?.value;
    const state = this.#rate.value;
    if (!state || this.disabled) return;
    // Rates in the store list are handled by Video.js itself.
    const rate = extraPlaybackRates(state.playbackRates).find((candidate) => playbackRateValue(candidate) === value);
    if (rate !== undefined) state.setPlaybackRate(rate);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-playback-rate-radio-group': CaramelPlaybackRateRadioGroupElement;
  }
}
