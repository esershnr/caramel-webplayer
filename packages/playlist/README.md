# @esersahiner/player-playlist

Playlist for Video.js 10: `<esp-playlist>` fills the player per item (source,
title, poster, chapters, thumbnails, subtitles, skip segments), adds previous /
next buttons, plays the next item at the end and resumes where the viewer left
off. `<esp-playlist-panel>` shows the list outside the video.

```sh
npm install @esersahiner/player-playlist @videojs/html
```

```ts
import '@esersahiner/player-playlist/define'; // registers the elements, loads the CSS
import type { PlaylistItem } from '@esersahiner/player-playlist';

const items: PlaylistItem[] = [
  { id: 'intro', title: 'Intro', src: '/videos/intro.mp4', chapters: '/intro.chapters.vtt' },
  { id: 'part-2', title: 'Part 2', src: '/videos/part-2.mp4' },
];
const playlist = document.createElement('esp-playlist');
playlist.id = 'playlist';
playlist.items = items;
document.querySelector('media-container')!.append(playlist);
```

```html
<esp-playlist-panel for="playlist"></esp-playlist-panel>
```

React:

```tsx
import { Playlist, PlaylistPanel } from '@esersahiner/player-playlist/react';

<Playlist id="playlist" items={items} />
<PlaylistPanel for="playlist" />
```

The item contract is in `PlaylistItem`. With `@esersahiner/player-skin`, pass
`<esp-playlist>` in `extras`. More: [root README](../../README.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
