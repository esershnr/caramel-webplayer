import { getCaptionFonts } from '../captions.js';
import { createGroupLabel, createText } from '../controls/items.js';
import { createRadioGroup } from '../controls/radio.js';
import { CAPTION_COLOR_I18N, captionFontKey, registerCaptionFontLabels } from '../i18n.js';
import { CAPTION_COLORS, type CaptionColor } from '../schema.js';
import { formatPercent, PageBuilder, type SettingsHost, type SettingsPageView, text, translate } from './page.js';

function swatch(color: CaptionColor): HTMLElement {
  const element = document.createElement('span');
  element.className = 'caramel-settings-swatch';
  element.dataset['color'] = color;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

/** Caption style: size, position, color, background, font, shadow, bold. */
export function buildSubtitlesPage(host: SettingsHost, id: string): SettingsPageView {
  const page = new PageBuilder(host, 'captions', id, 'pageCaptions');

  page.sliderRow('captions.scale', 'size', (t, value) => formatPercent(t, value * 100));
  page.sliderRow('captions.offset', 'position', (t, value) => formatPercent(t, value));

  const colorLabel = `${id}-color`;
  const colors = createRadioGroup(
    colorLabel,
    CAPTION_COLORS.map((color) => ({ value: color, label: text(CAPTION_COLOR_I18N[color]), prefix: swatch(color) })),
    (value) => host.set({ 'captions.color': value as CaptionColor }),
  );
  page.append(createGroupLabel(colorLabel, text('color')), colors.group);
  page.onSync(() => colors.set(host.settings['captions.color']));

  page.switchRow('captions.background', 'background');

  const fonts = getCaptionFonts();
  registerCaptionFontLabels(fonts);
  const fontLabel = `${id}-font`;
  const fontGroup = createRadioGroup(
    fontLabel,
    fonts.map((font) => ({ value: font.id, label: createText(captionFontKey(font.id), font.label.en) })),
    (value) => host.set({ 'captions.font': value }),
  );
  page.append(createGroupLabel(fontLabel, text('font')), fontGroup.group);
  page.onSync(() => fontGroup.set(host.settings['captions.font']));

  page.switchRow('captions.shadow', 'shadow');
  page.switchRow('captions.bold', 'bold');
  page.finish();

  return {
    page: 'captions',
    icon: 'subtitles',
    title: 'pageCaptions',
    element: page.element,
    sync: (t) => page.sync(t),
    hint: (t) => translate(t, CAPTION_COLOR_I18N[host.settings['captions.color']]),
  };
}
