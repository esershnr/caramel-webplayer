export type Theme = 'light' | 'dark';

export interface ThemeSignals {
  /** Nearest `data-theme` value found walking up from the element, if any. */
  dataTheme?: string | null | undefined;
  /** Class list of the document root (`<html>`). */
  rootClassList?: Iterable<string> | undefined;
  /** `data-theme` attribute on the document root. */
  rootDataTheme?: string | null | undefined;
  /** Result of `matchMedia('(prefers-color-scheme: dark)').matches`. */
  prefersDark?: boolean | undefined;
}

function asTheme(value: string | null | undefined): Theme | null {
  if (value === 'light' || value === 'dark') return value;
  return null;
}

/**
 * Pure theme resolution. Mirrors the CSS cascade in tokens.css:
 * local data-theme > root data-theme > root .dark/.light class > OS preference.
 */
export function resolveTheme(signals: ThemeSignals): Theme {
  const local = asTheme(signals.dataTheme);
  if (local) return local;

  const rootAttr = asTheme(signals.rootDataTheme);
  if (rootAttr) return rootAttr;

  if (signals.rootClassList) {
    for (const cls of signals.rootClassList) {
      if (cls === 'dark') return 'dark';
      if (cls === 'light') return 'light';
    }
  }

  return signals.prefersDark ? 'dark' : 'light';
}

/** Reads the signals for an element from the live DOM. */
export function readThemeSignals(element: Element | null | undefined): ThemeSignals {
  if (typeof document === 'undefined') return {};
  const root = document.documentElement;
  const owner = element?.closest<HTMLElement>('[data-theme]');
  const local = owner && owner !== root ? owner.dataset['theme'] : null;
  const prefersDark =
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)').matches : false;
  return {
    dataTheme: local,
    rootDataTheme: root.dataset['theme'],
    rootClassList: Array.from(root.classList),
    prefersDark,
  };
}

/** Resolves the theme that applies to an element right now. */
export function resolveThemeFor(element?: Element | null): Theme {
  return resolveTheme(readThemeSignals(element));
}
