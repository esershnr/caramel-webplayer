// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  CARAMEL_PLAYBACK_RATES,
  CaramelPlaybackRateRadioGroupElement,
  extraPlaybackRates,
  formatPlaybackRate,
  playbackRateValue,
} from '../src/playback-rate-group.js';

const VIDEOJS_RATES = [0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2];

describe('playback rates', () => {
  it('offers the Video.js list plus 3x, ascending', () => {
    expect(CARAMEL_PLAYBACK_RATES).toEqual([...VIDEOJS_RATES, 3]);
  });

  it('adds only the rates the store does not list', () => {
    expect(extraPlaybackRates(VIDEOJS_RATES)).toEqual([3]);
    expect(extraPlaybackRates([...VIDEOJS_RATES, 3])).toEqual([]);
    expect(extraPlaybackRates([], [3, 0.25])).toEqual([0.25, 3]);
  });

  it('formats labels and values like the Video.js speed items', () => {
    expect(formatPlaybackRate(3)).toBe('3×');
    expect(formatPlaybackRate(1.5)).toBe('1.5×');
    expect(formatPlaybackRate(0.2)).toBe('0.2×');
    expect(playbackRateValue(3)).toBe('3');
    expect(playbackRateValue(0.7)).toBe('0.7');
  });
});

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

type Item = HTMLElement & { value: string };
type Indicator = HTMLElement & { checked: boolean };

function checkedRates(group: Element): string[] {
  return [...group.querySelectorAll<Item>('media-menu-radio-item')]
    .filter((item) => item.querySelector<Indicator>('media-menu-item-indicator')?.checked)
    .map((item) => item.value);
}

describe('<caramel-playback-rate-radio-group>', () => {
  it('renders the Video.js items plus 3x and selects 3x on the media', async () => {
    await import('@videojs/html/video/player');
    await import('@videojs/html/video/skin');
    const tag = CaramelPlaybackRateRadioGroupElement.caramelTagName;
    if (!customElements.get(tag)) customElements.define(tag, CaramelPlaybackRateRadioGroupElement);
    document.body.innerHTML = `
      <video-player><media-container>
        <video></video>
        <caramel-playback-rate-radio-group>
          <template><media-menu-radio-item><span data-part="label"></span><media-menu-item-indicator force-mount></media-menu-item-indicator></media-menu-radio-item></template>
        </caramel-playback-rate-radio-group>
      </media-container></video-player>`;
    await settle();

    const group = document.querySelector<CaramelPlaybackRateRadioGroupElement>(tag)!;
    const video = document.querySelector('video')!;
    const items = [...group.querySelectorAll<Item>('media-menu-radio-item')];
    expect(items.map((item) => item.value)).toEqual(CARAMEL_PLAYBACK_RATES.map(String));
    expect(items.map((item) => item.querySelector('[data-part="label"]')?.textContent)).toEqual(
      CARAMEL_PLAYBACK_RATES.map(formatPlaybackRate),
    );
    expect(items.at(-1)!.getAttribute('data-rate')).toBe('3');
    expect(checkedRates(group)).toEqual(['1']);

    // What the radio group dispatches when an item is chosen. happy-dom does
    // not fire ratechange itself, so it is sent here the way a browser does.
    const select = (value: string) => {
      group.dispatchEvent(new CustomEvent('value-change', { detail: { value }, bubbles: true }));
      video.dispatchEvent(new Event('ratechange'));
    };

    select('3');
    await settle();
    expect(video.playbackRate).toBe(3);
    expect(checkedRates(group)).toEqual(['3']);

    // Rates from the store list still go through Video.js.
    select('1.5');
    await settle();
    expect(video.playbackRate).toBe(1.5);
    expect(checkedRates(group)).toEqual(['1.5']);
    expect(group.querySelectorAll('media-menu-radio-item[data-rate="3"]')).toHaveLength(1);
  });
});
