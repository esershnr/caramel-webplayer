// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import type { CaramelSkipSegmentsElement } from '../src/element';
import { settle } from './binding';

const INTRO = '[{"start":0,"end":30,"type":"intro"}]';

function mount(attributes = ''): { player: HTMLElement; skip: CaramelSkipSegmentsElement } {
  document.body.innerHTML = `
    <video-player>
      <media-time-slider></media-time-slider>
      <caramel-skip-segments segments='${INTRO}' ${attributes}></caramel-skip-segments>
    </video-player>`;
  return {
    player: document.querySelector('video-player')!,
    skip: document.querySelector('caramel-skip-segments')!,
  };
}

beforeAll(async () => {
  await import('@videojs/html/video/player');
  await import('../src/define');
});

describe('<caramel-skip-segments> options', () => {
  it('keeps property-set options across an unrelated attribute change', async () => {
    const { skip } = mount();
    await settle();
    skip.autoSkip = { recap: true };
    skip.autoSkipDelay = 7;
    skip.setAttribute('segments', '[{"start":0,"end":40,"type":"intro"}]');
    skip.setAttribute('hide-after', '3');
    await settle();
    expect(skip.autoSkip).toEqual({ recap: true });
    expect(skip.autoSkipDelay).toBe(7);
    expect(skip.segments[0]?.end).toBe(40);
  });

  it('applies the delay attribute and restores the default when it is removed', async () => {
    const { skip } = mount('auto-skip-delay="4"');
    await settle();
    expect(skip.autoSkipDelay).toBe(4);
    skip.setAttribute('auto-skip-delay', '-2');
    expect(skip.autoSkipDelay).toBe(0);
    skip.setAttribute('auto-skip-delay', 'soon');
    expect(skip.autoSkipDelay).toBe(0);
    skip.setAttribute('auto-skip-delay', '2.5');
    expect(skip.autoSkipDelay).toBe(2.5);
    skip.removeAttribute('auto-skip-delay');
    expect(skip.autoSkipDelay).toBe(0);
    skip.setAttribute('auto-skip', 'intro');
    expect(skip.autoSkip).toEqual({ intro: true });
    skip.removeAttribute('auto-skip');
    expect(skip.autoSkip).toEqual({});
  });

  it('renders the countdown, the close button and one announcement', async () => {
    const { skip } = mount('auto-skip="intro" auto-skip-delay="5"');
    const countdowns: unknown[] = [];
    skip.addEventListener('caramel-skip-countdown', (e) => countdowns.push((e as CustomEvent).detail));
    await settle();

    const button = skip.querySelector<HTMLButtonElement>('.caramel-skip-button')!;
    const digits = skip.querySelector<HTMLElement>('.caramel-skip-button-countdown')!;
    const announcer = skip.querySelector<HTMLElement>('.caramel-skip-announcer')!;
    expect(button.hasAttribute('data-visible')).toBe(true);
    expect(button.hasAttribute('data-countdown')).toBe(true);
    expect(digits.hidden).toBe(false);
    expect(digits.textContent).toBe('5');
    expect(digits.getAttribute('aria-hidden')).toBe('true');
    expect(button.style.getPropertyValue('--caramel-skip-countdown-progress')).toBe('0');
    expect(announcer.getAttribute('role')).toBe('status');
    expect(announcer.getAttribute('aria-live')).toBe('polite');
    expect(announcer.textContent).toBe('Intro skips in 5 seconds');
    expect(skip.querySelector('.caramel-skip-dismiss')?.getAttribute('aria-label')).toBe('Cancel auto-skip');
    expect(countdowns).toHaveLength(1);

    // Escape on the focused skip button cancels the countdown.
    const cancels: unknown[] = [];
    skip.addEventListener('caramel-skip-cancel', (e) => cancels.push((e as CustomEvent).detail));
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(cancels).toHaveLength(1);
    expect(button.hasAttribute('data-countdown')).toBe(false);
    expect(button.hasAttribute('data-visible')).toBe(false);
    expect(digits.hidden).toBe(true);
    expect(announcer.textContent).toBe('');
    expect(skip.querySelector('.caramel-skip-dismiss')).toBeNull();
  });

  it('adds no countdown markup without a delay', async () => {
    const { skip } = mount();
    await settle();
    const button = skip.querySelector<HTMLButtonElement>('.caramel-skip-button')!;
    expect(button.hasAttribute('data-visible')).toBe(true);
    expect(button.hasAttribute('data-countdown')).toBe(false);
    expect(button.hasAttribute('style')).toBe(false);
    expect(skip.querySelector<HTMLElement>('.caramel-skip-button-countdown')?.hidden).toBe(true);
    expect(skip.querySelector('.caramel-skip-dismiss')).toBeNull();
    expect(skip.querySelector('.caramel-skip-announcer')?.textContent).toBe('');
  });
});
