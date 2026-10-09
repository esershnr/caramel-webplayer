import path from 'node:path';
import { defineConfig } from 'vite';
import { serveOut } from '../vite-serve-out';

export default defineConfig({
  // Workspace packages resolve to their TypeScript sources through the custom
  // `caramel-source` export condition (dev and build). Published consumers never
  // enable it and get dist. The rest is Vite's default client list, which
  // `conditions` replaces.
  resolve: { conditions: ['caramel-source', 'module', 'browser', 'development|production'] },
  server: { open: false },
  // encode-hls output (repo `out/`) under /out/ with Range support.
  plugins: [serveOut(path.resolve(import.meta.dirname, '../../out'))],
});
