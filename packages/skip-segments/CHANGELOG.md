# @esershnr/caramel-skip-segments

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
