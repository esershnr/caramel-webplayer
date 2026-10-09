# Contributing to Caramel Webplayer

Thanks for helping out. This guide covers the setup, the checks every change
has to pass and how a change becomes a release. By participating you agree to
the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues go through
[SECURITY.md](SECURITY.md), not public issues.

## Requirements

- Node.js 22 or newer (`engines.node` in `package.json`).
- pnpm, the exact version pinned in the root `package.json` `packageManager`
  field. With Corepack: `corepack enable`, then any `pnpm` command uses the
  pinned version.
- Optional: ffmpeg and ffprobe for `scripts/gen-thumbs` and
  `scripts/encode-hls`.
- Optional: Microsoft Edge for `tools/shots.mjs` (it drives the installed Edge
  through Playwright).

## Setup

```sh
git clone https://github.com/esershnr/caramel-webplayer.git
cd caramel-webplayer
pnpm install
```

Workspace packages resolve each other to their TypeScript sources through the
`caramel-source` export condition, so tests, typecheck and the demos work
without a build.

## Demos

```sh
pnpm dev:vanilla   # http://localhost:5173  (add ?theme=light or ?theme=dark)
pnpm dev:react     # http://localhost:5174
```

The demos play public Mux test streams and the `openwrt-rehber` item from
`https://cdn.esersahiner.com/videos/openwrt-rehber/v1/manifest.json` (CORS
allows both dev ports). `media/` and `out/` are git ignored: they hold
`encode-hls` input and output on the maintainer's machine. When
`out/openwrt-rehber/manifest.json` is missing the demos skip that local item,
so you do not need any media files. To test your own encode, run
`caramel-encode-hls` (see `scripts/encode-hls/README.md`) and the demos pick up
`out/<slug>/` through `examples/vite-serve-out.ts`.

## Checks

Every pull request runs these in CI; run them locally first:

```sh
pnpm lint            # Biome lint
pnpm format:check    # Biome format (pnpm format writes the fixes)
pnpm typecheck
pnpm test            # Vitest
pnpm build           # dist/ for every package
```

Tests cover pure logic (models, parsers, geometry, persistence) plus a few
DOM tests under happy-dom. Keep new logic in DOM free modules so it can be
tested in Node, and keep elements thin.

### Visual changes

CSS, markup and anything that opens a popup must be checked in the browser.
`tools/shots.mjs` screenshots both demos in both themes with every popup in
its OPEN state (settings menu and each submenu, volume popover, timeline
preview, playlist next item, chapter select) and writes contact sheets. It
also reports console errors and failed requests per page.

```sh
pnpm dev:vanilla   # terminal 1
pnpm dev:react     # terminal 2
node tools/shots.mjs shots
```

Attach the relevant shots (before and after) to your pull request.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) in English,
imperative mood, about 50 characters, scoped by package folder name:

```text
feat(chapters): add chapter list panel
fix(skip-segments): bind when registered before player
docs: explain theme presets
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `revert`. Pull requests are squash merged, so the pull request
title must follow the same format; CI checks it.

## Pull requests

1. Fork, then branch from `main`.
2. Make the change, add or update tests, run the checks above.
3. Add a changeset if a published package changes (below).
4. Open the pull request and fill in the template: which package, how you
   tested, how you verified visual changes.
5. A maintainer reviews. CI must be green before merge.

## Changesets

Releases are managed with [Changesets](https://github.com/changesets/changesets).
Any change that affects what users install (code, CSS, types, package
README) needs one:

```sh
pnpm changeset
```

Pick the packages, the bump (`patch` for fixes, `minor` for features while
we are on 0.x, `major` only after 1.0) and write one or two sentences for the
changelog, from the user's point of view. Commit the generated
`.changeset/*.md` file with your change. Documentation, tests, CI and the
private packages (`scripts/*`, `examples/*`) need no changeset.

After merge, a "Version Packages" pull request collects the pending
changesets; merging it publishes to npm from CI. Contributors never publish.

## Adding a new package

The full recipe, with references into existing code, is
[`docs/package-playbook.md`](docs/package-playbook.md). In short:

1. Copy the shape of `packages/skip-segments`: `package.json` (exports with
   `caramel-source`, `types`, `default` conditions; `sideEffects`; `files`;
   `@videojs/html` as a peer), `tsconfig.json`, `tsconfig.build.json`,
   `vitest.config.ts`, `src/index.ts` (SSR safe), `src/define.ts`,
   `src/react.tsx`, `src/styles/<name>.css`, `LICENSE`, `README.md`.
2. Build elements on Video.js 10 `UIElement`, light DOM only, state through
   `PlayerController`, listeners on one `AbortController`.
3. Colors only through `--caramel-*` tokens, motion only on `transform` and
   `opacity`, i18n under `caramel.<name>.*` for `tr` and `en`.
4. Re-export it from `packages/webplayer` (index, `define`, `react`).
5. Add it to the package table in `README.md` and add a changeset
   (`minor`) for the new package and the umbrella.

## Style

Biome formats and lints everything (`biome.json`). The vendored Video.js skin
files under `packages/skin/src/components/videojs/` and the generated
`packages/skin/src/template.ts` are excluded; edit `skin.html` and run
`pnpm --filter @esershnr/caramel-skin build:template` instead. UI strings and
docs never use an em dash.
