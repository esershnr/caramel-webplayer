# @esershnr/caramel-skin

The Video.js 10 default video skin, themed with `--caramel-*` tokens and Lucide
morphing icons: clickable time counter, quality badge and sorted quality menu,
timeline preview card, signed seek indicator, Space to play / pause from any
control. A subtree marked `data-caramel-native-space` keeps Space for its own buttons.

The control bar carries two placeholders upgraded by other packages: `<caramel-playlist-nav>` (previous / next) and `<caramel-drawer-toggle>` (drawer button before the settings gear); below 28rem a visible drawer toggle replaces the mute button.

The settings menu carries a third one, `<caramel-settings-menu hidden>`, as the
last entry of its root page. `@esershnr/caramel-settings` fills it with the
Subtitles, Player and Display pages; without that package it stays hidden and
the menu looks as before.

Seeking: the arrow keys, `j` / `l` and a double tap on the left or right side
step 5 seconds. The step is the `value` on the `seekStep` hotkeys and gestures
in the template (`value="5"`, and `value="-5"` for backwards); change it there,
or let `@esershnr/caramel-settings` change it at runtime.

Speed: the speed menu (`<caramel-playback-rate-radio-group>`) lists the
Video.js rates, 0.2x to 2x, plus 3x. The `>` and `<` hotkeys step through the
Video.js list only, so from 3x `>` wraps to 0.2x and `<` goes to 2x.

Clicking or tapping outside an open settings menu only closes the menu. It no
longer plays / pauses the video or shows / hides the controls on the same
press.

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
width with `--caramel-preview-width`. Full guide: [root README](https://github.com/esershnr/caramel-webplayer#readme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/skin/CHANGELOG.md).

License: `MIT AND Apache-2.0`. Our code is MIT (`LICENSE`); files derived from
the Video.js 10 default skin are Apache-2.0 (`LICENSE-APACHE`). See `NOTICE`.
