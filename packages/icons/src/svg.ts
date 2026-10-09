import type { IconNode } from 'lucide';

export interface SvgOptions {
  /** Rendered size in px. Default 24 (the icon grid). */
  size?: number | undefined;
  strokeWidth?: number | undefined;
  /** Extra class names for the root <svg>. */
  className?: string | undefined;
  /** Accessible label. Without it the svg is aria-hidden. */
  label?: string | undefined;
}

const SVG_ATTRS: Record<string, string> = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

function escapeAttr(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function attrsToString(attrs: Record<string, string | number | undefined>): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${escapeAttr(v as string | number)}"`)
    .join('');
}

/** Serializes a Lucide IconNode to an inline <svg> string. Pure, SSR safe. */
export function iconToSvg(node: IconNode, options: SvgOptions = {}): string {
  const size = options.size ?? 24;
  const root: Record<string, string | number | undefined> = {
    ...SVG_ATTRS,
    width: size,
    height: size,
    'stroke-width': options.strokeWidth ?? 2,
    class: options.className,
  };
  if (options.label) {
    root['role'] = 'img';
    root['aria-label'] = options.label;
  } else {
    root['aria-hidden'] = 'true';
  }
  const children = node.map(([tag, attrs]) => `<${tag}${attrsToString(attrs)}/>`).join('');
  return `<svg${attrsToString(root)}>${children}</svg>`;
}

/** Builds a live SVGSVGElement for the icon. Browser only. */
export function createIconElement(node: IconNode, options: SvgOptions = {}): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = iconToSvg(node, options);
  return template.content.firstElementChild as SVGSVGElement;
}
