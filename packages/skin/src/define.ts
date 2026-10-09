/**
 * Side-effect entry: registers the Video.js 10 player, every UI element the
 * skin uses, the esp morph icon and the Turkish / English locales. Browser only.
 */
import '@videojs/html/video/player';
import './components/videojs/video/skin.js';
import '@videojs/html/i18n/locales/tr/register';
import '@videojs/html/i18n/locales/en/register';
import { installSeekMotion } from './seek-motion.js';
import { installSpaceKey } from './space-key.js';
import { EspTimeDisplayElement } from './time-display.js';
import { EspQualityBadgeElement } from './quality-badge.js';
import { EspPreviewSizeElement } from './preview-size.js';
import { EspQualityRadioGroupElement } from './quality-order.js';
import { EspSeekIndicatorElement } from './seek-indicator.js';

if (typeof document !== 'undefined') {
  installSeekMotion();
  installSpaceKey();
  for (const Element of [EspTimeDisplayElement, EspQualityBadgeElement, EspPreviewSizeElement]) {
    if (!customElements.get(Element.tagName)) customElements.define(Element.tagName, Element);
  }
  for (const Element of [EspQualityRadioGroupElement, EspSeekIndicatorElement]) {
    if (!customElements.get(Element.espTagName)) customElements.define(Element.espTagName, Element);
  }
}
