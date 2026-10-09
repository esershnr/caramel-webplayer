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
| `@esersahiner/encode-hls` | `esp-encode-hls`: `media/<slug>` (video, SRT, meta.yaml) to publish-ready `out/<slug>` (byte-range HLS, poster, thumbnails, chapters, subtitles, manifest). Guide: `scripts/encode-hls/README.md` |

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

Tiles default to 320px wide (`--width`). The timeline preview card takes the
tile width from the VTT `#xywh` fragment and shows it 1:1, so the card is as
wide as one tile; set `--esp-preview-width` to force another width (larger
values upscale). Changing the tile width of a published video means
re-encoding and uploading to a new version folder (`v2/`), see
`scripts/encode-hls/README.md`.

## Theming / Renkleri değiştirme

Every color is a CSS custom property on `:root`, declared once with
`light-dark(light, dark)`. Override the main tokens and every hover, contrast
and overlay derivative follows (they are `color-mix()` expressions over the
main tokens, see `packages/theme/styles/tokens.css`).

TR: Renkler `--esp-*` değişkenleridir; yalnız ana token'ları ezmeniz yeterlidir,
hover ve türevler kendiliğinden uyar. Override'lar `tokens.css`'ten SONRA
yüklenmelidir.

### Main tokens

| Token | Role | Light (latte) | Dark (bitter) |
| --- | --- | --- | --- |
| `--esp-bg` | page background | `#fbf7f0` | `#141414` |
| `--esp-surface` | panel (playlist, chapters, settings menu, preview card) | `#ece5da` | `#2d2d2d` |
| `--esp-raised` | box inside a panel, list row | `#faf7f2` | `#242424` |
| `--esp-divider` | separators (decorative) | `#d2c4b0` | `#454545` |
| `--esp-border` | interactive edge (3:1 or better) | `#8a5f36` | `#8a8a8a` |
| `--esp-text` | body text | `#2a1606` | `#ffffff` |
| `--esp-muted` | secondary text | `#553821` | `#b8b0a6` |
| `--esp-primary` | indicator: selection, focus ring, active marker | `#5e3310` | `#c9945c` |
| `--esp-solid` | filled button, active item | `#5e3310` | `#8a5a2b` |
| `--esp-accent` | decoration only: progress fill, lines, badges. Never text. | `#c9945c` | `#c9945c` |
| `--esp-accent-text` | readable accent for text and icons | `#653d19` | `#d9ae7e` |
| `--esp-segment-intro` | timeline band: intro (teal) | `#5ec4c0` | same |
| `--esp-segment-recap` | timeline band: recap (violet) | `#b294ee` | same |
| `--esp-segment-outro` | timeline band: outro (blue) | `#7fa7f5` | same |
| `--esp-segment-sponsor` | timeline band: sponsor (green) | `#72c67e` | same |

Derived (override only if you need to): `--esp-raised-hover`, `--esp-primary-hover`,
`--esp-primary-contrast`, `--esp-solid-hover`, `--esp-solid-contrast`,
`--esp-overlay-accent`, `--esp-overlay-on-accent`, `--esp-quality-badge-bg`,
`--esp-quality-badge-text`, `--esp-segment-ring`, `--esp-segment-hatch`. Non-color tokens: radii
(`--esp-radius-panel/box/chip`), motion (`--esp-ease-*`, `--esp-duration-*`),
fonts (`--esp-font-heading/body`), focus ring (`--esp-focus-ring/offset`),
timeline preview card width (`--esp-preview-width`, unset by default: the
sprite tile width, or 240px without thumbnails).

### Example 1: change one color

```css
/* after tokens.css */
:root {
  --esp-accent: #2f80ed;
}
```

The progress fill, the quality badge and the overlay accent all follow. The
segment bands have their own tokens (below).

### Example 2: separate light and dark values

```css
:root {
  --esp-primary: light-dark(#1d4ed8, #93c5fd);
  --esp-solid: light-dark(#1d4ed8, #1e40af);
}
```

### Example 3: a preset

```ts
import '@esersahiner/player-theme/tokens.css';
import '@esersahiner/player-theme/presets/catppuccin-mocha.css'; // or presets/neutral.css
```

Presets override the main tokens only and document their contrast ratios in
the file header.

### Load order and scoped themes

Overrides must come after `tokens.css` (same specificity, later wins). To theme
one player differently on the same page, scope the override to a wrapper; the
tokens inherit, so the wrapper's values win inside it:

```css
.player-mocha {
  --esp-bg: light-dark(#eff1f5, #1e1e2e);
  --esp-surface: light-dark(#e6e9ef, #313244);
  --esp-accent: #fab387;
  /* ... */
}
```

```html
<div class="esp-theme">… default player …</div>
<div class="esp-theme player-mocha">… Catppuccin player …</div>
```

### Scheme selection

Put `.esp-theme` on the elements that should follow the scheme (panels, page
body, or a wrapper). Precedence: a local `data-theme="light|dark"` on that
element or an ancestor, then `data-theme` / `.dark` / `.light` on `<html>`,
then `prefers-color-scheme`. `watchTheme()` from `@esersahiner/player-theme`
reports changes to JavaScript.

### Timeline segment bands

`<esp-skip-segments>` paints intro / recap / outro / sponsor ranges onto the
timeline. Each type has its own color, in the SponsorBlock language with a
softer saturation: intro teal, recap violet, outro blue, sponsor green. They
sit on the video, so one value serves both schemes.

- Every band has a 1px dark ring (`--esp-segment-ring`). A band color cannot
  contrast 3:1 with both the dark unplayed track and the caramel played fill
  (one needs a light color, the other a dark one), so the band contrasts with
  the track (5:1 or more) and the ring with the fill (6.1:1). The table is in
  `packages/theme/styles/tokens.css`.
- The played part of a band is a lighter tint of the same color, so progress
  stays visible inside it.
- Types that are auto-skipped (`auto-skip="recap"`) get static diagonal stripes
  (`--esp-segment-hatch`); types you skip with the button stay flat.
- Hovering a band adds a small type chip ("İntro", "Sponsor"; "Intro",
  "Sponsor" in English) in the band color to the preview card.

TR: Bant renkleri `--esp-segment-intro/recap/outro/sponsor` ile değişir. Çizgili
bant otomatik atlanan türdür, düz bant elle atlanan.

### Controls over the video stay dark

Everything drawn on top of the frame (control bar, skip button, tooltips) uses
the `--esp-overlay-*` roles and does not follow the page theme: video frames
can be bright or dark at any moment, and a dark frosted bar keeps white text
and the caramel accent readable on both. Only the panels outside the frame and
the settings menu / preview card switch with the page.

### Contrast responsibility

When you change colors, keep these pairs (WCAG):

| Pair | Minimum |
| --- | --- |
| `--esp-text` on bg / surface / raised | 4.5:1 (aim 7:1) |
| `--esp-muted` on bg / surface / raised | 4.5:1 |
| `--esp-accent-text` on surface / raised | 4.5:1 |
| `--esp-solid-contrast` on `--esp-solid` | 4.5:1 |
| `--esp-primary` on surface / raised (indicator, ring) | 3:1 |
| `--esp-border` on surface / raised | 3:1 |
| `--esp-quality-badge-text` on `--esp-quality-badge-bg` | 4.5:1 |
| `--esp-segment-*` on the unplayed track (about `#333333`) | 3:1 |
| `--esp-segment-ring` on `--esp-accent` (played fill) | 3:1 |

`--esp-accent` is decorative and has no contrast requirement, which is why it
must not be used for text.

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
