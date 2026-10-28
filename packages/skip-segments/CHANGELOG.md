# @esershnr/caramel-skip-segments

## 0.3.0

### Minor Changes

- 6f68ce5: Auto-skip can wait before it fires: set `auto-skip-delay` (or the `autoSkipDelay` property) to a number of seconds, for every type or per type (`intro:0,outro:3`), and the skip button shows a countdown in media time (it pauses with the video and does not drift when the rate changes). Pressing the button skips at once, the new close button or Escape dismisses the auto-skip for this occurrence, seeking out of the segment cancels it, a segment shorter than the delay is never auto-skipped, and rewinding before the segment re-arms it. The default stays 0 (instant). The start of a countdown is announced once through a polite live region; `dismiss()` is new on the element.

### Patch Changes

- 6f68ce5: `autoSkip` and `hideAfter` set as properties no longer reset when an unrelated attribute changes (for example when `segments` is rewritten).
- 6f68ce5: A segment that starts at 0 (or within half a second of it) re-arms its auto-skip when the playhead returns to the media start. Before, the rewind had to land before `start - 0.5`, which no position can for such a segment, so the countdown and the automatic skip only ever ran once.
- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
  - @esershnr/caramel-icons@0.2.0
  - @esershnr/caramel-theme@0.3.0

## 0.2.0

### Minor Changes

- d72b437: Segment bands grow with the timeline chapter under the pointer. Each chapter
  gets its own lane that draws the part of every band inside that chapter,
  bounded like the chapter track, so a band spanning two chapters is split at
  the gap into two rounded pieces and only the hovered chapter's piece grows.

### Patch Changes

- d72b437: The npm package now includes `CHANGELOG.md`, and the README links to it.
- Updated dependencies [d72b437]
- Updated dependencies [d72b437]
  - @esershnr/caramel-theme@0.2.0
  - @esershnr/caramel-icons@0.1.1

## 0.1.1

### Patch Changes

- dcc58ca: Bind to the player when `<caramel-skip-segments>` is registered before `<video-player>`. The element now waits for the undefined ancestor and requests the player context again once it is defined.

## 0.1.0

First public release.
