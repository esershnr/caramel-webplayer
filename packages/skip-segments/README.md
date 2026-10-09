# @esersahiner/player-skip-segments

Skip intro / recap / outro / sponsor for Video.js 10: a "Skip intro" button,
auto-skip per segment type, and colored bands on the timeline (striped when the
type is auto-skipped).

```sh
npm install @esersahiner/player-skip-segments @videojs/html
```

```ts
import '@esersahiner/player-skip-segments/define'; // registers the element, loads the CSS

const skip = document.createElement('esp-skip-segments');
skip.setAttribute('segments', JSON.stringify([
  { start: 0, end: 30, type: 'intro' },
  { start: 600, end: 640, type: 'sponsor' },
]));
skip.setAttribute('auto-skip', 'recap'); // comma separated types, or "all"
document.querySelector('media-container')!.append(skip);
skip.addEventListener('esp-skip', (e) => console.log(e.detail));
```

React:

```tsx
import { SkipSegments } from '@esersahiner/player-skip-segments/react';

<SkipSegments segments={[{ start: 0, end: 30, type: 'intro' }]} autoSkip={['recap']} />
```

Place it inside the player (with `@esersahiner/player-skin`, pass it in
`extras`). Band colors: `--esp-segment-intro/recap/outro/sponsor`. More:
[root README](../../README.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
