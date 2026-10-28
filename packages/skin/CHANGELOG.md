# @esershnr/caramel-skin

## 0.4.0

### Minor Changes

- 6f68ce5: Behavior changes: the arrow keys, j / l and the double taps now seek 5 seconds instead of Video.js's 10 (set `value` on the `media-hotkey` and `media-gesture` elements to change it), and clicking or tapping outside an open settings menu only closes the menu instead of also toggling playback or the controls. The settings menu carries a hidden `<caramel-settings-menu>` placeholder that `@esershnr/caramel-settings` fills with its pages; without that package nothing shows. The speed list gains 3x: the speed page is now `<caramel-playback-rate-radio-group>` instead of `<media-playback-rate-radio-group>`, so site CSS that targeted the old tag must follow.

### Patch Changes

- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
  - @esershnr/caramel-icons@0.2.0
  - @esershnr/caramel-theme@0.3.0

## 0.3.0

### Minor Changes

- 8717cc2: Space handling: a subtree marked `data-caramel-native-space` keeps Space for its own buttons instead of toggling playback, so panels inside the player (the new drawer) can use native button activation. The control bar gains a `<caramel-drawer-toggle>` placeholder before the settings button, upgraded by `@esershnr/caramel-drawer`; below 28rem a visible drawer toggle replaces the mute button.

## 0.2.0

### Minor Changes

- d72b437: Theme tokens no longer use `light-dark()`, so production builds keep the theme
  with any bundler target. Vite's default build lowered `light-dark()` into
  variables that only exist on `.caramel-theme`, which left every `:root` token
  invalid. Themed roles are now `--caramel-<role>-light` / `-dark` pairs and each
  `.caramel-theme` scope resolves the active value. Overriding `--caramel-<role>`
  still sets one value for both schemes; the new `-light` / `-dark` names change
  one scheme only. Presets use the pairs. The `build.cssTarget` workaround is no
  longer needed.

### Patch Changes

- d72b437: The npm package now includes `CHANGELOG.md`, and the README links to it.
- Updated dependencies [d72b437]
- Updated dependencies [d72b437]
  - @esershnr/caramel-theme@0.2.0
  - @esershnr/caramel-icons@0.1.1

## 0.1.0

First public release.
