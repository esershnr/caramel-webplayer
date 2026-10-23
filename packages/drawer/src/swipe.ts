/** A finished pointer drag: displacement in px, duration in ms, container width in px. */
export interface SwipeInput {
  dx: number;
  dy: number;
  dt: number;
  width: number;
}

export interface SwipeOptions {
  /** Minimum distance in px for a slow drag. The real floor is max(this, 25% of width). */
  minDistance?: number | undefined;
  /** Minimum speed in px/ms for a short flick. */
  minVelocity?: number | undefined;
  /** Movement in px below which nothing counts as a drag. */
  slop?: number | undefined;
}

export const SWIPE_MIN_DISTANCE = 48;
export const SWIPE_MIN_VELOCITY = 0.5;
export const SWIPE_SLOP = 16;
/** Share of the container width a slow drag must cover. */
export const SWIPE_WIDTH_RATIO = 0.25;

/**
 * Turns a drag into a horizontal swipe direction, or null. The drag must be
 * mostly horizontal, and either long (at least max(minDistance, 25% of the
 * width)) or a fast flick (past the slop and at least minVelocity px/ms).
 */
export function swipeDecision(input: SwipeInput, options: SwipeOptions = {}): 'left' | 'right' | null {
  const { dx, dy, dt, width } = input;
  const ax = Math.abs(dx);
  if (!Number.isFinite(ax) || ax <= Math.abs(dy)) return null;
  const minDistance = Math.max(options.minDistance ?? SWIPE_MIN_DISTANCE, SWIPE_WIDTH_RATIO * (width || 0));
  const slop = options.slop ?? SWIPE_SLOP;
  const minVelocity = options.minVelocity ?? SWIPE_MIN_VELOCITY;
  const far = ax >= minDistance;
  const fast = ax >= slop && ax / Math.max(dt, 1) >= minVelocity;
  if (!far && !fast) return null;
  return dx < 0 ? 'left' : 'right';
}
