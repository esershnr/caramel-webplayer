# @esershnr/caramel-drawer

A side drawer inside the Video.js 10 player, with chapters and playlist tabs.
A chevron handle on the right edge opens it; it hosts
`<caramel-chapters-panel>` and `<caramel-playlist-panel>`, so viewers can jump
to a chapter or another video without leaving the player. A tab appears only
when it has content (a chapters track, a playlist with two or more items);
with neither, the handle stays hidden and the player looks as before.

```sh
npm install @esershnr/caramel-drawer @videojs/html
```

```ts
import '@esershnr/caramel-drawer/define'; // registers the drawer and both panels, loads the CSS
```

The drawer must be a direct child of `<media-container>`. With
`@esershnr/caramel-skin`, pass it in `extras`:

```ts
import { mountSkin } from '@esershnr/caramel-skin';

const drawer = document.createElement('caramel-drawer');
drawer.setAttribute('for', 'queue'); // optional: the <caramel-playlist> id
mountSkin(player, { media: video, extras: [drawer] });
drawer.addEventListener('caramel-drawer-toggle', (e) => console.log(e.detail.open));
```

React:

```tsx
import { CaramelVideoSkin } from '@esershnr/caramel-skin/react';
import { Drawer } from '@esershnr/caramel-drawer/react';

<CaramelVideoSkin id="player" extras={<Drawer onTabChange={(detail) => console.log(detail.tab)} />}>
  <video src="/video.mp4" playsInline />
</CaramelVideoSkin>
```

| Attribute / property | Type | Description |
| --- | --- | --- |
| `for` | string | Id of the `<caramel-playlist>` controller. Default: the one inside the same `<video-player>`, or an ancestor. |
| `open` | boolean | Open state, reflected to the attribute. Setting the property opens or closes the drawer. |
| `tab` | `chapters` \| `playlist` | Selected tab. A tab without content is applied once it has some. |
| `controller` | element, read only | The bound `<caramel-playlist>`, or `null`. |

| Method | Description |
| --- | --- |
| `show()` | Opens the drawer and moves focus into it. |
| `hide()` | Closes it; focus inside returns to the handle. |
| `toggle()` | Opens or closes. |

| Event | Detail |
| --- | --- |
| `caramel-drawer-toggle` | `{ open: boolean }` |
| `caramel-drawer-tab` | `{ tab: 'chapters' \| 'playlist' }` |

Keyboard: the handle is a button; inside the drawer, arrow keys, Home and End
move between tabs, Escape closes, and keys typed inside never trigger the
player's hotkeys. Touch: swipe left on the handle to open, swipe right on the
handle or the panel to close. The handle hides with the control bar, and the
controls stay visible while the drawer is open. Picking a chapter or video
closes the drawer on narrow players (below 480 px) and keeps it open on wide
ones. The last tab picked is remembered for the browser session.

CSS: `--caramel-drawer-width` (default `clamp(260px, 38%, 380px)`; the drawer
covers the whole player below 30rem). Colors follow the `--caramel-*` theme
tokens.

## Known limitations

On Android, when the player spans the full screen width (fullscreen or
portrait), the system Back gesture owns the right edge of the screen and may
swallow a drag that starts on the handle. Tapping the handle always works.

More: [root README](https://github.com/esershnr/caramel-webplayer#readme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/drawer/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
