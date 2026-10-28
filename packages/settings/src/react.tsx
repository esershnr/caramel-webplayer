'use client';

import { type CSSProperties, useEffect, useMemo, useRef } from 'react';
import type { SettingsChangeDetail } from './element.js';
import type { SettingsValues } from './schema.js';

export interface SettingsProps {
  /** localStorage key; players with the same key share their settings. Default `caramel-settings`. */
  storageKey?: string | undefined;
  /** Site defaults keyed by settings key. The user's own choices still win. */
  defaults?: Partial<SettingsValues> | undefined;
  /** Called whenever the effective settings change. */
  onChange?: ((detail: SettingsChangeDetail) => void) | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/**
 * React wrapper for <caramel-settings>. Place it inside `<CaramelVideoSkin extras>`
 * so the skin's settings menu shows the Subtitles, Player and Display pages.
 * Registers the element in the browser only (Next.js App Router safe); the
 * defaults travel as a JSON attribute so the server markup matches the client.
 */
export function Settings({ storageKey, defaults, onChange, className, style }: SettingsProps) {
  const ref = useRef<HTMLElement>(null);
  const json = useMemo(() => (defaults ? JSON.stringify(defaults) : undefined), [defaults]);

  useEffect(() => {
    void import('./define.js');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onChange) return;
    const controller = new AbortController();
    el.addEventListener('caramel-settings-change', (e) => onChange((e as CustomEvent<SettingsChangeDetail>).detail), {
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [onChange]);

  return <caramel-settings ref={ref} class={className} style={style} storage-key={storageKey} defaults={json} />;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'caramel-settings': {
        ref?: import('react').Ref<HTMLElement> | undefined;
        class?: string | undefined;
        style?: import('react').CSSProperties | undefined;
        'storage-key'?: string | undefined;
        defaults?: string | undefined;
      };
    }
  }
}
