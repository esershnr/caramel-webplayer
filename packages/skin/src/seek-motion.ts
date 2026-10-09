/**
 * Marks a `<media-time-slider>` with `data-esp-seek` for a short window after
 * any seek (click, drag end, keyboard, chapter or skip button), so the skin
 * can animate the thumb and fill to the new position only then. Playback
 * progress never carries the attribute, so the thumb never lags behind.
 *
 * Video.js sets `data-seeking` while a seek is in flight; that attribute often
 * disappears before the transition finishes, which is why a timed flag exists.
 */
export const SEEK_MOTION_ATTR = 'data-esp-seek';
const WINDOW_MS = 600;
/** A seek that starts this soon after a key press inside a player is a jump. */
const KEY_WINDOW_MS = 400;

let installed = false;

export function installSeekMotion(root: Document = document): () => void {
  if (installed || typeof MutationObserver === 'undefined') return () => {};
  installed = true;
  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();
  // Keyboard seeks (arrows, 0-9, Home / End) jump without animation.
  let lastKey = -Infinity;
  const onKey = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest('video-player')) lastKey = performance.now();
  };
  root.addEventListener('keydown', onKey, true);

  const flag = (slider: Element) => {
    slider.setAttribute(SEEK_MOTION_ATTR, '');
    const previous = timers.get(slider);
    if (previous) clearTimeout(previous);
    timers.set(
      slider,
      setTimeout(() => {
        slider.removeAttribute(SEEK_MOTION_ATTR);
        timers.delete(slider);
      }, WINDOW_MS),
    );
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target;
      if (!(target instanceof Element) || target.localName !== 'media-time-slider') continue;
      if (!target.hasAttribute('data-seeking')) continue;
      if (performance.now() - lastKey < KEY_WINDOW_MS) continue;
      flag(target);
    }
  });
  observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-seeking'] });

  return () => {
    observer.disconnect();
    root.removeEventListener('keydown', onKey, true);
    installed = false;
  };
}
