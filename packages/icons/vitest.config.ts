import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'icons', environment: 'node', include: ['test/**/*.test.ts'] },
});
