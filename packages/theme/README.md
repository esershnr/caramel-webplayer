# @esershnr/caramel-theme

Design tokens for Caramel Webplayer (Video.js 10): `--caramel-*` custom
properties for the light (latte) and dark (bitter) palette, timeline segment
colors, motion, radii and typography, plus Catppuccin and neutral presets.

```sh
npm install @esershnr/caramel-theme
```

```ts
import '@esershnr/caramel-theme/tokens.css';
import '@esershnr/caramel-theme/fonts.css'; // optional: Montserrat + Quicksand
import '@esershnr/caramel-theme/presets/neutral.css'; // optional preset
import { watchTheme } from '@esershnr/caramel-theme';

const stop = watchTheme((scheme) => console.log(scheme)); // 'light' | 'dark'
```

```css
/* after tokens.css */
:root {
  --caramel-accent: #2f80ed;
}
```

Put `class="caramel-theme"` on elements that should follow the color scheme. The
other player packages import `tokens.css` themselves.

## Caption colors

Caption tokens sit on the video, so each has one value for both schemes.
`@esershnr/caramel-settings` offers them as caption style choices; override
them after `tokens.css` like any other token.

| Token | Default | Contrast on `--caramel-caption-bg` |
| --- | --- | --- |
| `--caramel-caption-white` | `#ffffff` | 10.4:1 |
| `--caramel-caption-yellow` | `#ffe14d` | 8.0:1 |
| `--caramel-caption-cyan` | `#5fe3f0` | 6.8:1 |
| `--caramel-caption-green` | `#7ce38b` | 6.5:1 |
| `--caramel-caption-magenta` | `#f08ce8` | 4.8:1 |
| `--caramel-caption-red` | `#ff8a80` | 4.5:1 |
| `--caramel-caption-bg` | `rgb(0 0 0 / 0.75)` | caption box |
| `--caramel-caption-shadow` | `#000000` | outline and drop shadow |

The contrast figures are the worst case: the 75% black box over a white
video frame. Keep a replacement text color at 4.5:1 or better against it.

Token table, scheme rules and contrast guidance: see the
[root README](https://github.com/esershnr/caramel-webplayer#theming--renkleri-değiştirme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/theme/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
