'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { Segment, SegmentType } from './segments.js';
import type { SkipCancelEventDetail, SkipCountdownEventDetail, SkipEventDetail } from './element.js';

export interface SkipSegmentsProps {
  segments: readonly Segment[];
  /** Segment types to skip automatically, or `'all'`. */
  autoSkip?: readonly SegmentType[] | 'all' | undefined;
  /** Seconds after which the button hides. 0 keeps it for the whole segment. */
  hideAfter?: number | undefined;
  /**
   * Seconds of media time the button counts down before an automatic skip.
   * 0 (the default) skips at once.
   */
  autoSkipDelay?: number | undefined;
  /** Disable timeline markers. */
  noMarkers?: boolean | undefined;
  onSkip?: ((detail: SkipEventDetail) => void) | undefined;
  onSegmentEnter?: ((segment: Segment) => void) | undefined;
  onSegmentLeave?: ((segment: Segment) => void) | undefined;
  /** A delayed auto-skip started counting down. */
  onSkipCountdown?: ((detail: SkipCountdownEventDetail) => void) | undefined;
  /** A running countdown was cancelled with the close button, Escape or `dismiss()`. */
  onSkipCancel?: ((detail: SkipCancelEventDetail) => void) | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/**
 * React wrapper for <caramel-skip-segments>. Place it inside `<CaramelVideoSkin extras>`
 * or anywhere inside the player's container. Registers the element in the
 * browser only (Next.js App Router safe); segments travel as a JSON attribute
 * so the server markup matches the client.
 */
export function SkipSegments({
  segments,
  autoSkip,
  hideAfter,
  autoSkipDelay,
  noMarkers,
  onSkip,
  onSegmentEnter,
  onSegmentLeave,
  onSkipCountdown,
  onSkipCancel,
  className,
  style,
}: SkipSegmentsProps) {
  const ref = useRef<HTMLElement>(null);
  const json = useMemo(() => JSON.stringify(segments), [segments]);
  const auto = autoSkip === 'all' ? 'all' : autoSkip?.join(',');

  useEffect(() => {
    void import('./define.js');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controller = new AbortController();
    const { signal } = controller;
    el.addEventListener('caramel-skip', (e) => onSkip?.((e as CustomEvent<SkipEventDetail>).detail), { signal });
    el.addEventListener(
      'caramel-segment-enter',
      (e) => onSegmentEnter?.((e as CustomEvent<{ segment: Segment }>).detail.segment),
      { signal },
    );
    el.addEventListener(
      'caramel-segment-leave',
      (e) => onSegmentLeave?.((e as CustomEvent<{ segment: Segment }>).detail.segment),
      { signal },
    );
    el.addEventListener(
      'caramel-skip-countdown',
      (e) => onSkipCountdown?.((e as CustomEvent<SkipCountdownEventDetail>).detail),
      { signal },
    );
    el.addEventListener(
      'caramel-skip-cancel',
      (e) => onSkipCancel?.((e as CustomEvent<SkipCancelEventDetail>).detail),
      {
        signal,
      },
    );
    return () => controller.abort();
  }, [onSkip, onSegmentEnter, onSegmentLeave, onSkipCountdown, onSkipCancel]);

  return (
    <caramel-skip-segments
      ref={ref}
      class={className}
      style={style}
      segments={json}
      auto-skip={auto}
      hide-after={hideAfter === undefined ? undefined : String(hideAfter)}
      auto-skip-delay={autoSkipDelay === undefined ? undefined : String(autoSkipDelay)}
      no-markers={noMarkers ? '' : undefined}
    />
  );
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'caramel-skip-segments': {
        ref?: import('react').Ref<HTMLElement> | undefined;
        class?: string | undefined;
        style?: import('react').CSSProperties | undefined;
        segments?: string | undefined;
        'auto-skip'?: string | undefined;
        'hide-after'?: string | undefined;
        'auto-skip-delay'?: string | undefined;
        'no-markers'?: string | undefined;
      };
    }
  }
}
