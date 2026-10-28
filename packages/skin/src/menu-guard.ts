/**
 * Outside click on an open settings menu only closes the menu.
 *
 * Video.js closes the menu on a document level pointerdown but lets the press
 * go on, so the matching pointerup reaches the container's gesture listener
 * and runs the tap action: play / pause with a mouse, show / hide the controls
 * with touch. Here a press that starts outside every open menu of a caramel
 * player (and outside the button that opens it) is remembered by pointer id,
 * and its pointerup is stopped in the capture phase so the player never sees
 * it. Nothing else is touched: the pointerdown itself, clicks and presses
 * inside the menu go through unchanged.
 */
const CONTAINER = 'media-container.caramel-skin';
const OPEN_MENU = 'media-menu[data-open]';

/** True when the press path touches one of the open menus or the control that opens it. */
export function isInsideMenu(path: readonly EventTarget[], menus: readonly Element[]): boolean {
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    for (const menu of menus) {
      if (node === menu) return true;
      if (menu.id && node.getAttribute('commandfor') === menu.id) return true;
    }
  }
  return false;
}

let installed = false;

export function installMenuGuard(root: Document = document): () => void {
  if (installed || typeof Element === 'undefined') return () => {};
  installed = true;

  const swallowed = new Set<number>();

  const onPointerDown = (event: PointerEvent) => {
    // A pointerup that never reached the document (released outside the window) must not eat this press.
    swallowed.delete(event.pointerId);
    const path = event.composedPath();
    const target = path[0];
    if (!(target instanceof Element)) return;
    const container = target.closest(CONTAINER);
    if (!container) return;
    const menus = [...container.querySelectorAll(OPEN_MENU)];
    if (menus.length === 0 || isInsideMenu(path, menus)) return;
    swallowed.add(event.pointerId);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!swallowed.delete(event.pointerId)) return;
    event.stopPropagation();
  };

  const onPointerCancel = (event: PointerEvent) => {
    swallowed.delete(event.pointerId);
  };

  root.addEventListener('pointerdown', onPointerDown, true);
  root.addEventListener('pointerup', onPointerUp, true);
  root.addEventListener('pointercancel', onPointerCancel, true);

  return () => {
    root.removeEventListener('pointerdown', onPointerDown, true);
    root.removeEventListener('pointerup', onPointerUp, true);
    root.removeEventListener('pointercancel', onPointerCancel, true);
    swallowed.clear();
    installed = false;
  };
}
