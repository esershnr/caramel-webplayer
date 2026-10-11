# @esershnr/caramel-skip-segments

Skip intro / recap / outro / sponsor for Video.js 10: a "Skip intro" button,
auto-skip per segment type, and colored bands on the timeline (striped when the
type is auto-skipped).

```sh
npm install @esershnr/caramel-skip-segments @videojs/html
```

```ts
import '@esershnr/caramel-skip-segments/define'; // registers the element, loads the CSS

const skip = document.createElement('caramel-skip-segments');
skip.setAttribute('segments', JSON.stringify([
  { start: 0, end: 30, type: 'intro' },
  { start: 600, end: 640, type: 'sponsor' },
]));
skip.setAttribute('auto-skip', 'recap'); // comma separated types, or "all"
document.querySelector('media-container')!.append(skip);
skip.addEventListener('caramel-skip', (e) => console.log(e.detail));
```

React:

```tsx
import { SkipSegments } from '@esershnr/caramel-skip-segments/react';

<SkipSegments segments={[{ start: 0, end: 30, type: 'intro' }]} autoSkip={['recap']} />
```

Place it inside the player (with `@esershnr/caramel-skin`, pass it in
`extras`). Band colors: `--caramel-segment-intro/recap/outro/sponsor`. More:
[root README](https://github.com/esershnr/caramel-webplayer#readme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/skip-segments/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
