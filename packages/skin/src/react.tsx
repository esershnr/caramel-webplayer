'use client';

import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { SKIN_TEMPLATE } from './template.js';
import { applyUid, parseOpenTag, sanitizeUid, splitContainer } from './template-utils.js';

export interface CaramelVideoSkinProps {
  /** The media element, for example `<video src="..." playsInline />`. */
  children: ReactNode;
  /** Id of the `<video-player>` element, for panels that use `for`/`playerId`. */
  id?: string | undefined;
  /** Title shown in the top bar. Forwarded to the player. */
  title?: string | undefined;
  poster?: string | undefined;
  /** `lang` for the player's labels. Defaults to the document language. */
  lang?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  /** Extra UI rendered inside the container (skip button, custom controls). */
  extras?: ReactNode;
}

/**
 * Video.js 10 player with the esersahiner skin, for React 19 and the Next.js
 * App Router. Renders custom elements; registration happens in the browser
 * only so server rendering and hydration stay clean.
 */
export function CaramelVideoSkin({ children, id, title, poster, lang, className, style, extras }: CaramelVideoSkinProps) {
  const uid = sanitizeUid(useId());
  // The media mounts only after the player and skin elements are registered.
  // Otherwise the media element connects before <video-player> upgrades and
  // the store misses its first state (mute availability, tracks).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import('./define.js').then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { attrs, inner } = useMemo(() => {
    const { open, inner } = splitContainer(applyUid(SKIN_TEMPLATE, uid));
    return { attrs: parseOpenTag(open), inner };
  }, [uid]);

  const containerClass = [attrs['class'], className].filter(Boolean).join(' ');

  const player = (
    <video-player id={id} content-title={title} poster={poster} style={style}>
      <media-container class={containerClass} data-theme={attrs['data-theme']} data-preset={attrs['data-preset']}>
        {ready ? children : null}
        <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: inner }} />
        {extras}
      </media-container>
    </video-player>
  );

  return lang ? <media-i18n lang={lang}>{player}</media-i18n> : player;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'video-player': {
        children?: import('react').ReactNode;
        id?: string | undefined;
        'content-title'?: string | undefined;
        poster?: string | undefined;
        style?: import('react').CSSProperties | undefined;
        class?: string | undefined;
      };
      'media-container': {
        children?: import('react').ReactNode;
        class?: string | undefined;
        'data-theme'?: string | undefined;
        'data-preset'?: string | undefined;
      };
      'media-i18n': {
        children?: import('react').ReactNode;
        lang?: string | undefined;
      };
    }
  }
}
