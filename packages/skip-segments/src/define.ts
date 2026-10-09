import './styles/skip-segments.css';
import { EspSkipSegmentsElement } from './element.js';

/** Registers <esp-skip-segments>. Idempotent; a no-op without a DOM (SSR). */
export function defineEspSkipSegments(tag: string = EspSkipSegmentsElement.tagName): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, EspSkipSegmentsElement);
}

defineEspSkipSegments();
