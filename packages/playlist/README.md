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

## Resume thresholds

The playlist saves each item's playback position in local storage. By default,
it skips positions in the first 3 seconds and positions within 5 seconds of the
end. Set `resume-min-time` and `resume-end-margin` to change these limits in
seconds, for example for short clips:

```html
<caramel-playlist resume-min-time="1" resume-end-margin="1"></caramel-playlist>
```

The matching JavaScript properties are `resumeMinTime` and `resumeEndMargin`:

```ts
playlist.resumeMinTime = 1;
playlist.resumeEndMargin = 1;
```

In React, pass `resumeMinTime` and `resumeEndMargin` to `<Playlist>`:

```tsx
<Playlist items={items} resumeMinTime={1} resumeEndMargin={1} />
```

Each value must be a finite, non-negative number. Missing, empty, non-numeric,
or negative attributes fall back to their respective defaults of 3 and 5
seconds. Invalid property values also use those defaults. Property changes
affect subsequent save and restore checks; they do not change the attributes.
When `no-resume` is present (or `playlist.resume = false`), the playlist does
not save or restore positions, regardless of the thresholds.

The item contract is in `PlaylistItem`. With `@esershnr/caramel-skin`, pass
`<caramel-playlist>` in `extras`. More: [root README](https://github.com/esershnr/caramel-webplayer#readme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/playlist/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
