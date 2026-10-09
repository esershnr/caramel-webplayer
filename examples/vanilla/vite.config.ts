import { defineConfig } from 'vite';

export default defineConfig({
  // Workspace packages resolve to their TypeScript sources through the
  // `development` export condition in dev mode; `vite build` needs `pnpm build` first.
  server: { open: false },
});
