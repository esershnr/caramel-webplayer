import './styles/chapters.css';
import { CaramelChaptersPanelElement } from './element.js';

/** Registers <caramel-chapters-panel>. Idempotent; a no-op without a DOM (SSR). */
export function defineCaramelChaptersPanel(tag: string = CaramelChaptersPanelElement.tagName): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, CaramelChaptersPanelElement);
}

defineCaramelChaptersPanel();
