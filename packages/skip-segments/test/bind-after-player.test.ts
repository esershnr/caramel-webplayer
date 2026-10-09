// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { isBound, mountFixture, settle } from './binding';

it('binds when registered after <video-player>', async () => {
  await import('@videojs/html/video/player');
  const player = mountFixture();
  await settle();
  expect(isBound(player)).toBe(false);

  await import('../src/define');
  await settle();
  expect(isBound(player)).toBe(true);
});
