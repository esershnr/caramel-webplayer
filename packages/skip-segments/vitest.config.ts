import { defineConfig } from 'vitest/config';
import { sourceResolve } from '../../vitest.shared';

export default defineConfig({
  ...sourceResolve,
  test: { name: 'skip-segments', environment: 'node', include: ['test/**/*.test.ts'] },
});
