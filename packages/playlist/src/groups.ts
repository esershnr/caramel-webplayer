import type { PlaylistItem } from './types.js';

/** One section of the panel: consecutive items sharing a group, or ungrouped items. */
export interface GroupRun {
  /** Group name, or null for a run of items without a group. */
  group: string | null;
  /** Flat index of the first item. */
  start: number;
  /** Flat index after the last item (exclusive). */
  end: number;
}

/**
 * Splits a flat item list into runs of consecutive items with the same group.
 * Items without a group form runs with `group: null`. The same name appearing
 * again after other items starts a new run. Pure, no DOM.
 */
export function groupRuns(items: readonly Pick<PlaylistItem, 'group'>[]): GroupRun[] {
  const runs: GroupRun[] = [];
  let current: GroupRun | null = null;
  items.forEach((item, index) => {
    const group = typeof item.group === 'string' && item.group ? item.group : null;
    if (current && current.group === group) {
      current.end = index + 1;
      return;
    }
    current = { group, start: index, end: index + 1 };
    runs.push(current);
  });
  return runs;
}
