import { defineConfig } from 'vitest/config';
import { sourceResolve } from '../../vitest.shared.ts';

export default defineConfig({
  ...sourceResolve,
  test: { name: 'encode-hls', environment: 'node', include: ['test/**/*.test.ts'] },
});
