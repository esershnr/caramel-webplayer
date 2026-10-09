import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { serveOut } from '../vite-serve-out';

export default defineConfig({
  plugins: [react(), serveOut(path.resolve(import.meta.dirname, '../../out'))],
});
