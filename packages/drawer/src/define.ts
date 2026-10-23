// The panels the drawer creates must be registered whatever the host imported.
import '@esershnr/caramel-chapters/define';
import '@esershnr/caramel-playlist/define';
import './styles/drawer.css';
import { CaramelDrawerElement } from './element.js';
import { CaramelDrawerToggleElement } from './toggle.js';

/** Registers <caramel-drawer> and <caramel-drawer-toggle>. Idempotent; a no-op without a DOM (SSR). */
export function defineCaramelDrawer(tag: string = CaramelDrawerElement.tagName): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (!customElements.get(tag)) customElements.define(tag, CaramelDrawerElement);
  const toggleTag = CaramelDrawerToggleElement.tagName;
  if (!customElements.get(toggleTag)) customElements.define(toggleTag, CaramelDrawerToggleElement);
}

defineCaramelDrawer();
