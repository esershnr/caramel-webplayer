import { createIconElement, icons } from '@esershnr/caramel-icons';

/**
 * A list of exclusive options built on `<media-menu-radio-group>` and
 * `<media-menu-radio-item>` (role `menuitemradio`, checked while its value
 * matches the group). The indicator markup matches the skin template.
 */
export interface RadioOption {
  value: string;
  label: HTMLElement | string;
  /** Extra node before the label (a color swatch). */
  prefix?: HTMLElement;
}

export interface SettingsRadioGroup {
  group: HTMLElement;
  set(value: string): void;
}

type RadioGroup = HTMLElement & { value: string };

export function createRadioGroup(
  labelledBy: string,
  options: readonly RadioOption[],
  onChange: (value: string) => void,
): SettingsRadioGroup {
  const group = document.createElement('media-menu-radio-group') as RadioGroup;
  group.className = 'media-menu-radio-group';
  group.setAttribute('aria-labelledby', labelledBy);
  for (const option of options) {
    const item = document.createElement('media-menu-radio-item');
    item.className = 'media-menu-radio-item';
    item.setAttribute('value', option.value);
    const label = document.createElement('span');
    label.className = 'caramel-settings-option';
    if (option.prefix) label.append(option.prefix);
    const text = document.createElement('span');
    text.dataset['part'] = 'label';
    text.append(option.label);
    label.append(text);
    const indicator = document.createElement('media-menu-item-indicator');
    indicator.setAttribute('force-mount', '');
    indicator.className = 'media-menu-item-indicator';
    indicator.append(
      createIconElement(icons.check, { className: 'media-menu-radio-item-icon caramel-icon caramel-icon-check' }),
    );
    item.append(label, indicator);
    group.append(item);
  }
  group.addEventListener('value-change', (event) => {
    const value = (event as CustomEvent<{ value: string }>).detail?.value;
    if (typeof value === 'string') onChange(value);
  });
  return {
    group,
    set(value) {
      if (group.value !== value) group.value = value;
      // Mirrors the selection so the rows read right before the group's own update.
      for (const item of group.children) {
        const checked = String(item.getAttribute('value') === value);
        if (item.getAttribute('aria-checked') !== checked) item.setAttribute('aria-checked', checked);
      }
    },
  };
}
