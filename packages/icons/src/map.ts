/**
 * Attribute to icon rules used by <caramel-morph-icon>.
 *
 * Syntax of the `map` attribute: comma separated rules, first match wins.
 *   - `data-ended:restart`            attribute present (any value)
 *   - `data-volume-level=low:volume-low`  attribute equals value
 *   - `*:pause`                       fallback when nothing above matched
 *
 * Example for the Video.js play button:
 *   map="data-ended:restart,data-paused:play,*:pause"
 *
 * Shorthand attributes: `watch="data-paused" on="play" off="pause"` is the
 * same as `map="data-paused:play,*:pause"`.
 */
export interface IconRule {
  /** Attribute to inspect, or null for the wildcard fallback. */
  attr: string | null;
  /** Required attribute value, or null for presence only. */
  value: string | null;
  icon: string;
}

export function parseIconRules(source: string | null | undefined): IconRule[] {
  const rules: IconRule[] = [];
  if (!source) return rules;
  for (const raw of source.split(',')) {
    const pair = raw.trim();
    if (!pair) continue;
    const sep = pair.lastIndexOf(':');
    if (sep <= 0) continue;
    const key = pair.slice(0, sep).trim();
    const icon = pair.slice(sep + 1).trim();
    if (!key || !icon) continue;
    if (key === '*') {
      rules.push({ attr: null, value: null, icon });
      continue;
    }
    const eq = key.indexOf('=');
    if (eq === -1) rules.push({ attr: key, value: null, icon });
    else rules.push({ attr: key.slice(0, eq).trim(), value: key.slice(eq + 1).trim(), icon });
  }
  return rules;
}

export function rulesFromOnOff(
  watch: string | null | undefined,
  on: string | null | undefined,
  off: string | null | undefined,
): IconRule[] {
  const rules: IconRule[] = [];
  if (watch && on) rules.push({ attr: watch, value: null, icon: on });
  if (off) rules.push({ attr: null, value: null, icon: off });
  return rules;
}

/** Distinct attribute names the rules depend on, in order of appearance. */
export function watchedAttributes(rules: IconRule[]): string[] {
  const seen = new Set<string>();
  for (const rule of rules) if (rule.attr) seen.add(rule.attr);
  return [...seen];
}

/**
 * Picks the icon for the current element state. `getAttr` returns the
 * attribute value or null when absent. Returns undefined when nothing matches.
 */
export function pickIcon(rules: IconRule[], getAttr: (attr: string) => string | null): string | undefined {
  for (const rule of rules) {
    if (rule.attr === null) return rule.icon;
    const current = getAttr(rule.attr);
    if (current === null) continue;
    if (rule.value === null || rule.value === current) return rule.icon;
  }
  return undefined;
}
