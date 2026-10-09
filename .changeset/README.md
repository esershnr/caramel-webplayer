# Changesets

Every change to a published `@esershnr/caramel-*` package carries a changeset
in this folder. Run `pnpm changeset`, pick the packages and the bump, and
describe the change for the changelog. See `CONTRIBUTING.md`.

## Versioning policy

The seven published packages are versioned independently (no `fixed` or
`linked` groups):

- A fix in one package should not publish six unchanged packages with new
  numbers; independent versions keep changelogs and npm diffs honest.
- Internal dependencies are published as exact versions (`workspace:*`), so
  when a package is bumped every package that depends on it, including the
  umbrella `@esershnr/caramel-webplayer`, gets a patch bump automatically
  (`updateInternalDependencies: "patch"`). Installing the latest umbrella
  therefore always pulls the latest of every package.
- Private workspace packages (`scripts/*`, `examples/*`) are never versioned
  or tagged (`privatePackages`).
