# esersahiner web player

Custom Video.js 10 player packages for esersahiner.com. Built on `@videojs/html`
custom elements with thin React wrappers.

## Packages

| Package | Purpose |
| --- | --- |
| `@esersahiner/player-theme` | `--esp-*` design tokens, light/dark resolution, live theme watcher |
| `@esersahiner/player-icons` | Lucide icon data and morphing icon element |
| `@esersahiner/player-skin` | Video.js 10 skin source, themed and animated |
| `@esersahiner/player-skip-segments` | Skip intro/recap/outro/sponsor segments |

## Development

```sh
pnpm install
pnpm test
pnpm dev:vanilla
pnpm dev:react
```
