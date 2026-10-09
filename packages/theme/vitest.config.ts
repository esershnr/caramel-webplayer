import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'theme', environment: 'node', include: ['test/**/*.test.ts'] },
});
