import './styles/chapters.css';
import { EspChaptersPanelElement } from './element.js';

/** Registers <esp-chapters-panel>. Idempotent; a no-op without a DOM (SSR). */
export function defineEspChaptersPanel(tag: string = EspChaptersPanelElement.tagName): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, EspChaptersPanelElement);
}

defineEspChaptersPanel();
