# @esershnr/caramel-webplayer

## 0.4.0

### Minor Changes

- 6f68ce5: Re-exports `@esershnr/caramel-settings`: `/define` registers `<caramel-settings>` and `/react` exports `<Settings>`.

### Patch Changes

- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
- Updated dependencies [6f68ce5]
  - @esershnr/caramel-drawer@0.1.1
  - @esershnr/caramel-icons@0.2.0
  - @esershnr/caramel-settings@0.1.0
  - @esershnr/caramel-skin@0.4.0
  - @esershnr/caramel-skip-segments@0.3.0
  - @esershnr/caramel-theme@0.3.0
  - @esershnr/caramel-chapters@0.3.1
  - @esershnr/caramel-playlist@0.4.1

## 0.3.0

### Minor Changes

- 8717cc2: Re-exports the new `@esershnr/caramel-drawer` package: `<caramel-drawer>` and `<Drawer>` are available from the umbrella entry, `/define` and `/react`.

### Patch Changes

- Updated dependencies [8717cc2]
- Updated dependencies [8717cc2]
- Updated dependencies [8717cc2]
- Updated dependencies [8717cc2]
  - @esershnr/caramel-drawer@0.1.0
  - @esershnr/caramel-chapters@0.3.0
  - @esershnr/caramel-playlist@0.4.0
  - @esershnr/caramel-skin@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [4b15808]
  - @esershnr/caramel-playlist@0.3.0

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
- Updated dependencies [d72b437]
  - @esershnr/caramel-theme@0.2.0
  - @esershnr/caramel-skin@0.2.0
  - @esershnr/caramel-chapters@0.2.0
  - @esershnr/caramel-playlist@0.2.0
  - @esershnr/caramel-skip-segments@0.2.0
  - @esershnr/caramel-icons@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [dcc58ca]
  - @esershnr/caramel-skip-segments@0.1.1
  - @esershnr/caramel-playlist@0.1.1

## 0.1.0

First public release.
