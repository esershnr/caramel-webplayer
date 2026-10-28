/**
 * Everything from the eight player packages in one import.
 *
 * Skip segments and chapters both export a `findActiveIndex` with different
 * meanings, so those two are listed by hand and the helper is re-exported
 * only as `findActiveSegmentIndex` and `findActiveChapterIndex`. Keep the
 * lists in sync with packages/skip-segments/src/index.ts and
 * packages/chapters/src/index.ts (the exports test checks a sample).
 */
export * from '@esershnr/caramel-theme';
export * from '@esershnr/caramel-icons';
export * from '@esershnr/caramel-skin';
export * from '@esershnr/caramel-playlist';
export * from '@esershnr/caramel-drawer';
export * from '@esershnr/caramel-settings';

export {
  SEGMENT_TYPES,
  isSegmentType,
  normalizeSegments,
  parseAutoSkip,
  parseAutoSkipDelay,
  autoSkipDelayFor,
  findActiveIndex as findActiveSegmentIndex,
  segmentAtRatio,
  skipTarget,
  segmentGeometry,
  SkipModel,
  SKIP_KEYS,
  SKIP_DEFAULTS,
  SEGMENT_KEYS,
  SEGMENT_DEFAULTS,
  registerSkipSegmentsI18n,
  autoSkipCountdown,
  AUTOSKIP_KEYS,
  AUTOSKIP_DEFAULTS,
  CaramelSkipSegmentsElement,
  defineCaramelSkipSegments,
  type Segment,
  type SegmentType,
  type AutoSkipConfig,
  type AutoSkipDelayConfig,
  type SegmentGeometry,
  type SkipModelOptions,
  type SkipTick,
  type SkipResult,
  type SkipEventDetail,
  type AutoSkipCountdown,
  type AutoSkipCountdownInput,
  type SkipCountdownEventDetail,
  type SkipCancelEventDetail,
} from '@esershnr/caramel-skip-segments';

export {
  formatTime,
  findActiveIndex as findActiveChapterIndex,
  nextIndex,
  cuesEqual,
  CHAPTERS_KEYS,
  CHAPTERS_DEFAULTS,
  registerChaptersI18n,
  createChaptersTranslator,
  CaramelChaptersPanelElement,
  defineCaramelChaptersPanel,
  type ChapterCue,
  type ChapterSelectDetail,
  type ChapterPlayerElement,
  type ChapterStore,
} from '@esershnr/caramel-chapters';
