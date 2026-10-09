# @esershnr/caramel-skin

The Video.js 10 default video skin, themed with `--caramel-*` tokens and Lucide
morphing icons: clickable time counter, quality badge and sorted quality menu,
timeline preview card, signed seek indicator, Space to play / pause from any
control.

```sh
npm install @esershnr/caramel-skin @videojs/html
```

`@videojs/html` 10.0.x is a peer dependency. `react` / `react-dom` >= 19 are
optional peers for the React wrapper.

```ts
import '@esershnr/caramel-skin/define'; // registers elements, loads the CSS
import { mountSkin } from '@esershnr/caramel-skin';

const player = document.querySelector('video-player')!;
const video = Object.assign(document.createElement('video'), { src: '/video.mp4', playsInline: true });
mountSkin(player, { media: video });
```

```html
<media-i18n lang="tr">
  <video-player></video-player>
</media-i18n>
```

React (`'use client'`, elements register in the browser only):

```tsx
import { CaramelVideoSkin } from '@esershnr/caramel-skin/react';

<CaramelVideoSkin id="player" lang="tr">
  <video src="/video.mp4" playsInline />
</CaramelVideoSkin>
```

Chapters come from `<track kind="chapters" default>`, timeline thumbnails from
`<track kind="metadata" label="thumbnails" default>`. Override the preview
width with `--caramel-preview-width`. Full guide: [root README](../../README.md).

License: `MIT AND Apache-2.0`. Our code is MIT (`LICENSE`); files derived from
the Video.js 10 default skin are Apache-2.0 (`LICENSE-APACHE`). See `NOTICE`.
