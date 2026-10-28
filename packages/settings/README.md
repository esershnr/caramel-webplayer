# @esershnr/caramel-settings

Settings pages for the Video.js 10 player's gear menu, the way streaming sites
have them: Caption style (size, position, color, background, font, shadow, bold),
Player (seek step, number key seeking, auto-skip intro and outro, auto-skip
delay, autoplay next, fullscreen on play) and Display (aspect ratio, video
filter). Choices are remembered in `localStorage` and applied on the next
visit. One opt-in element does it all; without it the player is unchanged, and
with it and no stored choice the player still looks and acts as before, with
one deliberate exception: segments the site does not already skip at once get
a 3 second countdown and are then skipped (see "Auto-skip" below).

```sh
npm install @esershnr/caramel-settings @videojs/html
```

```ts
import '@esershnr/caramel-settings/define'; // registers the elements, loads the CSS
```

`<caramel-settings>` must sit inside the `<video-player>`. With
`@esershnr/caramel-skin`, pass it in `extras`:

```ts
import { mountSkin } from '@esershnr/caramel-skin';

const settings = document.createElement('caramel-settings');
settings.defaults = { 'player.autoSkipDelay': 5 }; // optional site defaults
mountSkin(player, { media: video, extras: [skip, playlist, settings] });
settings.addEventListener('caramel-settings-change', (e) => console.log(e.detail.keys, e.detail.settings));
```

The pages mount into the `<caramel-settings-menu>` placeholder that the
`@esershnr/caramel-skin` settings menu already carries (hidden until this
package binds to it). With another skin, put `<caramel-settings-menu>` as the
last child of the root `<media-menu-content>` of a `media-menu`.

React:

```tsx
import { CaramelVideoSkin } from '@esershnr/caramel-skin/react';
import { Settings } from '@esershnr/caramel-settings/react';

<CaramelVideoSkin id="player" extras={<Settings defaults={{ 'player.seekStep': 10 }} onChange={(d) => console.log(d.keys)} />}>
  <video src="/video.mp4" playsInline />
</CaramelVideoSkin>
```

## Preferences

Keys are flat and dotted; the first part names the page. Every default is what
the player does without this package.

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `captions.scale` | number | `1` | Caption size as a factor of the default (5% of the video height). 0.5 to 2 in 0.1 steps. |
| `captions.offset` | number | `0` | Extra lift from the bottom, percent of the video height. 0 to 30 in steps of 2. |
| `captions.color` | `white` `yellow` `cyan` `green` `magenta` `red` | `white` | Text color (`--caramel-caption-*` theme tokens). |
| `captions.background` | boolean | `true` | Dark box behind the text. |
| `captions.font` | string | `default` | `default` (the player font), `sans`, `serif`, `mono`, `legible`, or an id registered with `registerCaptionFont`. `legible` asks for Atkinson Hyperlegible or Lexend and falls back to the system sans, so load one of them with `@font-face` to make it count. |
| `captions.shadow` | boolean | `false` | Text shadow. |
| `captions.bold` | boolean | `false` | |
| `player.seekStep` | number | `5` | Seconds for the arrow keys, j / l and the double taps. 5 to 30 in steps of 5. |
| `player.numberKeys` | boolean | `true` | The 0 to 9 keys seek to a percentage. |
| `player.autoSkipIntro` | boolean | `false` | Skip `intro` and `recap` segments at once. |
| `player.autoSkipOutro` | boolean | `false` | Skip `outro` segments at once. `sponsor` stays as the site set it. |
| `player.autoSkipDelay` | number | `3` | Countdown, in seconds, for the types that are not skipped at once; 0 means no auto-skip, only the button. 0 to 10. |
| `player.autoAdvance` | boolean | `true` | The playlist plays the next item when one ends. |
| `player.autoFullscreen` | boolean | `false` | Enter fullscreen when the viewer starts playback. |
| `display.aspect` | `default` `4:3` `16:9` | `default` | Forces the display ratio inside the player (letterboxed, picture stretched to the ratio). |
| `display.filter` | `none` `vivid` `warm` `cool` `bright` `cinema` | `none` | CSS `filter` on the video (cheap color matrices only). |

Precedence: the viewer's stored choice, else the site default, else the
default above. Site defaults come from the `defaults` attribute or property
and, for the keys that mirror a sibling element, from what that element says
(an existing `auto-skip="recap"` on `<caramel-skip-segments>` counts as the
site default for the skip switches). Reset on a page forgets the viewer's
choices of that page, so the site defaults apply again. A key the viewer has
not touched is never written to the siblings.

### Auto-skip

The two switches and the countdown describe one behavior per segment type:

- Switch on: the type is skipped at once, no countdown. While every switch is
  on the countdown row is shown disabled.
- Switch off and countdown 1 s or more: the skip button appears with a
  countdown of that many seconds and then skips (media time, pauses with the
  video, the button skips at once, the close button or Escape cancels this
  occurrence, seeking out cancels, rewinding re-arms).
- Switch off and countdown 0: no auto-skip, only the skip button.

The defaults are switches off and a 3 second countdown, so a player with this
package counts down and skips by default. Recap follows the intro switch once
the viewer (or the site's `defaults`) has set it; until then recap, like
sponsor, stays as the site set it. The site's own `auto-skip` on
`<caramel-skip-segments>` becomes the site default: a type it skips at once
puts that switch on, a type it counts down (`auto-skip-delay`) puts the switch
off with the site's seconds as the countdown default. Without this package
`<caramel-skip-segments>` behaves as before (its own default is instant, and
only the site's `auto-skip` applies).

## Elements and API

`<caramel-settings>`

| Attribute / property | Type | Description |
| --- | --- | --- |
| `storage-key` / `storageKey` | string | `localStorage` key, default `caramel-settings`. Players with the same key share one set of preferences (every player on the origin by default); give a player its own key to separate it. |
| `defaults` | JSON attribute or object property | Site defaults, keyed like the table above. |
| `settings` | `SettingsValues`, read only | The effective values. |
| `store` | `SettingsStore`, read only | The shared store behind the element. |
| `availableKeys` | `SettingsKey[]`, read only | Keys whose control has something to act on: the bound keys whose sibling exists (no playlist, no autoplay next) and fullscreen on play where fullscreen is supported. The pages hide the other rows. |

| Method | Description |
| --- | --- |
| `set(partial)` | Stores viewer choices (values are validated and clamped) and applies them. |
| `reset(page?)` | Forgets the viewer's choices of one page (`captions`, `player`, `display`) or all. |
| `isUserSet(key)` | Whether the viewer chose this key. |

| Event | Detail |
| --- | --- |
| `caramel-settings-change` | `{ keys: SettingsKey[], settings: SettingsValues }`, whenever the effective values change (a choice, a reset, another tab). |
| `caramel-settings-availability` | `{ keys: SettingsKey[] }`, when `availableKeys` changes (a sibling appeared or left); `[]` when the element disconnects. |

`<caramel-settings-menu>`: the placeholder in the menu. No attributes; it
binds to the `<caramel-settings>` in the same `<video-player>` and stays
hidden otherwise.

CSS: `--caramel-settings-page-width` (default `15rem`) is the minimum inline
size of the rows on the three pages, so the popup keeps one width across
them and while a slider moves.

Exports: `createSettingsStore`, `getSettingsStore`, `resolveSettings`,
`SETTINGS_DEFAULTS`, `SETTINGS_KEYS`, `SETTINGS_RANGES`, `SETTINGS_VERSION`,
`normalizeValues`, `registerCaptionFont({ id, label: { tr, en }, family })`,
`getCaptionFonts`, `captionCss`, `displayCss`, `fitBox`, `VIDEO_FILTER_CSS`,
the element classes and `defineCaramelSettings`. The host loads its own
`@font-face` for a registered font and registers it before the menu opens
(the font list is built when the pages render).

## How it reaches the player

- Hotkeys and gestures: `value` on the `media-hotkey` and `media-gesture`
  elements with `action="seekStep"`, `disabled` on the `0-9` hotkey.
- `<caramel-skip-segments>`: `autoSkip` and `autoSkipDelay` (per type) once the
  element is upgraded, their attributes before.
- `<caramel-playlist>`: `autoAdvance` once upgraded, `no-auto-advance` before.
- Captions and display: a stylesheet scoped to the player (and an adopted
  stylesheet inside `<hls-video>`, whose video lives in a shadow root). Only
  keys that differ from the default emit CSS.
- Fullscreen on play: requested inside the viewer's own play gesture (button,
  key or tap), never on autoplay or playlist auto-advance.

The siblings never import this package, and the order in which the elements
are defined or inserted does not matter: attributes are read on upgrade and a
late sibling is picked up when it appears.

Input stays inside the menu: taps, drags and keys on the pages never reach the
player (no play toggle, no seek gesture, no hotkey). In a slider, Left and
Right, Home, End and Page keys change the value, Up and Down move between
items, Space does nothing. The slider row is a `role="slider"` item inside the
menu, which some checkers flag as an unexpected child of a menu; it keeps the
slider keyboard model and its label, which matters more to screen reader
users than the strict ownership rule.

## Known limitations

- iPhone Safari plays fullscreen in the native player, which draws captions
  with the system style; caption settings apply inline only. iPad and the
  other platforms use the player's own fullscreen and are fine.
- The caption position (`captions.offset`) moves the browser's caption box
  and is supported in Chromium and WebKit; Firefox ignores it. Picture in
  picture shows the browser's own captions.
- Video filters also tint the captions drawn on the video (the browser draws
  them inside the video box). The presets are mild so white and yellow text
  stay readable. A filtered video leaves Android's hardware overlay path, which
  costs some battery; protected (DRM) streams may refuse to render through a
  filter, so leave the default `none` for such content.
- Safari's accessibility caption override wins over every caption setting.
- A forced aspect ratio stretches the picture to the chosen ratio inside the
  player; it does not crop.
- Preferences live in the browser; there is no sync between devices.

More: [root README](https://github.com/esershnr/caramel-webplayer#readme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/settings/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
