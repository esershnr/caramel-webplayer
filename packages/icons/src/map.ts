/**
 * Attribute to icon mapping used by <esp-morph-icon>.
 *
 * Syntax of the `map` attribute: comma separated `value:icon` pairs.
 *   - `off:volume-off,low:volume-low,*:volume-high`
 *   - the key `*` matches any present value not listed
 *   - the empty key (`:pause`) matches an absent attribute
 *
 * Shorthand attributes `on` / `off` mean: `on` when the watched attribute is
 * present (any value), `off` when it is absent.
 */
export interface IconMap {
  /** Icon for a specific attribute value. */
  values: Map<string, string>;
  /** Icon when the attribute is present with an unlisted value. */
  any: string | null;
  /** Icon when the attribute is absent. */
  absent: string | null;
}

export function parseIconMap(source: string | null | undefined): IconMap {
  const map: IconMap = { values: new Map(), any: null, absent: null };
  if (!source) return map;
  for (const raw of source.split(',')) {
    const pair = raw.trim();
    if (!pair) continue;
    const idx = pair.indexOf(':');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const icon = pair.slice(idx + 1).trim();
    if (!icon) continue;
    if (key === '') map.absent = icon;
    else if (key === '*') map.any = icon;
    else map.values.set(key, icon);
  }
  return map;
}

export function iconMapFromOnOff(on: string | null | undefined, off: string | null | undefined): IconMap {
  return { values: new Map(), any: on ?? null, absent: off ?? null };
}

/**
 * Picks the icon for the current attribute value. `null` means the attribute
 * is absent. Returns undefined when nothing matches.
 */
export function pickIcon(map: IconMap, value: string | null): string | undefined {
  if (value === null) return map.absent ?? undefined;
  return map.values.get(value) ?? map.any ?? undefined;
}
