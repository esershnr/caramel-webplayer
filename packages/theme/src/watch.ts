import { resolveThemeFor, type Theme } from './resolve.js';

export interface WatchThemeOptions {
  /** Element whose effective theme is tracked. Defaults to the document root. */
  element?: Element | null | undefined;
  /** Call the callback once immediately with the current theme. Default true. */
  immediate?: boolean | undefined;
}

/**
 * Watches `data-theme` and class changes on <html>, <body> and the element's
 * own data-theme ancestors, plus the OS preference. Returns an unsubscribe fn.
 * Safe to call during SSR: returns a no-op without a DOM.
 */
export function watchTheme(callback: (theme: Theme) => void, options: WatchThemeOptions = {}): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  const element = options.element ?? document.documentElement;
  let last: Theme | null = null;

  const emit = () => {
    const next = resolveThemeFor(element);
    if (next === last) return;
    last = next;
    callback(next);
  };

  const observer = new MutationObserver(emit);
  const observed = new Set<Element>([document.documentElement]);
  if (document.body) observed.add(document.body);
  let node: Element | null = element;
  while (node) {
    if (node.hasAttribute('data-theme')) observed.add(node);
    node = node.parentElement;
  }
  for (const target of observed) {
    observer.observe(target, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  }

  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  media?.addEventListener('change', emit);

  if (options.immediate !== false) emit();

  return () => {
    observer.disconnect();
    media?.removeEventListener('change', emit);
  };
}
