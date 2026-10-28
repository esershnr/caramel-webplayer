/**
 * On / off row: a `<media-menu-checkbox-item>` (role `menuitemcheckbox`,
 * toggles on click, Enter and Space, keeps the menu open) with a switch look.
 */
export interface SettingsSwitch {
  item: HTMLElement;
  set(checked: boolean): void;
}

type CheckboxItem = HTMLElement & { checked: boolean };

export function createSwitch(label: HTMLElement, onChange: (checked: boolean) => void): SettingsSwitch {
  const item = document.createElement('media-menu-checkbox-item') as CheckboxItem;
  item.className = 'media-menu-radio-item caramel-settings-switch';
  const text = document.createElement('span');
  text.className = 'caramel-settings-switch-label';
  text.append(label);
  const track = document.createElement('span');
  track.className = 'caramel-settings-switch-track';
  track.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('span');
  thumb.className = 'caramel-settings-switch-thumb';
  track.append(thumb);
  item.append(text, track);
  item.addEventListener('checked-change', (event) => {
    const checked = (event as CustomEvent<{ checked: boolean }>).detail?.checked;
    if (typeof checked === 'boolean') onChange(checked);
  });
  return {
    item,
    set(checked) {
      if (item.checked !== checked) item.checked = checked;
      // Mirrors the state for the switch CSS before the item's own update runs.
      const aria = String(checked);
      if (item.getAttribute('aria-checked') !== aria) item.setAttribute('aria-checked', aria);
    },
  };
}
