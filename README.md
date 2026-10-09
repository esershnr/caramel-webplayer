# esersahiner web player

Custom Video.js 10 player packages for esersahiner.com. Built on `@videojs/html`
custom elements with thin React wrappers (`'use client'`, elements registered in
the browser only, so the Next.js App Router stays SSR clean).

## Packages

| Package | Purpose |
| --- | --- |
| `@esersahiner/player-theme` | `--esp-*` design tokens (latte / bitter palette, motion, radii, typography), `resolveTheme`, `watchTheme` |
| `@esersahiner/player-icons` | Lucide icon registry, `iconToSvg`, `<esp-morph-icon>` (Morphicons spring morphing driven by `data-*` attributes) |
| `@esersahiner/player-skin` | Video.js 10 default video skin source (shadcn copy) themed with esp tokens and Lucide icons; `mountSkin`, `<EspVideoSkin>` |
| `@esersahiner/player-skip-segments` | `<esp-skip-segments>`: skip intro / recap / outro / sponsor button, auto-skip per type, timeline markers; `<SkipSegments>` for React |
| `@esersahiner/player-chapters` | `<esp-chapters-panel>`: chapter list outside the video, fed by the player's chapters track; `<ChaptersPanel>` |
| `@esersahiner/player-playlist` | `PlaylistModel`, `<esp-playlist>` controller (title, poster, media, tracks and segments per item, resume via localStorage, auto advance) and `<esp-playlist-panel>`; `<Playlist>`, `<PlaylistPanel>` |
| `@esersahiner/gen-thumbs` | `esp-gen-thumbs`: ffmpeg sprite sheets plus a `#xywh=` WebVTT storyboard (`scripts/gen-thumbs/README.md`) |

## Usage

### HTML

```ts
import '@esersahiner/player-theme/tokens.css';
import '@esersahiner/player-skin/define';
import '@esersahiner/player-skip-segments/define';
import { mountSkin } from '@esersahiner/player-skin';

const player = document.querySelector('video-player');
const video = Object.assign(document.createElement('video'), { src, playsInline: true });
const skip = document.createElement('esp-skip-segments');
skip.setAttribute('segments', JSON.stringify([{ start: 0, end: 30, type: 'intro' }]));
skip.setAttribute('auto-skip', 'recap');
mountSkin(player, { media: video, extras: [skip] });
```

Wrap the player in `<media-i18n lang="tr">` (or set `lang` on an ancestor) for
Turkish labels. Chapters come from `<track kind="chapters" default>`, timeline
thumbnails from `<track kind="metadata" label="thumbnails" default>`.

With a playlist the media element starts empty and the controller fills in
everything per item (see `packages/playlist/src/types.ts` for the contract):

```ts
import '@esersahiner/player-chapters/define';
import '@esersahiner/player-playlist/define';
import '@videojs/html/media/hls-video'; // for .m3u8 items

const playlist = document.createElement('esp-playlist');
playlist.id = 'playlist';
playlist.items = items; // PlaylistItem[]
mountSkin(player, { media: document.createElement('hls-video'), extras: [skip, playlist] });
```

```html
<esp-chapters-panel for="player"></esp-chapters-panel>
<esp-playlist-panel for="playlist"></esp-playlist-panel>
```

### React

```tsx
import { EspVideoSkin } from '@esersahiner/player-skin/react';
import { SkipSegments } from '@esersahiner/player-skip-segments/react';

<EspVideoSkin id="player" lang="tr" extras={<><SkipSegments segments={[]} autoSkip={['recap']} /><Playlist id="playlist" items={items} /></>}>
  <hls-video playsinline="" crossorigin="anonymous" />
</EspVideoSkin>
<ChaptersPanel playerId="player" />
<PlaylistPanel for="playlist" />
```

### Thumbnails

```sh
pnpm --filter @esersahiner/gen-thumbs start -- video.mp4 --interval 2 --columns 6 --out public/thumbs --name bike --base-url /thumbs
```

Under Git Bash prefix the command with `MSYS_NO_PATHCONV=1` so `--base-url /thumbs`
is not rewritten to a Windows path.

### Theme

Tokens live on `:root` and use `light-dark()`. Put `.esp-theme` on the elements
that should follow the scheme (panels, page body). `prefers-color-scheme` is the
default; `data-theme="light|dark"` or `.dark` / `.light` on `<html>` (or any
ancestor) wins. Controls over the video always stay dark (overlay roles).

## Development

```sh
pnpm install
pnpm test            # Vitest, pure logic only
pnpm typecheck
pnpm build           # dist/ for every package (needed before `vite build` in examples)
pnpm dev:vanilla     # http://localhost:5173  (?theme=light|dark)
pnpm dev:react       # http://localhost:5174
```

Open-state screenshots (settings menu, every submenu, volume popover, timeline
preview, playlist next item, chapter select; both demos, both themes) with the
installed Edge:

```sh
node tools/shots.mjs shots   # dev servers must be running
```

The skin template (`packages/skin/src/template.ts`) is generated from
`skin.html` by `pnpm --filter @esersahiner/player-skin build:template`; run it
after editing `skin.html`.
