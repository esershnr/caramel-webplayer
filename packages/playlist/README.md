# @esershnr/caramel-playlist

Playlist for Video.js 10: `<caramel-playlist>` fills the player per item (source,
title, poster, chapters, thumbnails, subtitles, skip segments), adds previous /
next buttons, plays the next item at the end and resumes where the viewer left
off. `<caramel-playlist-panel>` shows the list outside the video.

```sh
npm install @esershnr/caramel-playlist @videojs/html
```

```ts
import '@esershnr/caramel-playlist/define'; // registers the elements, loads the CSS
import type { PlaylistItem } from '@esershnr/caramel-playlist';

const items: PlaylistItem[] = [
  { id: 'intro', title: 'Intro', src: '/videos/intro.mp4', chapters: '/intro.chapters.vtt' },
  { id: 'part-2', title: 'Part 2', src: '/videos/part-2.mp4' },
];
const playlist = document.createElement('caramel-playlist');
playlist.id = 'playlist';
playlist.items = items;
document.querySelector('media-container')!.append(playlist);
```

```html
<caramel-playlist-panel for="playlist"></caramel-playlist-panel>
```

React:

```tsx
import { Playlist, PlaylistPanel } from '@esershnr/caramel-playlist/react';

<Playlist id="playlist" items={items} />
<PlaylistPanel for="playlist" />
```

The item contract is in `PlaylistItem`. With `@esershnr/caramel-skin`, pass
`<caramel-playlist>` in `extras`. More: [root README](https://github.com/esershnr/caramel-webplayer#readme).

MIT License, Copyright (c) 2026 Eser Şahiner.
