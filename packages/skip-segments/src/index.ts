export {
  SEGMENT_TYPES,
  isSegmentType,
  normalizeSegments,
  parseAutoSkip,
  findActiveIndex,
  segmentAtRatio,
  skipTarget,
  segmentGeometry,
  type Segment,
  type SegmentType,
  type AutoSkipConfig,
  type SegmentGeometry,
} from './segments.js';
export { SkipModel, type SkipModelOptions, type SkipTick, type SkipResult } from './model.js';
export { SKIP_KEYS, SKIP_DEFAULTS, SEGMENT_KEYS, SEGMENT_DEFAULTS, registerSkipSegmentsI18n } from './i18n.js';
export { CaramelSkipSegmentsElement, type SkipEventDetail } from './element.js';
export { defineCaramelSkipSegments } from './define.js';
