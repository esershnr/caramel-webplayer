import {
  PlayerController,
  UIElement,
  playerContext,
  selectQuality,
  selectTime,
  type PropertyValues,
} from '@videojs/html';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

/** Marketing label for a frame height; null below 720p. */
export function qualityLabel(height: number | null | undefined): string | null {
  if (!height || !Number.isFinite(height)) return null;
  if (height >= 2160) return '4K';
  if (height >= 1440) return '2K';
  if (height >= 1080) return 'FHD';
  if (height >= 720) return 'HD';
  return null;
}

/**
 * <caramel-quality-badge>
 *
 * Shows HD / FHD / 2K / 4K for the rendition that is playing right now
 * (automatic quality switches update it). Sources without rendition data (a
 * single MP4) fall back to the media element's decoded `videoHeight`.
 * Renders nothing below 720p. Place it inside the settings trigger button.
 */
export class CaramelQualityBadgeElement extends Base {
  static readonly tagName = 'caramel-quality-badge';

  readonly #quality = new PlayerController(this, playerContext, selectQuality);
  // Time updates are the cheapest frequent signal for re-reading videoHeight.
  readonly #time = new PlayerController(this, playerContext, selectTime);
  #label: string | null = null;

  get label(): string | null {
    return this.#label;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    void this.#time.value;
    const active = this.#quality.value?.activeVideoRendition;
    const height = active?.height ?? this.#mediaHeight();
    const label = qualityLabel(height);
    if (label === this.#label) return;
    this.#label = label;
    this.textContent = label ?? '';
    this.toggleAttribute('data-empty', label === null);
    if (label) this.dataset['quality'] = label;
    else delete this.dataset['quality'];
  }

  #mediaHeight(): number | null {
    const container = this.closest('media-container') ?? this.closest('video-player');
    const media = container?.querySelector<HTMLVideoElement>('video, hls-video, hlsjs-video, native-hls-video');
    const height = media?.videoHeight;
    return typeof height === 'number' && height > 0 ? height : null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-quality-badge': CaramelQualityBadgeElement;
  }
}
