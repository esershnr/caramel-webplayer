import path from 'node:path';
import { defineConfig } from 'vite';
import { serveOut } from '../vite-serve-out';

export default defineConfig({
  // Workspace packages resolve to their TypeScript sources through the
  // `development` export condition in dev mode; `vite build` needs `pnpm build` first.
  server: { open: false },
  // encode-hls output (repo `out/`) under /out/ with Range support.
  plugins: [serveOut(path.resolve(import.meta.dirname, '../../out'))],
});
