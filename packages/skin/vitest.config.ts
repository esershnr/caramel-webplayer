import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'skin', environment: 'node', include: ['test/**/*.test.ts'] },
});
