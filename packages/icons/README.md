# @esershnr/caramel-icons

Lucide icon data for the esersahiner Video.js 10 player and `<esp-morph-icon>`,
an icon that morphs (Morphicons springs) when attributes on its parent change.

```sh
npm install @esershnr/caramel-icons
```

```ts
import '@esershnr/caramel-icons/define';
import { iconToSvg, icons } from '@esershnr/caramel-icons';

const html = iconToSvg(icons.play, { className: 'my-icon' }); // SSR-safe string
```

```html
<button data-paused>
  <esp-morph-icon map="data-paused:play,*:pause"></esp-morph-icon>
</button>
```

React (optional peer `react` >= 19):

```tsx
import { Icon, MorphIcon } from '@esershnr/caramel-icons/react';

<Icon name="settings" size={20} />
<MorphIcon map="data-paused:play,*:pause" />
```

More: [root README](../../README.md).

MIT License, Copyright (c) 2026 Eser Şahiner. Lucide (ISC) and Morphicons (MIT)
are credited in `NOTICE`.
