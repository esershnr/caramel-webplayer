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

Panel attributes: `for` (controller id), `heading`, `no-heading`, `nav`
(`top`, `bottom` or `none`) and `embedded`. Set `embedded` when the panel sits
inside another surface, such as a drawer: it
drops its own padding, corners and background, fills the host's height and
scrolls the list in the remaining space. In React, pass `embedded` to
`<PlaylistPanel>`.

## Groups

Give items an optional `group` name to split the panel into collapsible
sections, for example seasons. Consecutive items with the same `group` form one
section with a header showing the name and the item count. Items without a
group get no header, and a name that appears again after other items starts a
new section.

```ts
const items: PlaylistItem[] = [
  { id: 'trailer', title: 'Fragman', src: '/videos/trailer.mp4' },
  { id: 's1e1', title: 'Bölüm 1', src: '/videos/s1e1.mp4', group: '1. Sezon' },
  { id: 's1e2', title: 'Bölüm 2', src: '/videos/s1e2.mp4', group: '1. Sezon' },
  { id: 's2e1', title: 'Bölüm 1', src: '/videos/s2e1.mp4', group: '2. Sezon' },
];
```

Only the section holding the current item starts expanded; a section expands
when one of its items becomes current, and its header still shows the active
state while collapsed. Groups are display only: the flat array stays the order
for previous / next, auto advance and resume, so playback continues from the
last item of one group to the first item of the next. `groupRuns(items)` returns
the same sections (`{ group, start, end }`) for custom UIs.

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
