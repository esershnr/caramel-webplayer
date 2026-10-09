'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { ChapterSelectDetail } from './element.js';

export interface ChaptersPanelProps {
  /** `id` of the `<video-player>` the panel follows. */
  playerId?: string | undefined;
  /** Heading text. Defaults to the translated "Chapters". */
  heading?: string | undefined;
  /** Hide the heading. */
  noHeading?: boolean | undefined;
  onChapterSelect?: ((detail: ChapterSelectDetail) => void) | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/**
 * React wrapper for <esp-chapters-panel>. Place it anywhere on the page and
 * point it at the player with `playerId`. Registers the element in the browser
 * only (Next.js App Router safe).
 */
export function ChaptersPanel({ playerId, heading, noHeading, onChapterSelect, className, style }: ChaptersPanelProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    void import('./define.js');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controller = new AbortController();
    el.addEventListener(
      'esp-chapter-select',
      (e) => onChapterSelect?.((e as CustomEvent<ChapterSelectDetail>).detail),
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, [onChapterSelect]);

  return (
    <esp-chapters-panel
      ref={ref}
      class={className}
      style={style}
      for={playerId}
      heading={heading}
      no-heading={noHeading ? '' : undefined}
    />
  );
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'esp-chapters-panel': {
        ref?: import('react').Ref<HTMLElement> | undefined;
        class?: string | undefined;
        style?: import('react').CSSProperties | undefined;
        for?: string | undefined;
        heading?: string | undefined;
        'no-heading'?: string | undefined;
        lang?: string | undefined;
      };
    }
  }
}
