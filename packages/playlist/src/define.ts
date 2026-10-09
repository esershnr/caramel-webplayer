import './styles/playlist.css';
import { CaramelPlaylistElement } from './element.js';
import { CaramelPlaylistNavElement } from './nav.js';
import { CaramelPlaylistPanelElement } from './panel.js';

/**
 * Registers <caramel-playlist>, <caramel-playlist-panel> and <caramel-playlist-nav>.
 * Idempotent; a no-op without a DOM (SSR).
 */
export function defineCaramelPlaylist(
  tag: string = CaramelPlaylistElement.tagName,
  panelTag: string = CaramelPlaylistPanelElement.tagName,
  navTag: string = CaramelPlaylistNavElement.tagName,
): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (!customElements.get(tag)) customElements.define(tag, CaramelPlaylistElement);
  if (!customElements.get(panelTag)) customElements.define(panelTag, CaramelPlaylistPanelElement);
  if (!customElements.get(navTag)) customElements.define(navTag, CaramelPlaylistNavElement);
}

defineCaramelPlaylist();
