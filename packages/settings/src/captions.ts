/**
 * Caption fonts and the stylesheet text that applies the caption settings to
 * `video::cue`. Pure module: the element measures the video and resolves the
 * colors, this file only turns values into CSS.
 */
import {
  BUILTIN_CAPTION_FONTS,
  type CaptionColor,
  normalizeValue,
  SETTINGS_DEFAULTS,
  type SettingsValues,
} from './schema.js';

export interface CaptionFont {
  id: string;
  label: { tr: string; en: string };
  /** CSS `font-family` value; empty for `default`, which inherits the player font. */
  family: string;
}

const BUILTIN_FONTS: readonly CaptionFont[] = [
  { id: 'default', label: { tr: 'Oynatıcı yazı tipi', en: 'Player font' }, family: '' },
  {
    id: 'sans',
    label: { tr: 'Sans', en: 'Sans' },
    family: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', sans-serif",
  },
  { id: 'serif', label: { tr: 'Serif', en: 'Serif' }, family: "'Noto Serif', Georgia, 'Times New Roman', serif" },
  {
    id: 'mono',
    label: { tr: 'Eşit aralıklı', en: 'Mono' },
    family: "ui-monospace, 'Roboto Mono', 'Noto Sans Mono', Menlo, monospace",
  },
  {
    id: 'legible',
    label: { tr: 'Kolay okunur', en: 'High legibility' },
    family: "'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', Lexend, system-ui, sans-serif",
  },
];

const builtinIds: readonly string[] = BUILTIN_CAPTION_FONTS;
const registered = new Map<string, CaptionFont>();

/**
 * Adds a caption font to the picker, or replaces one with the same id. A
 * built-in id replaces that built-in in place; `default` always inherits and
 * cannot be replaced. Ids that the settings schema would reject are ignored.
 */
export function registerCaptionFont(font: CaptionFont): void {
  if (!font || font.id === 'default' || normalizeValue('captions.font', font.id) === undefined) return;
  if (typeof font.family !== 'string') return;
  registered.set(font.id, {
    id: font.id,
    label: { tr: String(font.label?.tr ?? font.id), en: String(font.label?.en ?? font.id) },
    family: font.family,
  });
}

/** Built-ins first, in `BUILTIN_CAPTION_FONTS` order, then the registered fonts in registration order. */
export function getCaptionFonts(): CaptionFont[] {
  const fonts = BUILTIN_FONTS.map((font) => registered.get(font.id) ?? font);
  for (const font of registered.values()) if (!builtinIds.includes(font.id)) fonts.push(font);
  return fonts.map((font) => ({ ...font, label: { ...font.label } }));
}

/** The CSS family of a font id: `''` for `default`, `undefined` for an unknown id. */
export function captionFontFamily(id: string): string | undefined {
  return (registered.get(id) ?? BUILTIN_FONTS.find((font) => font.id === id))?.family;
}

/** Test helper: forgets registered fonts. */
export function resetCaptionFonts(): void {
  registered.clear();
}

/** Resolved CSS color strings for the caption palette plus the box and shadow colors. */
export type CaptionColors = Record<CaptionColor | 'bg' | 'shadow', string>;

export interface CaptionCssInput {
  values: SettingsValues;
  /** Height of the rendered video box in CSS pixels; 0 when unknown. */
  boxHeight: number;
  colors: Partial<CaptionColors>;
  /** Selector prefix applied to every rule, with its trailing space (`''` inside a shadow root). */
  scope: string;
}

function differs<K extends keyof SettingsValues>(values: SettingsValues, key: K): boolean {
  return values[key] !== SETTINGS_DEFAULTS[key];
}

function rule(selector: string, declarations: readonly string[]): string {
  return declarations.length ? `${selector} { ${declarations.join(' ')} }` : '';
}

/**
 * CSS for the caption settings. Only keys that differ from the schema default
 * produce a declaration, so the defaults return `''` and the skin's own caption
 * styling stays untouched.
 */
export function captionCss({ values, boxHeight, colors, scope }: CaptionCssInput): string {
  const cue: string[] = [];
  const track: string[] = [];

  if (differs(values, 'captions.scale') && Number.isFinite(boxHeight) && boxHeight > 0) {
    cue.push(`font-size: ${Math.round(boxHeight * 0.05 * values['captions.scale'])}px;`);
  }
  if (differs(values, 'captions.font')) {
    const family = captionFontFamily(values['captions.font']);
    if (family) cue.push(`font-family: ${family};`);
  }
  if (differs(values, 'captions.bold') && values['captions.bold']) cue.push('font-weight: 700;');
  if (differs(values, 'captions.color')) {
    const color = colors[values['captions.color']];
    if (color) cue.push(`color: ${color};`);
  }
  if (differs(values, 'captions.background') && !values['captions.background']) {
    cue.push('background-color: transparent;');
  }
  if (differs(values, 'captions.shadow') && values['captions.shadow'] && colors.shadow) {
    cue.push(`text-shadow: 0 0 4px ${colors.shadow}, 0 1px 2px ${colors.shadow};`);
  }
  // The documented contrast pairs assume the caramel box, so it comes along
  // whenever the cue is restyled; the defaults still emit nothing.
  if (cue.length > 0 && values['captions.background'] && colors.bg) cue.push(`background-color: ${colors.bg};`);
  if (differs(values, 'captions.offset') && values['captions.offset'] > 0) {
    // Both values lift upward (negative); min keeps the larger lift instead of adding to the skin's.
    track.push(`translate: 0 min(var(--media-caption-track-y, 0px), -${values['captions.offset']}%);`);
  }

  return [rule(`${scope}video::cue`, cue), rule(`${scope}video::-webkit-media-text-track-container`, track)]
    .filter(Boolean)
    .join('\n');
}
