# @esershnr/caramel-webplayer

Caramel Webplayer in one package: a themed Video.js 10 player with a skin of
morphing Lucide icons, skip intro / recap / outro / sponsor, a chapter list and
a playlist with resume. It depends on and re-exports the six
`@esershnr/caramel-*` packages.

```sh
npm install @esershnr/caramel-webplayer @videojs/html
```

`@videojs/html` 10.0.x is a peer dependency; `react` / `react-dom` >= 19 are
optional peers for the React wrappers.

## Quick start

```ts
import '@esershnr/caramel-webplayer/webplayer.css'; // theme tokens + full skin CSS
import '@esershnr/caramel-webplayer/define'; // registers every element
import { mountSkin } from '@esershnr/caramel-webplayer';

const player = document.querySelector('video-player')!;
const video = Object.assign(document.createElement('video'), { src: '/video.mp4', playsInline: true });
mountSkin(player, { media: video });
```

React:

```tsx
'use client';
import '@esershnr/caramel-webplayer/webplayer.css';
import { EspVideoSkin, SkipSegments } from '@esershnr/caramel-webplayer/react';

<EspVideoSkin id="player" lang="tr" extras={<SkipSegments segments={[{ start: 0, end: 30, type: 'intro' }]} />}>
  <video src="/video.mp4" playsInline />
</EspVideoSkin>
```

| Entry | Contents |
| --- | --- |
| `@esershnr/caramel-webplayer` | Every export of theme, icons, skin, skip-segments, chapters, playlist. `findActiveIndex` exists twice upstream, so it is `findActiveSegmentIndex` and `findActiveChapterIndex` here. |
| `/define` | Registers all elements and loads their stylesheets (browser only). |
| `/react` | All React wrappers (`EspVideoSkin`, `SkipSegments`, `ChaptersPanel`, `Playlist`, `PlaylistPanel`, `Icon`, `MorphIcon`). |
| `/webplayer.css` | Theme tokens and the complete skin stylesheet, for loading CSS before the elements register (SSR). |

Full guide, theming and the modular packages: [root README](../../README.md).

MIT License, Copyright (c) 2026 Eser Şahiner. The skin package it depends on is
`MIT AND Apache-2.0` (files derived from the Video.js 10 default skin).
