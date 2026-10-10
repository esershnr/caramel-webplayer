import path from 'node:path';
import { defineConfig } from 'vite';
import { serveOut } from '../vite-serve-out';

export default defineConfig({
  // GitHub Pages serves the demo under /<repo>/ (set by .github/workflows/pages.yml).
  base: process.env['DEMO_BASE'] ?? '/',
  // Workspace packages resolve to their TypeScript sources through the custom
  // `caramel-source` export condition (dev and build). Published consumers never
  // enable it and get dist. The rest is Vite's default client list, which
  // `conditions` replaces.
  resolve: { conditions: ['caramel-source', 'module', 'browser', 'development|production'] },
  server: { open: false },
  // The tokens are light-dark() custom properties on :root. Lowering light-dark()
  // for older targets (Vite's default build target) turns them into
  // --lightningcss-light/dark fallbacks that only resolve on .caramel-theme, so
  // every token is invalid at :root. Keep light-dark() native in the build.
  build: { cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'] },
  // encode-hls output (repo `out/`) under /out/ with Range support.
  plugins: [serveOut(path.resolve(import.meta.dirname, '../../out'))],
});
