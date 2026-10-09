import { SKIN_TEMPLATE } from './template.js';
import { applyUid, sanitizeUid, splitAtMedia } from './template-utils.js';

export { SKIN_TEMPLATE } from './template.js';
export { applyUid, sanitizeUid, splitAtMedia, splitContainer, parseOpenTag, MEDIA_MARKER } from './template-utils.js';

export interface MountSkinOptions {
  /** Media element (`<video>`, `<hls-video>`, ...) placed inside the skin. */
  media: Element;
  /** Id prefix for tooltip and popover wiring. Must be unique per player on the page. */
  uid?: string | undefined;
  /** Extra elements appended inside the container (skip buttons, custom UI). */
  extras?: Iterable<Element> | undefined;
}

let counter = 0;

/**
 * Renders the skin into a `<video-player>` element and places the media
 * inside it. Register the elements first with `import '@esersahiner/player-skin/define'`.
 *
 *   const player = document.querySelector('video-player');
 *   const video = Object.assign(document.createElement('video'), { src });
 *   mountSkin(player, { media: video });
 */
export function mountSkin(player: Element, options: MountSkinOptions): HTMLElement {
  const uid = sanitizeUid(options.uid ?? `p${++counter}`);
  const { before, after } = splitAtMedia(applyUid(SKIN_TEMPLATE, uid));
  const template = document.createElement('template');
  template.innerHTML = before + after;
  const container = template.content.firstElementChild as HTMLElement;
  container.prepend(options.media);
  if (options.extras) container.append(...options.extras);
  player.replaceChildren(container);
  return container;
}

/** Full HTML string for server rendering or static pages. */
export function renderSkinHtml(mediaHtml: string, uid = 'esp-player'): string {
  const { before, after } = splitAtMedia(applyUid(SKIN_TEMPLATE, sanitizeUid(uid)));
  return before + mediaHtml + after;
}
export { EspTimeDisplayElement, readTimeDisplayMode, writeTimeDisplayMode, registerTimeDisplayI18n, TIME_DISPLAY_STORAGE_KEY, type TimeDisplayMode } from './time-display.js';
export { installSeekMotion, SEEK_MOTION_ATTR } from './seek-motion.js';
