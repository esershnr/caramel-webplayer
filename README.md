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

### React

```tsx
import { EspVideoSkin } from '@esersahiner/player-skin/react';
import { SkipSegments } from '@esersahiner/player-skip-segments/react';

<EspVideoSkin lang="tr" title="..." extras={<SkipSegments segments={segments} autoSkip={['recap']} />}>
  <video src={src} playsInline />
</EspVideoSkin>
```

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

The skin template (`packages/skin/src/template.ts`) is generated from
`skin.html` by `pnpm --filter @esersahiner/player-skin build:template`; run it
after editing `skin.html`.
