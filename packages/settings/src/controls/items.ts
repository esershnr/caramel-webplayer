import { createIconElement, type IconName, icons } from '@esershnr/caramel-icons';

/**
 * Builders for the rows every settings page shares. They produce the same
 * markup and classes as the skin template, so the skin's menu CSS styles them.
 */

/** A `<media-text>` label: the registry translates `token`, `text` is the English fallback. */
export function createText(token: string, text: string): HTMLElement {
  const element = document.createElement('media-text');
  element.setAttribute('token', token);
  // media-text keeps its initial text content as the fallback, so set it before connecting.
  element.textContent = text;
  return element;
}

export interface TriggerItem {
  item: HTMLElement;
  /** Summary next to the chevron. Not `data-part="value"`: the menu would wipe it. */
  hint: HTMLSpanElement;
}

/** Top level row that opens the page with `pageId`. */
export function createTriggerItem(pageId: string, icon: IconName, label: HTMLElement): TriggerItem {
  const item = document.createElement('media-menu-item');
  item.setAttribute('commandfor', pageId);
  item.className = 'media-menu-trigger-item';
  const hintWrap = document.createElement('span');
  hintWrap.className = 'media-menu-hint';
  const hint = document.createElement('span');
  hint.dataset['part'] = 'caramel-hint';
  hint.className = 'media-menu-hint-label';
  hintWrap.append(
    hint,
    createIconElement(icons.chevron, { className: 'media-menu-forward-chevron caramel-icon caramel-icon-chevron' }),
  );
  item.append(
    createIconElement(icons[icon], { className: `media-menu-trigger-item-icon caramel-icon caramel-icon-${icon}` }),
    label,
    hintWrap,
  );
  return { item, hint };
}

/** First row of a page: a chevron and the page title. Without `commandfor` it closes its own level. */
export function createBackItem(label: HTMLElement): HTMLElement {
  const item = document.createElement('media-menu-item');
  item.className = 'media-menu-back-item';
  item.append(
    createIconElement(icons.chevron, { className: 'media-menu-back-chevron caramel-icon caramel-icon-chevron' }),
    label,
  );
  return item;
}

export function createSeparator(): HTMLElement {
  const separator = document.createElement('media-menu-separator');
  separator.className = 'media-menu-separator';
  return separator;
}

/** Small heading above a group of options; its id names the group. */
export function createGroupLabel(id: string, label: HTMLElement): HTMLElement {
  const heading = document.createElement('div');
  heading.className = 'caramel-settings-label';
  heading.id = id;
  heading.append(label);
  return heading;
}

/**
 * "Reset" row. It keeps the page open (the `select` event is cancelled, so
 * the menu does not close the level) and is disabled while the page has
 * nothing to reset.
 */
export function createResetItem(label: HTMLElement, onReset: () => void): HTMLElement {
  const item = document.createElement('media-menu-item');
  item.className = 'media-menu-radio-item caramel-settings-reset';
  item.append(
    createIconElement(icons.restart, { className: 'caramel-settings-reset-icon caramel-icon caramel-icon-restart' }),
    label,
  );
  item.addEventListener('select', (event) => {
    event.preventDefault();
    if (item.getAttribute('aria-disabled') !== 'true') onReset();
  });
  return item;
}

/** Enables or disables a menu row through `aria-disabled`, which the Video.js items honor. */
export function setRowDisabled(item: Element, disabled: boolean): void {
  if (disabled) {
    if (item.getAttribute('aria-disabled') !== 'true') item.setAttribute('aria-disabled', 'true');
  } else if (item.hasAttribute('aria-disabled')) {
    item.removeAttribute('aria-disabled');
  }
}

/** Shows or hides a row; the menu skips hidden items when navigating. */
export function setRowHidden(item: HTMLElement, hidden: boolean): void {
  if (item.hidden !== hidden) item.hidden = hidden;
}
