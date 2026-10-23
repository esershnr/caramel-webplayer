# @esershnr/caramel-chapters

A chapter list panel for Video.js 10 that lives outside the video, fed by the
player's `<track kind="chapters">`. Highlights the current chapter and seeks on
click; keyboard friendly.

```sh
npm install @esershnr/caramel-chapters @videojs/html
```

```ts
import '@esershnr/caramel-chapters/define'; // registers the element, loads the CSS
```

```html
<video-player id="player">…</video-player>
<caramel-chapters-panel for="player"></caramel-chapters-panel>
```

Hosted inside another surface (such as the drawer), add `embedded` to drop the panel's own background, radius and max height.

React:

```tsx
import { ChaptersPanel } from '@esershnr/caramel-chapters/react';

<ChaptersPanel playerId="player" onChapterSelect={(detail) => console.log(detail)} />
```

More: [root README](https://github.com/esershnr/caramel-webplayer#readme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/chapters/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
