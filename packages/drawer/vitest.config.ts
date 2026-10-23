import { defineConfig } from 'vitest/config';
import { sourceResolve } from '../../vitest.shared';

export default defineConfig({
  ...sourceResolve,
  test: { name: 'drawer', environment: 'node', include: ['test/**/*.test.ts'] },
});
