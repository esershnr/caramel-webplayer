English | [Türkçe](site-integration.tr.md)

# Caramel Webplayer: site integration

The site was not touched in this phase. The steps below describe what to do when
adding Caramel Webplayer to the esersahiner.com site (Next.js App Router).

## 1. Packages

Install the latest release from npm (see the package changelogs for what changed). The shortest path is the umbrella package (it pulls in all
eight packages; `/react` exposes every wrapper, `/webplayer.css` provides the tokens
plus the skin CSS):

```sh
npm install @esershnr/caramel-webplayer @videojs/html@10.0.1
```

Modular install, if you only want what you need:

```sh
npm install @esershnr/caramel-theme @esershnr/caramel-skin \
  @esershnr/caramel-skip-segments @esershnr/caramel-chapters \
  @esershnr/caramel-playlist @esershnr/caramel-drawer @esershnr/caramel-settings @videojs/html@10.0.1
```

`@videojs/html` (10.0.x) is a peer dependency, so it is installed explicitly.
`react` and `react-dom` (>= 19) are optional peers; the site already has them.
`@esershnr/caramel-icons` comes in automatically as a dependency of the skin.

In the published packages, `exports` only points at `dist/`. Next.js (webpack and
Turbopack) ENABLES the `development` condition in dev mode, so the packages do
not use that condition. Source (`src/*.ts`) is only resolved inside the monorepo,
through the custom `caramel-source` condition (tsconfig, the examples' Vite and
Vitest configs); Next never enables that condition in any mode, so the site
always gets `dist/`.

## 2. CSP (Content-Security-Policy) additions

Add these sources to the existing policy (CDN domain `cdn.esersahiner.com`):

| Directive | Addition | Why |
| --- | --- | --- |
| `media-src` | `https://cdn.esersahiner.com blob:` | HLS segments play through MediaSource via a `blob:` URL |
| `connect-src` | `https://cdn.esersahiner.com` | playlists, byte-range fetches, VTT files |
| `img-src` | `https://cdn.esersahiner.com` | posters and thumbnail sprites |
| `worker-src` | `blob:` (only if hls.js is used) | the bundled `hls-video` engine does not use workers |
| `font-src` | `'self'` | fonts are served same-origin via `@fontsource-variable` |
| `style-src` | no change | the packages use stylesheet files, no inline styles |

Video.js 10 CSP guide: `node_modules/@videojs/html/docs/guides/content-security-policy.md`.

## 3. Component usage (App Router)

Theme tokens go into the global CSS once:

```ts
// app/layout.tsx (or via @import in globals.css)
import '@esershnr/caramel-theme/tokens.css';
// Fonts already come from next/font as --font-heading / --font-body; fonts.css is not needed.
```

The player lives inside a client component (the `'use client'` wrappers register
the elements only in the browser, so the server render stays clean):

```tsx
'use client';
import { useEffect, useState } from 'react';
import { CaramelVideoSkin } from '@esershnr/caramel-skin/react';
import { SkipSegments } from '@esershnr/caramel-skip-segments/react';
import { ChaptersPanel } from '@esershnr/caramel-chapters/react';
import { Playlist, PlaylistPanel } from '@esershnr/caramel-playlist/react';
import { Drawer } from '@esershnr/caramel-drawer/react';
import { Settings } from '@esershnr/caramel-settings/react';
import type { PlaylistItem } from '@esershnr/caramel-playlist';
import '@esershnr/caramel-skin/skin.css';

const MANIFEST = 'https://cdn.esersahiner.com/videos/openwrt-rehber/v1/manifest.json';

export function VideoPage({ lang }: { lang: 'tr' | 'en' }) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  useEffect(() => {
    fetch(MANIFEST).then((r) => r.json()).then((item: PlaylistItem) => setItems([item]));
  }, []);
  return (
    <div className="caramel-theme" lang={lang}>
      <CaramelVideoSkin id="player" lang={lang} extras={<><SkipSegments segments={[]} autoSkip={['recap']} /><Playlist id="playlist" items={items} listId="site" /><Drawer /><Settings /></>}>
        <hls-video playsinline="" crossorigin="anonymous" preload="metadata" />
      </CaramelVideoSkin>
      <ChaptersPanel playerId="player" />
      <PlaylistPanel for="playlist" nav="none" />
    </div>
  );
}
```

For the `hls-video` element, add `import '@videojs/html/media/hls-video'` once per
page (client side). The `declare module 'react'` block in
`examples/react/src/App.tsx` is an example of the JSX typing.

- The HLS `src` must be an absolute URL (the engine rejects relative URLs with `Invalid base URL`); the playlist controller makes relative values absolute against `document.baseURI`, and the manifest already uses absolute URLs.
- Language: the `lang` prop selects both the player labels (`<media-i18n>`) and the
  chapters track (`chapters: { tr, en }`); it follows `<html lang>` changes automatically.
- Theme: the site already puts the `.dark` class on `<html>`; the `.caramel-theme` scope reads it.
- You can also fetch the manifest on the server and pass it as `items`; the component
  renders the player skeleton during SSR and attaches the media element once the
  elements are registered.
- The drawer is optional. Without `<Drawer />` the player is unchanged. It shows a list button in the control bar when the item has chapters or the playlist has at least two items.
- The settings panel is optional too. `<Settings />` adds the Caption style, Player and Display pages to the gear menu and remembers the viewer's choices in `localStorage` (key `caramel-settings`, shared by every player on the origin; `storageKey` separates them). Site defaults go in `defaults` (for example `defaults={{ 'player.autoSkipDelay': 5 }}`); the viewer's stored choices win over them and Reset returns to them. Without `<Settings />` nothing changes.

## 4. Checklist

- CORS permission for `Range` on the CDN (scripts/encode-hls/README.md, section 5).
- A `v2/` path for new encodes, so only the manifest URL changes on the site.
- After installing, verify that both `next dev` and `next build` work; both use the
  packages' `dist/` output (the `caramel-source` condition is monorepo-only).
- License: the skin package is `MIT AND Apache-2.0` (files derived from the Video.js 10
  skin are Apache-2.0); the others are MIT. Details are in each package's `NOTICE` file.
