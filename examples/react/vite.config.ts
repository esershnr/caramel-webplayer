import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { serveOut } from '../vite-serve-out';

export default defineConfig({
  // Workspace packages resolve to their TypeScript sources through the custom
  // `caramel-source` export condition (see examples/vanilla/vite.config.ts).
  resolve: { conditions: ['caramel-source', 'module', 'browser', 'development|production'] },
  plugins: [react(), serveOut(path.resolve(import.meta.dirname, '../../out'))],
});
