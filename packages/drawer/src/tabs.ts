/** The drawer's two tabs, in display order. */
export type DrawerTab = 'chapters' | 'playlist';

export const DRAWER_TABS: readonly DrawerTab[] = ['chapters', 'playlist'];

export function isDrawerTab(value: unknown): value is DrawerTab {
  return value === 'chapters' || value === 'playlist';
}

/** Tabs that have content, in display order (chapters first). */
export function visibleTabs(input: { chapters: boolean; playlist: boolean }): DrawerTab[] {
  return DRAWER_TABS.filter((tab) => input[tab]);
}

/**
 * The tab to show for a visible set: the current tab while it is still
 * visible, else the remembered tab (last user pick) when visible, else the
 * first visible tab, else null (nothing to show, the drawer closes).
 */
export function resolveTab(
  current: DrawerTab | null,
  visible: readonly DrawerTab[],
  remembered: DrawerTab | null,
): DrawerTab | null {
  if (current && visible.includes(current)) return current;
  if (remembered && visible.includes(remembered)) return remembered;
  return visible[0] ?? null;
}

/** `HTMLTrackElement.readyState` values. */
const TRACK_NONE = 0;
const TRACK_LOADING = 1;

/**
 * Whether the chapters tab should be shown.
 *
 * Cues in the store always count. Without cues the tab stays only while a
 * `<track kind="chapters">` is still on its way (readyState NONE or LOADING,
 * mode not `disabled`): a playlist item switch swaps the track and clears the
 * cues for a moment, and the tab must not flicker away and back in that gap.
 * A track that finished loading with no cues (LOADED) or failed (ERROR, for
 * example a 404) counts as absent, so it never leaves an empty tab behind. A
 * `disabled` track never loads, so it would otherwise wait forever.
 */
export function chaptersPresent(input: {
  cueCount: number;
  track: { readyState: number; mode: string } | null;
}): boolean {
  if (input.cueCount > 0) return true;
  const track = input.track;
  if (!track || track.mode === 'disabled') return false;
  return track.readyState === TRACK_NONE || track.readyState === TRACK_LOADING;
}
