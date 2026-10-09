import { PlayerController, UIElement, playerContext, selectTextTrack, type PropertyValues } from '@videojs/html';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

/** Custom property the element writes; the skin's preview width falls back to it. */
export const PREVIEW_NATURAL_WIDTH_VAR = '--caramel-preview-natural-width';

/**
 * Tile width in pixels from a thumbnail cue (`sprite.jpg#xywh=0,0,240,136`,
 * `#xywh=pixel:...`). Null when the cue has no pixel fragment.
 */
export function tileWidthFromCue(text: string): number | null {
  const match = /#xywh=(?:pixel:)?(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/.exec(text);
  const width = match ? Number(match[3]) : NaN;
  return Number.isFinite(width) && width > 0 ? Math.round(width) : null;
}

/** Width of the first cue that names a tile; null for whole-image thumbnails or no track. */
export function previewTileWidth(cues: readonly { text: string }[] | null | undefined): number | null {
  for (const cue of cues ?? []) {
    const width = tileWidthFromCue(cue.text);
    if (width !== null) return width;
  }
  return null;
}

/**
 * <caramel-preview-size>
 *
 * Invisible helper inside the timeline preview card. Reads the sprite tile
 * width from the thumbnails track and exposes it as
 * `--caramel-preview-natural-width` on the enclosing `<media-slider-preview>`, so
 * the card is exactly one tile wide (no upscaling) unless the host sets
 * `--caramel-preview-width`.
 */
export class CaramelPreviewSizeElement extends Base {
  static readonly tagName = 'caramel-preview-size';

  readonly #tracks = new PlayerController(this, playerContext, selectTextTrack);
  #width: number | null = null;
  #target: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
    this.#target = this.closest<HTMLElement>('media-slider-preview') ?? this.parentElement;
    this.#width = null;
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#target?.style.removeProperty(PREVIEW_NATURAL_WIDTH_VAR);
    this.#target = null;
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    const width = previewTileWidth(this.#tracks.value?.thumbnailsTrack?.cues);
    if (width === this.#width) return;
    this.#width = width;
    if (width === null) this.#target?.style.removeProperty(PREVIEW_NATURAL_WIDTH_VAR);
    else this.#target?.style.setProperty(PREVIEW_NATURAL_WIDTH_VAR, `${width}px`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-preview-size': CaramelPreviewSizeElement;
  }
}
