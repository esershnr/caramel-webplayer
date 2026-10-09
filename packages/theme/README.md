# @esersahiner/player-theme

Design tokens for the esersahiner Video.js 10 player: `--esp-*` custom
properties for the light (latte) and dark (bitter) palette, timeline segment
colors, motion, radii and typography, plus Catppuccin and neutral presets.

```sh
npm install @esersahiner/player-theme
```

```ts
import '@esersahiner/player-theme/tokens.css';
import '@esersahiner/player-theme/fonts.css'; // optional: Montserrat + Quicksand
import '@esersahiner/player-theme/presets/neutral.css'; // optional preset
import { watchTheme } from '@esersahiner/player-theme';

const stop = watchTheme((scheme) => console.log(scheme)); // 'light' | 'dark'
```

```css
/* after tokens.css */
:root {
  --esp-accent: #2f80ed;
}
```

Put `class="esp-theme"` on elements that should follow the color scheme. The
other player packages import `tokens.css` themselves.

Token table, scheme rules and contrast guidance: see the
[root README](../../README.md#theming--renkleri-değiştirme).

MIT License, Copyright (c) 2026 Eser Şahiner.
