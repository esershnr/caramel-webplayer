import './styles/skip-segments.css';
import { CaramelSkipSegmentsElement } from './element.js';

/** Registers <caramel-skip-segments>. Idempotent; a no-op without a DOM (SSR). */
export function defineCaramelSkipSegments(tag: string = CaramelSkipSegmentsElement.tagName): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, CaramelSkipSegmentsElement);
}

defineCaramelSkipSegments();
