import { EspMorphIconElement } from './morph-icon.js';

/** Registers <esp-morph-icon>. Idempotent; a no-op without a DOM (SSR). */
export function defineEspMorphIcon(tag: string = EspMorphIconElement.tagName): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, EspMorphIconElement);
}

defineEspMorphIcon();
