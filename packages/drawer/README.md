# @esershnr/caramel-drawer

A side drawer inside the Video.js 10 player, with chapters and playlist tabs.
A list button in the control bar, left of the settings button, opens it; the
drawer sits above the bar on the right, like the settings menu, and hosts
`<caramel-chapters-panel>` and `<caramel-playlist-panel>`, so viewers can jump
to a chapter or another video without leaving the player. A tab appears only
when it has content (a chapters track, a playlist with two or more items);
with neither, the button stays hidden and the player looks as before.

```sh
npm install @esershnr/caramel-drawer @videojs/html
```

```ts
import '@esershnr/caramel-drawer/define'; // registers the drawer, its bar button and both panels, loads the CSS
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

The button is `<caramel-drawer-toggle>`. The `@esershnr/caramel-skin` control
bar already carries it as a placeholder before the settings button, so no
markup is needed. With another skin, put `<caramel-drawer-toggle>` anywhere
inside the player (it finds the drawer in the same `<video-player>`, or the
one its `for` attribute names). It stays hidden until the drawer has a tab
with content.

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
| `tabs` | `('chapters' \| 'playlist')[]`, read only | Tabs that have content, in display order. |
| `panelId` | string, read only | Id of the drawer's panel region (the toggle's `aria-controls`). |

| Method | Description |
| --- | --- |
| `show()` | Opens the drawer and moves focus into it. |
| `hide()` | Closes it; focus inside returns to the toggle button. |
| `toggle()` | Opens or closes. |

| Event | Detail |
| --- | --- |
| `caramel-drawer-toggle` | `{ open: boolean }` |
| `caramel-drawer-tab` | `{ tab: 'chapters' \| 'playlist' }` |
| `caramel-drawer-tabs` | `{ tabs: ('chapters' \| 'playlist')[] }`, when the tabs with content change |

`<caramel-drawer-toggle>` takes one attribute, `for` (id of the
`<caramel-drawer>`; default: the one inside the same `<video-player>`), and
exposes the bound drawer as the read-only `drawer` property. Its button
(`.caramel-drawer-toggle-button`, a regular `media-button`) carries
`aria-expanded`, `aria-controls` and the open or close label, so the skin
shows it pressed while the drawer is open.

The drawer and the player's menus take turns: opening the drawer closes an
open settings menu (any `<media-menu>` in the same player), and opening a
menu closes the drawer.

Keyboard: the toggle is a regular bar button (Enter opens or closes the
drawer, Space works like on every other bar button); inside the drawer, arrow
keys, Home and End move between tabs, Escape closes and returns focus to the
toggle, and keys typed inside never trigger the player's hotkeys. Touch: swipe
right on the panel to close. The controls stay visible while the drawer is
open. Picking a chapter or video
closes the drawer on narrow players (below 480 px) and keeps it open on wide
ones. The last tab picked is remembered for the browser session.

CSS: `--caramel-drawer-width` (default `clamp(260px, 38%, 380px)`; below
30rem the drawer spans the player's width with square edges),
`--caramel-drawer-inset-top` and `--caramel-drawer-inset-bottom` (the gaps to
the player's top and bottom edges). The defaults follow the skin's bar in
`--media-spacing` units: the drawer clears the bar with the same gap the
settings menu keeps, and on players below 32rem it also clears the pill at
the top right. The drawer sits on the video, so in both
page themes it is the player's dark overlay surface: a blurred glass built from
the `--caramel-overlay-*` tokens, with the hosted chapters and playlist panels
switched to the same overlay roles (the same panels outside the player keep the
page theme). Without backdrop blur, or with `prefers-reduced-transparency`,
the glass becomes a near-opaque dark surface.

More: [root README](https://github.com/esershnr/caramel-webplayer#readme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/drawer/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
