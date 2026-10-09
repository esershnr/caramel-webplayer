/**
 * Everything from the six player packages in one import.
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

export {
  SEGMENT_TYPES,
  isSegmentType,
  normalizeSegments,
  parseAutoSkip,
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
  EspSkipSegmentsElement,
  defineEspSkipSegments,
  type Segment,
  type SegmentType,
  type AutoSkipConfig,
  type SegmentGeometry,
  type SkipModelOptions,
  type SkipTick,
  type SkipResult,
  type SkipEventDetail,
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
  EspChaptersPanelElement,
  defineEspChaptersPanel,
  type ChapterCue,
  type ChapterSelectDetail,
  type ChapterPlayerElement,
  type ChapterStore,
} from '@esershnr/caramel-chapters';
