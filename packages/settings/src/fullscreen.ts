/**
 * "Fullscreen on play": the player enters fullscreen when the user starts
 * playback. Browsers only grant fullscreen inside a trusted user event, so the
 * request is made synchronously from the input that starts playback (the play
 * button, a hotkey, a gesture), never from a `play` event: playlist
 * auto-advance and autoplay do not go through these paths and stay inline.
 *
 * Hotkeys and gestures are observed through `subscribeToInputActions` of
 * `@videojs/html`. It is marked internal there, so it is looked up once and
 * defensively: when it is missing or throws, the feature is off and nothing
 * else changes.
 */
import * as html from '@videojs/html';

export interface FullscreenSnapshot {
  fullscreenAvailability?: string | undefined;
  isFullscreen?: boolean | undefined;
  requestFullscreen?: (() => unknown) | undefined;
}

/** Reads the player state at the moment of the input. */
export interface AutoFullscreenSource {
  /** Paused state before the input acts (undefined without a player). */
  paused(): boolean | undefined;
  fullscreen(): FullscreenSnapshot | undefined;
}

export interface InputActionLike {
  action: string;
}

export type SubscribeToInputActions = (
  container: HTMLElement,
  callback: (event: InputActionLike) => void,
) => () => void;

/** True when this input is about to start playback and fullscreen can be entered. */
export function shouldEnterFullscreen(
  paused: boolean | undefined,
  fullscreen: FullscreenSnapshot | undefined,
): boolean {
  if (paused !== true || !fullscreen) return false;
  if (fullscreen.fullscreenAvailability !== 'available' || fullscreen.isFullscreen) return false;
  return typeof fullscreen.requestFullscreen === 'function';
}

/** Requests fullscreen when the guard allows it. Never throws; a rejected request is ignored. */
export function enterFullscreenIfStarting(source: AutoFullscreenSource): boolean {
  try {
    const fullscreen = source.fullscreen();
    if (!shouldEnterFullscreen(source.paused(), fullscreen)) return false;
    const result = fullscreen!.requestFullscreen!();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      (result as Promise<unknown>).then(undefined, () => {});
    }
    return true;
  } catch {
    return false;
  }
}

let resolved: SubscribeToInputActions | null | undefined;

/** `subscribeToInputActions` from `@videojs/html`, or null when this version does not export it. */
export function resolveSubscribeToInputActions(): SubscribeToInputActions | null {
  if (resolved !== undefined) return resolved;
  try {
    const fn = (html as unknown as Record<string, unknown>)['subscribeToInputActions'];
    resolved = typeof fn === 'function' ? (fn as SubscribeToInputActions) : null;
  } catch {
    resolved = null;
  }
  return resolved;
}

/** Whether the feature can work in this build (the input action hook exists). */
export function autoFullscreenSupported(): boolean {
  return resolveSubscribeToInputActions() !== null;
}

const PLAY_BUTTON = 'media-play-button';

/**
 * Watches the player's inputs and requests fullscreen when one starts
 * playback. Returns the uninstall function. `subscribe` defaults to the
 * Video.js hook; when it is missing or throws, nothing is installed.
 */
export function installAutoFullscreen(
  container: HTMLElement,
  source: AutoFullscreenSource,
  subscribe: SubscribeToInputActions | null = resolveSubscribeToInputActions(),
): () => void {
  if (!subscribe) return () => {};
  let unsubscribe: (() => void) | null = null;
  try {
    const off = subscribe(container, (event) => {
      if (event?.action === 'togglePaused') enterFullscreenIfStarting(source);
    });
    unsubscribe = typeof off === 'function' ? off : null;
  } catch {
    return () => {};
  }
  const abort = new AbortController();
  // Capture phase: runs before the play button toggles playback, while `paused` is still true.
  container.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(PLAY_BUTTON) && container.contains(target)) {
        enterFullscreenIfStarting(source);
      }
    },
    { capture: true, signal: abort.signal },
  );
  return () => {
    abort.abort();
    try {
      unsubscribe?.();
    } catch {
      // The coordinator went away with the container.
    }
  };
}
