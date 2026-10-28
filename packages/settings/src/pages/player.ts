import { formatSeconds, PageBuilder, type SettingsHost, type SettingsPageView, translate } from './page.js';

/** Player: seek step, number keys, auto-skip, autoplay next, fullscreen on play. */
export function buildPlayerPage(host: SettingsHost, id: string): SettingsPageView {
  const page = new PageBuilder(host, 'player', id, 'pagePlayer');

  page.bindAvailability(
    page.sliderRow('player.seekStep', 'seekStep', (t, value) => formatSeconds(t, value)),
    'player.seekStep',
  );
  page.bindAvailability(page.switchRow('player.numberKeys', 'numberKeys'), 'player.numberKeys');
  page.bindAvailability(page.switchRow('player.autoSkipIntro', 'autoSkipIntro'), 'player.autoSkipIntro');
  page.bindAvailability(page.switchRow('player.autoSkipOutro', 'autoSkipOutro'), 'player.autoSkipOutro');
  // The countdown applies to the types that are not skipped at once; with
  // every switch on it has nothing to do and the row is disabled.
  page.bindAvailability(
    page.sliderRow(
      'player.autoSkipDelay',
      'autoSkipDelay',
      (t, value) => (value === 0 ? translate(t, 'off') : formatSeconds(t, value)),
      {
        when: () => host.settings['player.autoSkipIntro'] && host.settings['player.autoSkipOutro'],
        hint: 'autoSkipDelayInstant',
      },
    ),
    'player.autoSkipDelay',
  );
  page.bindAvailability(page.switchRow('player.autoAdvance', 'autoAdvance'), 'player.autoAdvance');
  page.bindAvailability(page.switchRow('player.autoFullscreen', 'autoFullscreen'), 'player.autoFullscreen');
  page.finish();

  return {
    page: 'player',
    icon: 'keyboard',
    title: 'pagePlayer',
    element: page.element,
    sync: (t) => page.sync(t),
    hint: (t) => formatSeconds(t, host.settings['player.seekStep']),
  };
}
