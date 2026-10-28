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

Auto-skip delay: by default an auto-skipped segment is skipped on the first
frame inside it. Set `auto-skip-delay` (attribute, seconds) or `autoSkipDelay`
(property, or the React prop) to count down first:

```html
<caramel-skip-segments auto-skip="intro,recap" auto-skip-delay="5" segments="..."></caramel-skip-segments>
```

- The countdown runs in media time from the point where playback entered the
  segment (a seek into the middle counts from there). Pausing pauses it, and
  the playback rate does not change how many seconds of video it waits.
- Seeking out of the segment cancels it; entering again starts the full delay.
- A segment with no more than the delay left after the entry point is never
  skipped automatically; it shows the normal skip button instead.
- While the countdown runs the button stays visible (whatever `hide-after`
  says), shows the seconds left and a close button appears next to it. The
  close button, Escape on the focused skip button, or `dismiss()` cancel the
  auto-skip and hide the button for this pass. Rewinding before the segment
  arms it again, as with an instant auto-skip.
- Screen readers hear one polite announcement when the countdown starts
  ("Intro skips in 5 seconds"), not a tick per second. The button's name stays
  "Skip intro".

`0`, a negative or an invalid value means no delay. Events:
`caramel-skip-countdown` (detail `{ segment, seconds }`) once when a countdown
starts, `caramel-skip-cancel` (detail `{ segment }`) when one is dismissed, and
the usual `caramel-skip` with `auto: true` when it fires. React:
`onSkipCountdown`, `onSkipCancel`.

Attribute changes apply only the attribute that changed, so options set as
properties survive, for example, a new `segments` attribute. Removing an
attribute restores its default.

CSS hooks: `.caramel-skip-button[data-countdown]` while counting,
`.caramel-skip-button-countdown` (the digits), `.caramel-skip-dismiss` (the
close button), `.caramel-skip-announcer` (visually hidden live region) and
`--caramel-skip-countdown-progress` (0 to 1, set on the button) which drives
the bar under the label. Hide the bar with
`.caramel-skip-button::after { display: none; }`. Strings live under
`caramel.autoskip.announce` and `caramel.autoskip.dismiss` (Turkish and English).

Place it inside the player (with `@esershnr/caramel-skin`, pass it in
`extras`). Band colors: `--caramel-segment-intro/recap/outro/sponsor`. More:
[root README](https://github.com/esershnr/caramel-webplayer#readme).

Changes per version: [CHANGELOG.md](https://github.com/esershnr/caramel-webplayer/blob/main/packages/skip-segments/CHANGELOG.md).

MIT License, Copyright (c) 2026 Eser Şahiner.
