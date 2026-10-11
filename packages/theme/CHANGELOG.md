# @esershnr/caramel-theme

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

## 0.1.0

First public release.
