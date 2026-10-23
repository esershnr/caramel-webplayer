import { defineConfig } from 'vitest/config';
import { sharedTest, sourceResolve } from '../../vitest.shared.ts';

export default defineConfig({
  ...sourceResolve,
  test: { ...sharedTest, name: 'gen-thumbs', environment: 'node', include: ['test/**/*.test.ts'] },
});
