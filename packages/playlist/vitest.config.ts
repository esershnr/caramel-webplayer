import { defineConfig } from 'vitest/config';
import { sharedTest, sourceResolve } from '../../vitest.shared.ts';

export default defineConfig({
  ...sourceResolve,
  test: { ...sharedTest, name: 'playlist', environment: 'node', include: ['test/**/*.test.ts'] },
});
