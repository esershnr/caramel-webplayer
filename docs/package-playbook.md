# Package playbook

How every package in this monorepo is built. Follow it instead of reading the
whole repo. Paths are repo relative; `file:line` points at the reference
implementation (`packages/skip-segments`, `packages/skin`).

## 1. Package skeleton

Copy the shape of `packages/skip-segments`:

| File | Reference | Notes |
| --- | --- | --- |
| `package.json` | `packages/skip-segments/package.json:1-55` | `type: module`, `sideEffects` lists CSS and `define` entries, `files: ["dist", "README.md", "LICENSE"]`. Every export has three conditions in this order: `caramel-source` (TS source, enabled only by our tsconfig, Vite and Vitest configs), `types` (dist d.ts), `default` (dist js). CSS exports use `caramel-source` for `src/styles` and `default` for `dist/styles`. Never use the `development` condition: Next.js and Vite enable it in consumer dev builds, and the published tarball has no `src`. Extra exports: `./define`, `./react`, `./<name>.css`, `./package.json`. `@videojs/html` (10.0.x) is a peer; React and React DOM (>=19) are optional peers (`peerDependenciesMeta`). `publishConfig.access` is `public`. |
| `tsconfig.json` | `packages/skip-segments/tsconfig.json` | extends `../../tsconfig.base.json`, `noEmit`, `jsx: react-jsx`, includes `src` and `test`. |
| `tsconfig.build.json` | `packages/skip-segments/tsconfig.build.json` | `outDir: dist`, `rootDir: src`. |
| `vitest.config.ts` | `packages/skip-segments/vitest.config.ts` | `test.name`, `environment: node`, `include: ['test/**/*.test.ts']`. The root `vitest.config.ts:5` picks up `packages/*` and `scripts/*` automatically. |
| `src/css.d.ts` | `packages/skip-segments/src/css.d.ts` | `declare module '*.css';` |
| `src/index.ts` | `packages/skip-segments/src/index.ts` | Pure exports plus element class. Must be importable in Node and during SSR: no top level DOM access. |
| `src/define.ts` | `packages/skip-segments/src/define.ts:1-12` | Imports the stylesheet, guards `typeof window`, `customElements.get(tag)` before `define`, and calls itself on import. |
| `src/react.tsx` | `packages/skip-segments/src/react.tsx` | See section 3. |
| `src/styles/<name>.css` | `packages/skip-segments/src/styles/skip-segments.css` | See section 4. |

Scripts: `build` (`tsc -p tsconfig.build.json` plus copying `src/styles` to `dist/styles`),
`typecheck`, `test`. The root `tsconfig.base.json:7` sets `customConditions: ["caramel-source"]`
so workspace imports resolve to TS sources without a build.

Never run `pnpm add` or `pnpm install`. Dependencies are already declared in your
package.json; if you need another one, say so in your report.

## 2. Web Component pattern

Reference: `packages/skip-segments/src/element.ts`.

- Extend Video.js 10 `UIElement` through an SSR safe base (`element.ts:16-18`):
  `const Base = typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;`
- Read player state with `PlayerController(this, playerContext, selectX)` (`element.ts:55-56`).
  Selectors from `@videojs/html`: `selectTime` (`currentTime`, `duration`, `seek()`),
  `selectPlayback` (`paused`, `ended`, `play()`, `pause()`), `selectSource` (`currentSrc`),
  `selectTextTrack` (`chaptersCues: { startTime, endTime, text }[]`, `textTrackList`,
  `selectSubtitlesTrack()`), `selectMetadata` (`title`, `poster`). A selector returns
  `undefined` until the element sits inside a `<video-player>`; guard every read.
  Context requests go out once, on connect. If your element can be registered before
  `<video-player>`, wait for the undefined ancestor with `whenDefined` and reconnect the
  controllers (`packages/skip-segments/src/element.ts`, `#awaitProvider`). Only await tags
  that are not defined yet: a resolved `whenDefined` that re-arms itself spins a microtask loop.
- Do all DOM work in `update(changed: PropertyValues)` after `super.update(changed)`
  (`element.ts:126`). Call `this.requestUpdate()` after changing your own inputs.
- Listeners go through one `AbortController` created in `connectedCallback` and aborted in
  `disconnectedCallback` (`element.ts:67, 93, 98-104`). Observers are disconnected there too.
  The browser may connect and disconnect the same element many times.
- Light DOM only, no shadow root. Render into `this` with `replaceChildren`.
- Attributes for primitives (`observedAttributes` extends `super.observedAttributes`,
  `element.ts:50-52`), properties for objects (`segments` setter, `element.ts:69-78`), both
  accepted when a JSON attribute is convenient for SSR (`element.ts:155-165`).
- Events: `CustomEvent` with `bubbles: true, composed: true`, names prefixed `caramel-`
  (`element.ts:251-253`).
- Keyboard: custom elements are not native buttons. Use real `<button>` elements inside
  (`element.ts:176-190`) or implement the ARIA pattern by hand (role, tabindex, Enter and
  Space on keyup). Lists use roving tabindex: one item at `tabindex="0"`, the rest `-1`.
- Elements that are not on the video must not depend on `.media-skin` CSS. Locate the
  player with `this.closest('video-player')` when they live inside it, or accept a
  `player` property / `for="<id>"` attribute when they live outside (panels do).

## 3. React wrapper

Reference: `packages/skin/src/react.tsx` and `packages/skip-segments/src/react.tsx`.

- First line `'use client';` (`react.tsx:1`).
- Register the element in the browser only: `useEffect(() => { void import('./define.js'); }, [])`
  (`packages/skip-segments/src/react.tsx:43-45`). Never import `define` at module top.
- Anything that must mount after the player elements exist is gated with a `ready` state
  that flips when the dynamic import resolves (`packages/skin/src/react.tsx:31-39, 53`).
  The skin does this for the media; a component that creates its own `<video-player>` must
  do the same for its media.
- Ids come from `useId()` passed through `sanitizeUid` so they are safe in `id`/`for`
  attributes (`packages/skin/src/react.tsx:27`, `packages/skin/src/template-utils.ts:4-7`).
- Pass data as JSON string attributes when it must match on server and client
  (`packages/skip-segments/src/react.tsx:37, 68`); subscribe to `caramel-*` events with
  `addEventListener` inside an effect with an `AbortController` (`react.tsx:47-63`).
- Declare the custom element for TSX with `declare module 'react' { namespace JSX { interface IntrinsicElements { ... } } }`
  and use `import('react').CSSProperties` / `ReactNode` inside it (`react.tsx:79-95`).
  Use `class`, not `className`, on custom elements.

## 4. Theme tokens and the `.caramel-theme` scope

Reference: `packages/theme/styles/tokens.css`.

- Colors are `--caramel-*` custom properties. Themed roles are declared as
  `--caramel-<role>-light` / `-dark` pairs on `:root`; packages read the resolved
  `--_caramel-<role>` values, which every `.caramel-theme` scope computes for its scheme.
  No `light-dark()` (minifiers lower it and break `:root` tokens in production builds).
  Never write hex in a package stylesheet; derive hovers with `color-mix()`.
- Surfaces outside the video (panels, lists, menus) follow the page theme. Give the root
  element of such a component the class `caramel-theme`: it resolves `color-scheme`
  and the `--_caramel-*` values, so the tokens flip with `prefers-color-scheme`, `data-theme="light|dark"`
  or `.dark` on `<html>`. Controls over the video use the `--caramel-overlay-*` roles instead
  and stay dark.
- Roles: `--caramel-bg` page, `--caramel-surface` panel, `--caramel-raised` item box,
  `--caramel-raised-hover` hover row, `--caramel-divider`, `--caramel-border` (interactive edge),
  `--caramel-text`, `--caramel-muted`, `--caramel-primary` (selection, focus ring, active marker),
  `--caramel-solid` + `--caramel-solid-contrast` (filled button), `--caramel-accent` (decoration only,
  never text), `--caramel-accent-text` (readable caramel).
- Corners `--caramel-radius-panel` 24px, `--caramel-radius-box` 16px, `--caramel-radius-chip` pill.
  Focus ring `outline: var(--caramel-focus-ring); outline-offset: var(--caramel-focus-offset)` or the
  `.caramel-focusable` utility (`tokens.css:132`). Numbers `font-variant-numeric: tabular-nums`
  or `.caramel-tabular`.
- Motion: animate only `transform` and `opacity`, never `transition: all`. Use
  `--caramel-ease-spring` for entrances that should bounce, `--caramel-ease-enter` for soft reveals,
  `--caramel-ease-fill` for symmetric moves, durations `--caramel-duration-*`. Under
  `prefers-reduced-motion` every `--caramel-duration-*` is already 0ms (`tokens.css:83-93`);
  scrolling (`scrollIntoView`) must switch to `behavior: 'instant'` yourself.
- Typography: `font-family: var(--caramel-font-body)`, headings `var(--caramel-font-heading)`.
- Put the stylesheet's rules in plain, unlayered CSS scoped by your element's tag or class
  (`packages/skip-segments/src/styles/skip-segments.css:15, 32`). Do NOT add `@layer`
  rules for sizing or layout: the Video.js skin keeps its layout in `@layer base`, and a
  later layer silently wins over it (this caused the giant menu icon bug in Phase 1).
- Add a `@media (forced-colors: active)` block for buttons and markers
  (`skip-segments.css:138-150`).

## 5. Icons

- Data lives in `@esershnr/caramel-icons` (`packages/icons/src/icons.ts:37`). Build DOM
  with `createIconElement(icons['skip-forward'])` or markup with `iconToSvg(node, { className })`
  (`packages/icons/src/svg.ts:34, 54`). The returned `<svg>` is the sized box: size it with
  your own class, never with `width/height: 100%` on a generic `.caramel-icon` selector.
- Optical correction uses `transform: scale()` keyed by `caramel-icon-<name>` classes
  (`packages/skin/src/styles/skin.css:88-101`); cast, airplay, pip, captions-off, speech are
  0.88, settings, speed, restart 1.06. Reuse those factors when you place the same glyphs.
- Morphing buttons use `<caramel-morph-icon map="attr:icon,*:fallback">` from
  `@esershnr/caramel-icons/define` (`packages/icons/src/morph-icon.ts:8-30`).

## 6. i18n (TR default, EN)

Reference: `packages/skip-segments/src/i18n.ts` and `element.ts:57, 200`.

- Register strings once in an idempotent `register<Name>I18n()` with `registerI18n` from
  `@videojs/html/i18n`, under the `caramel.<name>.*` namespace, for both `tr` and `en`
  (`i18n.ts:30-40`). The call is cast because the built-in catalog is typed.
- Read them with `I18nController(this, i18nContext)` and
  `this.#i18n.value('caramel.x.y', { default: 'English text' })`. The English default is the
  fallback; Turkish wins when `<media-i18n lang="tr">` or an ancestor `lang="tr"` applies.
- UI copy never uses an em dash.

## 7. Tests

- Vitest covers pure logic only: models, parsers, geometry, persistence helpers
  (`packages/skip-segments/test/*.test.ts`). Keep that logic in DOM free modules
  (`model.ts`, `segments.ts`) so it is testable; the element is a thin adapter.
- Run `pnpm --filter <pkg> test` and `pnpm --filter <pkg> typecheck`; both must pass.
- Every popup, panel or menu must also be verified in its OPEN state with
  `node tools/shots.mjs <dir>` once integrated (Phase 1 lesson). Implementers report what
  they could not verify visually.

## 8. Commits

Conventional Commits, English, imperative, about 50 characters, scope = package name:
`feat(chapters): add chapter list panel`. No attribution lines. Never push. Commit only
files inside your own folder.
