'use client';

import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';
import type { PlaylistChangeDetail, PlaylistEndedDetail } from './element.js';
import type { PlaylistItem } from './types.js';

/** Turns React's useId into a safe `id`/`for` value. */
function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, '');
  return cleaned ? `caramel-playlist-${cleaned}` : 'caramel-playlist';
}

export interface PlaylistProps {
  items: readonly PlaylistItem[];
  startIndex?: number | undefined;
  loop?: boolean | undefined;
  /** Advance when an item ends. Default true. */
  autoAdvance?: boolean | undefined;
  /** Resume storage namespace. Default `default`. */
  listId?: string | undefined;
  /** Remember and restore positions. Default true. */
  resume?: boolean | undefined;
  /** Id of the `<video-player>` when the component is rendered outside it. */
  playerId?: string | undefined;
  onChange?: ((detail: PlaylistChangeDetail) => void) | undefined;
  /** The last item ended and nothing follows. */
  onEnded?: ((detail: PlaylistEndedDetail) => void) | undefined;
  /** Id of the controller, for `<PlaylistPanel for>`. Generated when omitted. */
  id?: string | undefined;
}

/**
 * React wrapper for <caramel-playlist>. Render it inside `<CaramelVideoSkin extras>`
 * or anywhere inside the player, or outside it with `playerId`. The skin
 * already gates its media on element registration (its `ready` state), so
 * the playlist finds a mounted media element by the time it runs; it only
 * registers its own elements here, in the browser.
 */
export function Playlist({
  items,
  startIndex,
  loop,
  autoAdvance,
  listId,
  resume,
  playerId,
  onChange,
  onEnded,
  id,
}: PlaylistProps) {
  const ref = useRef<HTMLElement>(null);
  const generatedId = sanitize(useId());
  const elementId = id ?? generatedId;
  const json = useMemo(() => JSON.stringify(items), [items]);

  useEffect(() => {
    void import('./define.js');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controller = new AbortController();
    const { signal } = controller;
    el.addEventListener(
      'caramel-playlist-change',
      (e) => onChange?.((e as CustomEvent<PlaylistChangeDetail>).detail),
      { signal },
    );
    el.addEventListener(
      'caramel-playlist-ended',
      (e) => onEnded?.((e as CustomEvent<PlaylistEndedDetail>).detail),
      { signal },
    );
    return () => controller.abort();
  }, [onChange, onEnded]);

  return (
    <caramel-playlist
      ref={ref}
      id={elementId}
      items={json}
      for={playerId}
      start-index={startIndex === undefined ? undefined : String(startIndex)}
      loop={loop ? '' : undefined}
      no-auto-advance={autoAdvance === false ? '' : undefined}
      list-id={listId}
      no-resume={resume === false ? '' : undefined}
    />
  );
}

export interface PlaylistPanelProps {
  /** Id of the `<Playlist>` / `<caramel-playlist>` controller. Optional inside one. */
  for?: string | undefined;
  heading?: string | undefined;
  noHeading?: boolean | undefined;
  /** Where the previous/next buttons sit. Default `top`. */
  nav?: 'top' | 'bottom' | 'none' | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/** React wrapper for <caramel-playlist-panel>. Renders outside the video, themed by `.caramel-theme`. */
export function PlaylistPanel({ for: forId, heading, noHeading, nav, className, style }: PlaylistPanelProps) {
  useEffect(() => {
    void import('./define.js');
  }, []);

  return (
    <caramel-playlist-panel
      for={forId}
      heading={heading}
      no-heading={noHeading ? '' : undefined}
      nav={nav}
      class={className}
      style={style}
    />
  );
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'caramel-playlist': {
        ref?: import('react').Ref<HTMLElement> | undefined;
        id?: string | undefined;
        items?: string | undefined;
        for?: string | undefined;
        'start-index'?: string | undefined;
        loop?: string | undefined;
        'no-auto-advance'?: string | undefined;
        'list-id'?: string | undefined;
        'no-resume'?: string | undefined;
      };
      'caramel-playlist-panel': {
        ref?: import('react').Ref<HTMLElement> | undefined;
        class?: string | undefined;
        style?: import('react').CSSProperties | undefined;
        for?: string | undefined;
        heading?: string | undefined;
        'no-heading'?: string | undefined;
        nav?: string | undefined;
        children?: import('react').ReactNode;
      };
    }
  }
}
