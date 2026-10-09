/**
 * YouTube style Space and focus handling for every caramel player on the page.
 *
 * Space: Video.js skips its Space hotkey when focus sits on a control that
 * uses Space as its own activation (buttons, sliders), so after clicking the
 * timeline Space did nothing, and on a button it pressed the button instead.
 * Here Space on such a control is taken over in the capture phase: the
 * control never sees it (keydown and keyup are stopped, so the native button
 * click does not fire either) and the key is re-sent to the player container,
 * where the Video.js hotkey runs exactly once (and its OSD shows). Enter keeps
 * doing the control's own job. Text fields, contenteditable and menu items
 * keep Space. Outside a player nothing changes, so page scrolling is intact.
 *
 * Focus ring: a pointer press inside a player marks the container with
 * `data-caramel-pointer-focus` and the skin hides focus rings while it is set;
 * Tab clears it, so keyboard navigation shows :focus-visible as before.
 */
export const POINTER_FOCUS_ATTR = 'data-caramel-pointer-focus';

/** Elements that use Space as their own activation (same set Video.js checks). */
const ACTIVATABLE = 'button,a[href],[role="slider"],[role="button"]';
const EDITABLE = 'input,textarea,select,[contenteditable]:not([contenteditable="false"])';
const MENU_ITEM = '[role^="menuitem"],[role="option"]';
const CONTAINER = 'media-container.caramel-skin';

export interface SpaceTarget {
  key: string;
  modifiers: boolean;
  /** Target uses Space for its own activation. */
  activatable: boolean;
  /** Text input, select or contenteditable. */
  editable: boolean;
  /** Item inside a menu or list box, where Space selects. */
  menuItem: boolean;
}

/** True when Space on this target should play / pause the player instead. */
export function shouldRedirectSpace(target: SpaceTarget): boolean {
  if (target.key !== ' ' || target.modifiers) return false;
  if (target.editable || target.menuItem) return false;
  return target.activatable;
}

let installed = false;

export function installSpaceKey(root: Document = document): () => void {
  if (installed || typeof KeyboardEvent === 'undefined') return () => {};
  installed = true;

  const resolve = (event: KeyboardEvent) => {
    const target = event.composedPath()[0];
    if (!(target instanceof Element)) return null;
    const container = target.closest(CONTAINER);
    if (!container || target === container) return null;
    const redirect = shouldRedirectSpace({
      key: event.key,
      modifiers: event.ctrlKey || event.altKey || event.metaKey || event.shiftKey,
      activatable: target.matches(ACTIVATABLE),
      editable: target.matches(EDITABLE),
      menuItem: target.closest(MENU_ITEM) !== null,
    });
    return redirect ? container : null;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      for (const el of root.querySelectorAll(`[${POINTER_FOCUS_ATTR}]`)) el.removeAttribute(POINTER_FOCUS_ATTR);
      return;
    }
    const container = resolve(event);
    if (!container) return;
    event.preventDefault();
    event.stopPropagation();
    // Holding Space must not toggle over and over.
    if (event.repeat) return;
    container.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: ' ',
        code: event.code || 'Space',
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (!resolve(event)) return;
    // The native button click for Space fires on keyup.
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.composedPath()[0];
    if (!(target instanceof Element)) return;
    target.closest(CONTAINER)?.setAttribute(POINTER_FOCUS_ATTR, '');
  };

  root.addEventListener('keydown', onKeyDown, true);
  root.addEventListener('keyup', onKeyUp, true);
  root.addEventListener('pointerdown', onPointerDown, true);

  return () => {
    root.removeEventListener('keydown', onKeyDown, true);
    root.removeEventListener('keyup', onKeyUp, true);
    root.removeEventListener('pointerdown', onPointerDown, true);
    installed = false;
  };
}
