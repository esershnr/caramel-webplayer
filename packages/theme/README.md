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

Token table, scheme rules and contrast guidance: see the
[root README](https://github.com/esershnr/caramel-webplayer#theming--renkleri-değiştirme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/theme/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
