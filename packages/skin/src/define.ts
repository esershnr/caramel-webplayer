/**
 * Side-effect entry: registers the Video.js 10 player, every UI element the
 * skin uses, the caramel morph icon and the Turkish / English locales. Browser only.
 */
import '@videojs/html/video/player';
import './components/videojs/video/skin.js';
import '@videojs/html/i18n/locales/tr/register';
import '@videojs/html/i18n/locales/en/register';
import { installSeekMotion } from './seek-motion.js';
import { installMenuGuard } from './menu-guard.js';
import { installSpaceKey } from './space-key.js';
import { CaramelTimeDisplayElement } from './time-display.js';
import { CaramelQualityBadgeElement } from './quality-badge.js';
import { CaramelPreviewSizeElement } from './preview-size.js';
import { CaramelQualityRadioGroupElement } from './quality-order.js';
import { CaramelSeekIndicatorElement } from './seek-indicator.js';

if (typeof document !== 'undefined') {
  installSeekMotion();
  installSpaceKey();
  installMenuGuard();
  for (const Element of [CaramelTimeDisplayElement, CaramelQualityBadgeElement, CaramelPreviewSizeElement]) {
    if (!customElements.get(Element.tagName)) customElements.define(Element.tagName, Element);
  }
  for (const Element of [CaramelQualityRadioGroupElement, CaramelSeekIndicatorElement]) {
    if (!customElements.get(Element.caramelTagName)) customElements.define(Element.caramelTagName, Element);
  }
}
