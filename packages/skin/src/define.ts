/**
 * Side-effect entry: registers the Video.js 10 player, every UI element the
 * skin uses, the esp morph icon and the Turkish / English locales. Browser only.
 */
import '@videojs/html/video/player';
import './components/videojs/video/skin.js';
import '@videojs/html/i18n/locales/tr/register';
import '@videojs/html/i18n/locales/en/register';
import { installSeekMotion } from './seek-motion.js';

if (typeof document !== 'undefined') installSeekMotion();
