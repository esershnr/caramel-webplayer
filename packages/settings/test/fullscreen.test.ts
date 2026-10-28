import { subscribeToInputActions } from '@videojs/html';
import { describe, expect, it, vi } from 'vitest';
import {
  type AutoFullscreenSource,
  autoFullscreenSupported,
  enterFullscreenIfStarting,
  type FullscreenSnapshot,
  installAutoFullscreen,
  resolveSubscribeToInputActions,
  shouldEnterFullscreen,
  type SubscribeToInputActions,
} from '../src/fullscreen.js';

/**
 * `subscribeToInputActions` is internal in @videojs/html. Fullscreen on play
 * depends on it, so an upgrade that drops the export must fail here, loudly,
 * instead of silently turning the feature off.
 */
describe('Video.js input action hook', () => {
  it('is exported by @videojs/html', () => {
    expect(typeof subscribeToInputActions).toBe('function');
    expect(resolveSubscribeToInputActions()).toBe(subscribeToInputActions);
    expect(autoFullscreenSupported()).toBe(true);
  });
});

function snapshot(overrides: Partial<FullscreenSnapshot> = {}) {
  const requestFullscreen = vi.fn(() => Promise.resolve());
  return {
    fullscreenAvailability: 'available',
    isFullscreen: false,
    requestFullscreen,
    ...overrides,
  } satisfies FullscreenSnapshot;
}

function source(paused: boolean | undefined, fullscreen: FullscreenSnapshot | undefined): AutoFullscreenSource {
  return { paused: () => paused, fullscreen: () => fullscreen };
}

describe('fullscreen guard', () => {
  it('enters fullscreen only when the input starts playback', () => {
    expect(shouldEnterFullscreen(true, snapshot())).toBe(true);
    expect(shouldEnterFullscreen(false, snapshot())).toBe(false);
    expect(shouldEnterFullscreen(undefined, snapshot())).toBe(false);
  });

  it('skips unavailable, unsupported and already fullscreen players', () => {
    expect(shouldEnterFullscreen(true, snapshot({ fullscreenAvailability: 'unavailable' }))).toBe(false);
    expect(shouldEnterFullscreen(true, snapshot({ fullscreenAvailability: 'unsupported' }))).toBe(false);
    expect(shouldEnterFullscreen(true, snapshot({ isFullscreen: true }))).toBe(false);
    expect(shouldEnterFullscreen(true, undefined)).toBe(false);
    expect(shouldEnterFullscreen(true, snapshot({ requestFullscreen: undefined }))).toBe(false);
  });

  it('requests fullscreen and swallows a rejection', async () => {
    const fs = snapshot({ requestFullscreen: vi.fn(() => Promise.reject(new Error('denied'))) });
    expect(enterFullscreenIfStarting(source(true, fs))).toBe(true);
    expect(fs.requestFullscreen).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });

  it('does not request while playing or in fullscreen', () => {
    const playing = snapshot();
    expect(enterFullscreenIfStarting(source(false, playing))).toBe(false);
    expect(playing.requestFullscreen).not.toHaveBeenCalled();
    const full = snapshot({ isFullscreen: true });
    expect(enterFullscreenIfStarting(source(true, full))).toBe(false);
    expect(full.requestFullscreen).not.toHaveBeenCalled();
  });

  it('never throws, even when the request throws synchronously', () => {
    const fs = snapshot({
      requestFullscreen: vi.fn(() => {
        throw new Error('boom');
      }),
    });
    expect(enterFullscreenIfStarting(source(true, fs))).toBe(false);
  });
});

/** Minimal container: only addEventListener and contains are used. */
function fakeContainer() {
  const listeners: ((event: { target: unknown }) => void)[] = [];
  return {
    container: {
      addEventListener: (_type: string, fn: (event: { target: unknown }) => void, options: { signal: AbortSignal }) => {
        listeners.push(fn);
        options.signal.addEventListener('abort', () => listeners.splice(listeners.indexOf(fn), 1));
      },
      contains: () => true,
    } as unknown as HTMLElement,
    listeners,
  };
}

describe('installAutoFullscreen', () => {
  it('reacts to togglePaused from hotkeys and gestures only', () => {
    let emit: ((event: { action: string }) => void) | null = null;
    const unsubscribe = vi.fn();
    const subscribe: SubscribeToInputActions = (_container, callback) => {
      emit = callback;
      return unsubscribe;
    };
    const fs = snapshot();
    const { container } = fakeContainer();
    const uninstall = installAutoFullscreen(container, source(true, fs), subscribe);
    emit!({ action: 'seekStep' });
    expect(fs.requestFullscreen).not.toHaveBeenCalled();
    emit!({ action: 'togglePaused' });
    expect(fs.requestFullscreen).toHaveBeenCalledTimes(1);
    uninstall();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('disables itself silently when the hook is missing or throws', () => {
    const { container, listeners } = fakeContainer();
    expect(() => installAutoFullscreen(container, source(true, snapshot()), null)()).not.toThrow();
    const throwing: SubscribeToInputActions = () => {
      throw new Error('internal API changed');
    };
    const uninstall = installAutoFullscreen(container, source(true, snapshot()), throwing);
    expect(listeners).toHaveLength(0);
    expect(() => uninstall()).not.toThrow();
  });

  it('removes the play button listener on uninstall', () => {
    const { container, listeners } = fakeContainer();
    const uninstall = installAutoFullscreen(container, source(true, snapshot()), () => () => {});
    expect(listeners).toHaveLength(1);
    uninstall();
    expect(listeners).toHaveLength(0);
  });
});
