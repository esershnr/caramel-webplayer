// The menu rows use these Video.js items; the skin does not register them itself.
import '@videojs/html/ui/menu-checkbox-item';
import '@videojs/html/ui/menu-radio-group';
import './styles/settings.css';
import { CaramelSettingsSliderElement } from './controls/slider.js';
import { CaramelSettingsElement } from './element.js';
import { CaramelSettingsMenuElement } from './menu.js';

/**
 * Registers <caramel-settings>, <caramel-settings-menu> and
 * <caramel-settings-slider>. Idempotent; a no-op without a DOM (SSR).
 */
export function defineCaramelSettings(): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  for (const element of [CaramelSettingsSliderElement, CaramelSettingsElement, CaramelSettingsMenuElement]) {
    if (!customElements.get(element.tagName)) customElements.define(element.tagName, element);
  }
}

defineCaramelSettings();
