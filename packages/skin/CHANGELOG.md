# @esershnr/caramel-skin

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
