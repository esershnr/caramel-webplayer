'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { DrawerTabDetail, DrawerToggleDetail } from './element.js';
import type { DrawerTab } from './tabs.js';

export interface DrawerProps {
  /** Id of the `<caramel-playlist>` controller. Default: the one inside the same player. */
  for?: string | undefined;
  /** Controlled open state. Leave undefined to let the drawer manage itself. */
  open?: boolean | undefined;
  /** Tab to select: `chapters` or `playlist`. */
  tab?: DrawerTab | undefined;
  onToggle?: ((detail: DrawerToggleDetail) => void) | undefined;
  onTabChange?: ((detail: DrawerTabDetail) => void) | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

type DrawerElement = HTMLElement & { open: boolean };

/**
 * React wrapper for <caramel-drawer>. Place it inside `<CaramelVideoSkin extras>`
 * so it lands directly in the player's container. Registers the element, the
 * `<caramel-drawer-toggle>` control bar button and the chapters and playlist
 * panels it hosts in the browser only, so it is safe in the Next.js App
 * Router. The toggle needs no wrapper: the skin's control bar carries it as a
 * placeholder (left of the settings button), which the registration upgrades.
 */
export function Drawer({ for: forId, open, tab, onToggle, onTabChange, className, style }: DrawerProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    void import('./define.js');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || open === undefined) return;
    const value = open;
    let cancelled = false;
    // Set the property only once the class is registered, so it does not
    // shadow the accessor on a not yet upgraded element.
    void customElements.whenDefined('caramel-drawer').then(() => {
      if (!cancelled) (el as DrawerElement).open = value;
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controller = new AbortController();
    const { signal } = controller;
    el.addEventListener('caramel-drawer-toggle', (e) => onToggle?.((e as CustomEvent<DrawerToggleDetail>).detail), {
      signal,
    });
    el.addEventListener('caramel-drawer-tab', (e) => onTabChange?.((e as CustomEvent<DrawerTabDetail>).detail), {
      signal,
    });
    return () => controller.abort();
  }, [onToggle, onTabChange]);

  return <caramel-drawer ref={ref} class={className} style={style} for={forId} tab={tab} />;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'caramel-drawer': {
        ref?: import('react').Ref<HTMLElement> | undefined;
        class?: string | undefined;
        style?: import('react').CSSProperties | undefined;
        for?: string | undefined;
        open?: boolean | undefined;
        tab?: string | undefined;
      };
    }
  }
}
