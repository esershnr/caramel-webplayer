import type { IconName } from '@esershnr/caramel-icons';
import { createSwitch } from '../controls/switch.js';
import { createBackItem, createResetItem, createSeparator, createText, setRowDisabled } from '../controls/items.js';
import type { CaramelSettingsSliderElement } from '../controls/slider.js';
import { SETTINGS_DEFAULTS_I18N, SETTINGS_KEYS_I18N, type SettingsI18nName } from '../i18n.js';
import {
  type BooleanSettingsKey,
  keysOfPage,
  type NumericSettingsKey,
  SETTINGS_RANGES,
  type SettingsKey,
  type SettingsPage,
  type SettingsValues,
} from '../schema.js';

/** What a page needs from `<caramel-settings>`. */
export interface SettingsHost {
  readonly settings: SettingsValues;
  /** Keys whose control has something to act on (bound siblings that exist). */
  readonly availableKeys: readonly SettingsKey[];
  set(partial: Partial<SettingsValues>): void;
  reset(page?: SettingsPage): void;
  isUserSet(key: SettingsKey): boolean;
}

/** The translator of `I18nController`: key, English default and `{placeholders}`. */
export type Translate = (key: string, options?: { default?: string } & Record<string, unknown>) => string;

export function translate(t: Translate, name: SettingsI18nName, params: Record<string, unknown> = {}): string {
  return t(SETTINGS_KEYS_I18N[name], { default: SETTINGS_DEFAULTS_I18N[name], ...params });
}

export function text(name: SettingsI18nName): HTMLElement {
  return createText(SETTINGS_KEYS_I18N[name], SETTINGS_DEFAULTS_I18N[name]);
}

export function formatPercent(t: Translate, percent: number): string {
  return translate(t, 'percent', { value: Math.round(percent) });
}

export function formatSeconds(t: Translate, seconds: number): string {
  return translate(t, 'seconds', { value: Math.round(seconds) });
}

/** One page of the menu, with the summary its top level row shows. */
export interface SettingsPageView {
  readonly page: SettingsPage;
  readonly icon: IconName;
  readonly title: SettingsI18nName;
  /** The `<media-menu-content>`, appended to the `<media-menu>` by the caller. */
  readonly element: HTMLElement;
  /** Brings every control in line with the host's values and the locale. */
  sync(t: Translate): void;
  /** Short summary for the top level row. */
  hint(t: Translate): string;
}

/** Keeps the per-page sync steps together. */
export class PageBuilder {
  readonly host: SettingsHost;
  readonly element: HTMLElement;
  readonly #syncs: ((t: Translate) => void)[] = [];

  constructor(host: SettingsHost, page: SettingsPage, id: string, title: SettingsI18nName) {
    this.host = host;
    const element = document.createElement('media-menu-content');
    element.className = 'media-menu-content caramel-settings-page';
    element.id = id;
    element.dataset['page'] = page;
    // Space keeps its menu meaning on these rows (the skin would otherwise play / pause).
    element.setAttribute('data-caramel-native-space', '');
    element.append(createBackItem(text(title)), createSeparator());
    this.element = element;
    const reset = createResetItem(text('reset'), () => host.reset(page));
    this.onSync(() => setRowDisabled(reset, !keysOfPage(page).some((key) => host.isUserSet(key))));
    this.#reset = reset;
  }

  readonly #reset: HTMLElement;

  onSync(fn: (t: Translate) => void): void {
    this.#syncs.push(fn);
  }

  append(...nodes: Node[]): void {
    this.element.append(...nodes);
  }

  /** Hides the row while its key has nothing to act on. */
  bindAvailability(row: HTMLElement, key: SettingsKey): void {
    this.onSync(() => {
      const hidden = !this.host.availableKeys.includes(key);
      if (row.hidden !== hidden) row.hidden = hidden;
    });
  }

  switchRow(key: BooleanSettingsKey, label: SettingsI18nName): HTMLElement {
    const control = createSwitch(text(label), (checked) => this.host.set({ [key]: checked }));
    control.item.dataset['key'] = key;
    this.onSync(() => control.set(this.host.settings[key]));
    this.append(control.item);
    return control.item;
  }

  sliderRow(key: NumericSettingsKey, label: SettingsI18nName, format: (t: Translate, value: number) => string) {
    const slider = document.createElement('caramel-settings-slider') as CaramelSettingsSliderElement;
    slider.className = 'media-menu-radio-item caramel-settings-slider';
    slider.dataset['key'] = key;
    slider.range = SETTINGS_RANGES[key];
    slider.setLabel(text(label));
    slider.addEventListener('caramel-settings-slider-change', (event) => {
      const value = (event as CustomEvent<{ value: number }>).detail?.value;
      if (typeof value === 'number') this.host.set({ [key]: value });
    });
    let locale: Translate | null = null;
    this.onSync((t) => {
      if (t !== locale) {
        locale = t;
        slider.format = (value) => format(t, value);
      }
      if (!slider.dragging) slider.value = this.host.settings[key];
    });
    this.append(slider);
    return slider;
  }

  /** Closes the page with a separator and the reset row. */
  finish(): void {
    this.append(createSeparator(), this.#reset);
  }

  sync(t: Translate): void {
    for (const fn of this.#syncs) fn(t);
  }
}
