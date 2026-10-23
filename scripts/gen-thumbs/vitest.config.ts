import { defineConfig } from 'vitest/config';
import { sourceResolve } from '../../vitest.shared.ts';

export default defineConfig({
  ...sourceResolve,
  test: { name: 'gen-thumbs', environment: 'node', include: ['test/**/*.test.ts'] },
});
