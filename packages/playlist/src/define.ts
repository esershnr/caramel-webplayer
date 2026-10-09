import './styles/playlist.css';
import { EspPlaylistElement } from './element.js';
import { EspPlaylistNavElement } from './nav.js';
import { EspPlaylistPanelElement } from './panel.js';

/**
 * Registers <esp-playlist>, <esp-playlist-panel> and <esp-playlist-nav>.
 * Idempotent; a no-op without a DOM (SSR).
 */
export function defineEspPlaylist(
  tag: string = EspPlaylistElement.tagName,
  panelTag: string = EspPlaylistPanelElement.tagName,
  navTag: string = EspPlaylistNavElement.tagName,
): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (!customElements.get(tag)) customElements.define(tag, EspPlaylistElement);
  if (!customElements.get(panelTag)) customElements.define(panelTag, EspPlaylistPanelElement);
  if (!customElements.get(navTag)) customElements.define(navTag, EspPlaylistNavElement);
}

defineEspPlaylist();
