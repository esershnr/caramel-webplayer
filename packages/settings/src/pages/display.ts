import { createGroupLabel } from '../controls/items.js';
import { createRadioGroup } from '../controls/radio.js';
import { aspectI18n, VIDEO_FILTER_I18N } from '../i18n.js';
import { ASPECT_RATIOS, type AspectRatio, VIDEO_FILTERS, type VideoFilter } from '../schema.js';
import { PageBuilder, type SettingsHost, type SettingsPageView, text, translate } from './page.js';

/** Display: forced aspect ratio and color filter of the video. */
export function buildDisplayPage(host: SettingsHost, id: string): SettingsPageView {
  const page = new PageBuilder(host, 'display', id, 'pageDisplay');

  const aspectLabel = `${id}-aspect`;
  const aspect = createRadioGroup(
    aspectLabel,
    ASPECT_RATIOS.map((ratio) => {
      const name = aspectI18n(ratio);
      return { value: ratio, label: name ? text(name) : ratio };
    }),
    (value) => host.set({ 'display.aspect': value as AspectRatio }),
  );
  page.append(createGroupLabel(aspectLabel, text('aspect')), aspect.group);
  page.onSync(() => aspect.set(host.settings['display.aspect']));

  const filterLabel = `${id}-filter`;
  const filter = createRadioGroup(
    filterLabel,
    VIDEO_FILTERS.map((name) => ({ value: name, label: text(VIDEO_FILTER_I18N[name]) })),
    (value) => host.set({ 'display.filter': value as VideoFilter }),
  );
  page.append(createGroupLabel(filterLabel, text('filter')), filter.group);
  page.onSync(() => filter.set(host.settings['display.filter']));
  page.finish();

  return {
    page: 'display',
    icon: 'display',
    title: 'pageDisplay',
    element: page.element,
    sync: (t) => page.sync(t),
    hint: (t) => {
      const ratio = host.settings['display.aspect'];
      if (ratio !== 'default') return ratio;
      const name = host.settings['display.filter'];
      if (name !== 'none') return translate(t, VIDEO_FILTER_I18N[name]);
      return translate(t, 'default');
    },
  };
}
