/**
 * Workspace packages export their TypeScript sources under the custom
 * `esp-source` condition (published consumers never enable it, so they get
 * dist). Tests resolve sibling packages to source through it. The rest is
 * Vite's default server condition list, which `conditions` replaces.
 */
const conditions = ['esp-source', 'module', 'node', 'development|production'];

export const sourceResolve = {
  resolve: { conditions },
  ssr: { resolve: { conditions } },
};
