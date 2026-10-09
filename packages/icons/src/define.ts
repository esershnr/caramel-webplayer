import { CaramelMorphIconElement } from './morph-icon.js';

/** Registers <caramel-morph-icon>. Idempotent; a no-op without a DOM (SSR). */
export function defineCaramelMorphIcon(tag: string = CaramelMorphIconElement.tagName): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, CaramelMorphIconElement);
}

defineCaramelMorphIcon();
