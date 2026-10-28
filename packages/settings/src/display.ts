/**
 * Display settings as CSS: forced aspect ratio and color filters on the
 * `<video>`. Pure module; the element measures the container.
 */
import { type AspectRatio, SETTINGS_DEFAULTS, type SettingsValues, type VideoFilter } from './schema.js';

const RATIOS: Readonly<Record<Exclude<AspectRatio, 'default'>, number>> = {
  '4:3': 4 / 3,
  '16:9': 16 / 9,
};

/** Largest box of the ratio that fits in `width` x `height`, rounded; null for `default` or an empty container. */
export function fitBox(width: number, height: number, aspect: AspectRatio): { width: number; height: number } | null {
  if (aspect === 'default') return null;
  const ratio = RATIOS[aspect];
  if (!ratio || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (width / height > ratio) return { width: Math.round(height * ratio), height: Math.round(height) };
  return { width: Math.round(width), height: Math.round(width / ratio) };
}

export const VIDEO_FILTER_CSS: Readonly<Record<VideoFilter, string>> = Object.freeze({
  none: 'none',
  vivid: 'saturate(1.3) contrast(1.05)',
  warm: 'sepia(0.18) saturate(1.1)',
  cool: 'hue-rotate(-8deg) saturate(1.05) brightness(1.02)',
  bright: 'brightness(1.15) contrast(0.95)',
  cinema: 'contrast(1.12) saturate(0.9) brightness(0.97)',
});

export interface DisplayCssInput {
  values: SettingsValues;
  /** Result of `fitBox` for the current container, or null. */
  box: { width: number; height: number } | null;
  /** Selector prefix applied to every rule, with its trailing space. */
  scope: string;
}

/** CSS for the display settings; `''` when every display key is at its default. */
export function displayCss({ values, box, scope }: DisplayCssInput): string {
  const declarations: string[] = [];
  const filter = values['display.filter'];
  if (filter !== SETTINGS_DEFAULTS['display.filter'] && VIDEO_FILTER_CSS[filter]) {
    declarations.push(`filter: ${VIDEO_FILTER_CSS[filter]};`);
  }
  if (values['display.aspect'] !== SETTINGS_DEFAULTS['display.aspect'] && box) {
    declarations.push(
      'position: absolute;',
      'inset: 0;',
      'margin: auto;',
      `width: ${box.width}px;`,
      `height: ${box.height}px;`,
      'object-fit: fill;',
    );
  }
  return declarations.length ? `${scope}video { ${declarations.join(' ')} }` : '';
}
