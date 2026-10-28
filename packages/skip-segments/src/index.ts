export {
  SEGMENT_TYPES,
  isSegmentType,
  normalizeSegments,
  parseAutoSkip,
  parseAutoSkipDelay,
  autoSkipDelayFor,
  findActiveIndex,
  segmentAtRatio,
  skipTarget,
  segmentGeometry,
  type Segment,
  type SegmentType,
  type AutoSkipConfig,
  type AutoSkipDelayConfig,
  type SegmentGeometry,
} from './segments.js';
export {
  SkipModel,
  autoSkipCountdown,
  type SkipModelOptions,
  type SkipTick,
  type SkipResult,
  type AutoSkipCountdown,
  type AutoSkipCountdownInput,
} from './model.js';
export {
  SKIP_KEYS,
  SKIP_DEFAULTS,
  SEGMENT_KEYS,
  SEGMENT_DEFAULTS,
  AUTOSKIP_KEYS,
  AUTOSKIP_DEFAULTS,
  registerSkipSegmentsI18n,
} from './i18n.js';
export {
  CaramelSkipSegmentsElement,
  type SkipEventDetail,
  type SkipCountdownEventDetail,
  type SkipCancelEventDetail,
} from './element.js';
export { defineCaramelSkipSegments } from './define.js';
