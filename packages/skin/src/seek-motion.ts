/**
 * Click-to-seek motion for the timeline.
 *
 * Only a mouse click on the track animates: the fill and the thumb glide to
 * the clicked point in one uninterrupted move. Every other jump (drag,
 * arrows, 0-9, Home / End, chapter panel, skip button, playlist change,
 * playback itself) is instant, because the fill has no transition outside
 * the window opened here.
 *
 * During the window the slider carries `data-esp-seek` and
 * `--esp-seek-target`; the skin pins `--media-slider-fill` to the target with
 * `!important`, so the timeupdate / seeking values Video.js keeps writing
 * inline cannot retarget the transition halfway (that was the stutter). The
 * window closes once the transition has finished AND the media is no longer
 * seeking; the transition time is then 0, so the fill hands over to the live
 * position without a second move. Under reduced motion the duration token is
 * 0ms and the click is a plain jump.
 */
export const SEEK_MOTION_ATTR = 'data-esp-seek';
export const SEEK_TARGET_VAR = '--esp-seek-target';

/** Upper bound for the transition wait (the fill duration is 500ms). */
const MOTION_FALLBACK_MS = 700;
/** Never hold the fill longer than this, even if a seek hangs. */
const MAX_HOLD_MS = 4000;

export interface TrackPress {
  pointerType: string;
  button: number;
  /** The slider was being dragged (Video.js `data-dragging`). */
  dragging: boolean;
}

/** True for a plain primary-button mouse click on the track (no drag). */
export function isTrackClick(press: TrackPress): boolean {
  return press.pointerType === 'mouse' && press.button === 0 && !press.dragging;
}

/** Percentage of the track at `clientX`, clamped to 0..100. */
export function trackPercent(clientX: number, left: number, width: number): number | null {
  if (!Number.isFinite(clientX) || !(width > 0)) return null;
  return Math.min(100, Math.max(0, ((clientX - left) / width) * 100));
}

let installed = false;

export function installSeekMotion(root: Document = document): () => void {
  if (installed || typeof MutationObserver === 'undefined') return () => {};
  installed = true;

  interface Hold {
    moved: boolean;
    timers: ReturnType<typeof setTimeout>[];
    observer: MutationObserver;
    onEnd: (event: TransitionEvent) => void;
  }
  const holds = new Map<HTMLElement, Hold>();

  const release = (slider: HTMLElement) => {
    const hold = holds.get(slider);
    if (!hold) return;
    holds.delete(slider);
    for (const timer of hold.timers) clearTimeout(timer);
    hold.observer.disconnect();
    slider.removeEventListener('transitionend', hold.onEnd);
    slider.removeAttribute(SEEK_MOTION_ATTR);
    slider.style.removeProperty(SEEK_TARGET_VAR);
  };

  const maybeRelease = (slider: HTMLElement) => {
    const hold = holds.get(slider);
    if (hold?.moved && !slider.hasAttribute('data-seeking')) release(slider);
  };

  const start = (slider: HTMLElement, percent: number) => {
    release(slider);
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold: Hold = {
      moved: false,
      timers: [],
      observer: new MutationObserver(() => maybeRelease(slider)),
      onEnd: (event) => {
        if (event.target !== slider || event.propertyName !== '--media-slider-fill') return;
        hold.moved = true;
        maybeRelease(slider);
      },
    };
    holds.set(slider, hold);
    slider.style.setProperty(SEEK_TARGET_VAR, `${percent}%`);
    slider.setAttribute(SEEK_MOTION_ATTR, '');
    slider.addEventListener('transitionend', hold.onEnd);
    hold.observer.observe(slider, { attributes: true, attributeFilter: ['data-seeking'] });
    hold.timers.push(
      setTimeout(
        () => {
          hold.moved = true;
          maybeRelease(slider);
        },
        reduced ? 0 : MOTION_FALLBACK_MS,
      ),
      setTimeout(() => release(slider), MAX_HOLD_MS),
    );
  };

  // Capture phase: runs before Video.js commits the seek (and before it
  // clears data-dragging), so a drag release is told apart from a click.
  const onPointerUp = (event: PointerEvent) => {
    const target = event.composedPath()[0];
    if (!(target instanceof Element)) return;
    const slider = target.closest<HTMLElement>('.esp-skin media-time-slider');
    if (!slider || slider.hasAttribute('data-disabled')) return;
    if (!isTrackClick({ pointerType: event.pointerType, button: event.button, dragging: slider.hasAttribute('data-dragging') })) return;
    const rect = slider.getBoundingClientRect();
    const percent = trackPercent(event.clientX, rect.left, rect.width);
    if (percent !== null) start(slider, percent);
  };

  // A drag or a key press in the same player during the glide hands control
  // back at once, so those jumps stay instant.
  const onInterrupt = (event: Event) => {
    if (holds.size === 0) return;
    const target = event.composedPath()[0];
    for (const slider of Array.from(holds, ([el]) => el)) {
      const interrupted =
        event.type === 'keydown'
          ? target instanceof Node && (slider.closest('.esp-skin')?.contains(target) ?? false)
          : slider.hasAttribute('data-dragging');
      if (interrupted) release(slider);
    }
  };

  root.addEventListener('pointerup', onPointerUp, true);
  root.addEventListener('keydown', onInterrupt, true);
  root.addEventListener('pointermove', onInterrupt, true);

  return () => {
    root.removeEventListener('pointerup', onPointerUp, true);
    root.removeEventListener('keydown', onInterrupt, true);
    root.removeEventListener('pointermove', onInterrupt, true);
    installed = false;
  };
}
