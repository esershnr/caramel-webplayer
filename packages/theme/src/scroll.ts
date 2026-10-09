/** True when the OS asks for reduced motion. Safe without a DOM. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface ScrollIntoContainerOptions {
  /** Extra space kept between the element and the container edge, in px. Default 4. */
  padding?: number | undefined;
  /** Force a behavior; defaults to `smooth`, or `instant` under reduced motion. */
  behavior?: ScrollBehavior | undefined;
}

/**
 * Scrolls `container` so that `element` is visible, touching nothing else.
 * Unlike `element.scrollIntoView`, ancestors of the container (the page) are
 * never scrolled, so an auto-advancing playlist cannot yank the viewport.
 * Does nothing when the container does not overflow or the element is in view.
 */
export function scrollIntoContainer(
  container: HTMLElement,
  element: HTMLElement,
  options: ScrollIntoContainerOptions = {},
): void {
  if (container.scrollHeight <= container.clientHeight) return;
  const padding = options.padding ?? 4;
  const behavior = options.behavior ?? (prefersReducedMotion() ? 'instant' : 'smooth');
  const c = container.getBoundingClientRect();
  const e = element.getBoundingClientRect();
  const top = e.top - c.top + container.scrollTop;
  const bottom = top + e.height;
  let target: number | null = null;
  if (top - padding < container.scrollTop) target = top - padding;
  else if (bottom + padding > container.scrollTop + container.clientHeight) {
    target = bottom + padding - container.clientHeight;
  }
  if (target === null) return;
  container.scrollTo({ top: Math.max(0, target), behavior });
}
