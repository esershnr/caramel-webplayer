// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { isBound, mountFixture, settle } from './binding';

it('binds when registered before <video-player>', async () => {
  await import('../src/define');
  const player = mountFixture();
  await settle();
  expect(customElements.get('video-player')).toBeUndefined();
  expect(isBound(player)).toBe(false);

  await import('@videojs/html/video/player');
  await settle();
  expect(isBound(player)).toBe(true);
});

it('binds an element connected after both are defined', async () => {
  const player = mountFixture();
  await settle();
  expect(isBound(player)).toBe(true);
});
