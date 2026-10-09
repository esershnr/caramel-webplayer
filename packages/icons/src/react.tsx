'use client';

import { useEffect, type CSSProperties } from 'react';
import type { IconName } from './icons.js';
import { iconToSvg } from './svg.js';
import { getIcon } from './icons.js';

export interface MorphIconProps {
  /** Attribute on the parent (or `target`) to watch, e.g. `data-paused`. */
  watch?: string | undefined;
  /** Icon when the watched attribute is present. */
  on?: IconName | undefined;
  /** Icon when the watched attribute is absent. */
  off?: IconName | undefined;
  /** Full value map, see <caramel-morph-icon> docs. */
  map?: string | undefined;
  /** CSS selector resolved with closest() instead of the parent element. */
  target?: string | undefined;
  spring?: 'smooth' | 'snappy' | 'bouncy' | undefined;
  /** Static icon, no watching. */
  icon?: IconName | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/**
 * React wrapper for <caramel-morph-icon>. Registers the custom element in the
 * browser only, so it is safe in the Next.js App Router.
 */
export function MorphIcon({ className, style, ...rest }: MorphIconProps) {
  useEffect(() => {
    void import('./define.js');
  }, []);
  // React 19 passes unknown props to custom elements as attributes.
  return <caramel-morph-icon class={className} style={style} {...rest} />;
}

export interface IconProps {
  name: IconName;
  size?: number | undefined;
  strokeWidth?: number | undefined;
  className?: string | undefined;
  label?: string | undefined;
}

/** Static Lucide icon rendered as inline SVG. SSR safe. */
export function Icon({ name, size, strokeWidth, className, label }: IconProps) {
  const node = getIcon(name);
  if (!node) return null;
  const html = iconToSvg(node, { size, strokeWidth, className, label });
  // biome-ignore lint/security/noDangerouslySetInnerHtml: markup built by iconToSvg from the bundled icon data
  return <span className="caramel-icon" dangerouslySetInnerHTML={{ __html: html }} />;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'caramel-morph-icon': {
        class?: string | undefined;
        style?: import('react').CSSProperties | undefined;
        watch?: string | undefined;
        on?: string | undefined;
        off?: string | undefined;
        map?: string | undefined;
        target?: string | undefined;
        spring?: string | undefined;
        icon?: string | undefined;
      };
    }
  }
}
