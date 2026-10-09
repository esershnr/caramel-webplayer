import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'encode-hls', environment: 'node', include: ['test/**/*.test.ts'] },
});
