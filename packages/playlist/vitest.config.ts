import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'playlist', environment: 'node', include: ['test/**/*.test.ts'] },
});
