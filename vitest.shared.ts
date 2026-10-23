/**
 * Workspace packages export their TypeScript sources under the custom
 * `caramel-source` condition (published consumers never enable it, so they get
 * dist). Tests resolve sibling packages to source through it. The rest is
 * Vite's default server condition list, which `conditions` replaces.
 */
const conditions = ['caramel-source', 'module', 'node', 'development|production'];

export const sourceResolve = {
  resolve: { conditions },
  ssr: { resolve: { conditions } },
};

/** One place for every project's test defaults. `testTimeout` is raised because a
 *  cold run on Windows spawns one worker per project and a dynamic import can
 *  take several seconds under that load (chapters ssr.test.ts timed out at ~5.2 s
 *  against the 5 s default). */
export const sharedTest = { testTimeout: 15_000 } as const;
