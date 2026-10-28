// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CaramelSettingsElement, SettingsChangeDetail } from '../src/element.js';

const HOTKEYS = `
  <media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
  <media-hotkey keys="ArrowLeft" action="seekStep" value="-5"></media-hotkey>
  <media-hotkey keys="l" action="seekStep" value="5"></media-hotkey>
  <media-hotkey keys="j" action="seekStep" value="-5"></media-hotkey>
  <media-hotkey keys="0-9" action="seekToPercent"></media-hotkey>
  <media-gesture type="doubletap" action="seekStep" region="left" value="-5"></media-gesture>
  <media-gesture type="doubletap" action="seekStep" region="right" value="5"></media-gesture>`;

let key = 0;

/**
 * A player tree without the real Video.js player: `<video-player>` and the
 * media elements stay undefined, so only the attribute binding and the styles
 * are exercised.
 */
function mount(
  position: 'after' | 'before',
  attributes = '',
): {
  player: HTMLElement;
  container: HTMLElement;
  settings: CaramelSettingsElement;
} {
  const storage = `test-settings-${++key}`;
  const settings = `<caramel-settings storage-key="${storage}" ${attributes}></caramel-settings>`;
  document.body.innerHTML = `
    <video-player>
      <media-container>
        ${position === 'before' ? settings : ''}
        <video></video>
        ${HOTKEYS}
        <caramel-skip-segments auto-skip="recap"></caramel-skip-segments>
        <caramel-playlist></caramel-playlist>
        ${position === 'after' ? settings : ''}
      </media-container>
    </video-player>`;
  return {
    player: document.querySelector('video-player')!,
    container: document.querySelector('media-container')!,
    settings: document.querySelector('caramel-settings') as CaramelSettingsElement,
  };
}

const hotkey = (keys: string) => document.querySelector(`media-hotkey[keys="${keys}"]`)!;
const gesture = (region: string) => document.querySelector(`media-gesture[region="${region}"]`)!;
const macrotask = () => new Promise((resolve) => setTimeout(resolve, 0));

function changes(element: HTMLElement): SettingsChangeDetail[] {
  const seen: SettingsChangeDetail[] = [];
  element.addEventListener('caramel-settings-change', (e) =>
    seen.push((e as CustomEvent<SettingsChangeDetail>).detail),
  );
  return seen;
}

/** Every attribute of every element in the container, to compare the DOM before and after. */
function attributes(root: Element): string {
  return [...root.querySelectorAll('*')]
    .filter((el) => el.localName !== 'caramel-settings')
    .map((el) => `${el.localName}[${[...el.attributes].map((a) => `${a.name}=${a.value}`).join(' ')}]`)
    .join('\n');
}

beforeAll(async () => {
  await import('../src/define.js');
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.replaceChildren();
  for (const style of document.head.querySelectorAll('style[data-caramel-settings]')) style.remove();
});

describe('<caramel-settings>', () => {
  for (const position of ['after', 'before'] as const) {
    it(`writes and restores the seek step when registered ${position} the siblings`, async () => {
      const { settings } = mount(position);
      // Siblings that arrive after the element are picked up by its observer.
      await macrotask();
      const seen = changes(settings);
      settings.set({ 'player.seekStep': 15 });
      expect(hotkey('ArrowRight').getAttribute('value')).toBe('15');
      expect(hotkey('l').getAttribute('value')).toBe('15');
      expect(hotkey('ArrowLeft').getAttribute('value')).toBe('-15');
      expect(hotkey('j').getAttribute('value')).toBe('-15');
      expect(gesture('right').getAttribute('value')).toBe('15');
      expect(gesture('left').getAttribute('value')).toBe('-15');
      expect(settings.settings['player.seekStep']).toBe(15);
      expect(settings.isUserSet('player.seekStep')).toBe(true);
      expect(seen.at(-1)?.keys).toEqual(['player.seekStep']);
      expect(seen.at(-1)?.settings['player.seekStep']).toBe(15);

      settings.reset('player');
      expect(hotkey('ArrowRight').getAttribute('value')).toBe('5');
      expect(hotkey('ArrowLeft').getAttribute('value')).toBe('-5');
      expect(gesture('left').getAttribute('value')).toBe('-5');
      expect(settings.isUserSet('player.seekStep')).toBe(false);
      expect(seen.at(-1)?.keys).toContain('player.seekStep');
    });
  }

  it('changes nothing when no choice is stored (defaults are a no-op)', () => {
    document.body.innerHTML = `
      <video-player><media-container><video></video>${HOTKEYS}
        <caramel-skip-segments auto-skip="recap"></caramel-skip-segments><caramel-playlist></caramel-playlist>
      </media-container></video-player>`;
    const container = document.querySelector('media-container')!;
    const before = attributes(container);
    const settings = document.createElement('caramel-settings') as CaramelSettingsElement;
    settings.setAttribute('storage-key', `test-settings-${++key}`);
    container.append(settings);
    container.removeAttribute('data-caramel-settings');
    expect(attributes(container)).toBe(before);
    expect(document.head.querySelector('style[data-caramel-settings]')).toBeNull();
    expect(settings.settings['player.seekStep']).toBe(5);
    expect(settings.settings['player.autoSkipIntro']).toBe(false);
  });

  it('reads the site defaults from the siblings', () => {
    const { settings } = mount('after');
    const values = settings.settings;
    expect(values['player.seekStep']).toBe(5);
    expect(values['player.numberKeys']).toBe(true);
    expect(values['player.autoSkipIntro']).toBe(false);
    expect(values['player.autoSkipOutro']).toBe(false);
    expect(values['player.autoAdvance']).toBe(true);
    expect(settings.availableKeys).toContain('player.autoAdvance');
  });

  it('parses the defaults attribute and lets the user override it', () => {
    const { settings } = mount('after', `defaults='{"player.seekStep":20,"player.autoAdvance":false,"nope":1}'`);
    expect(settings.defaults).toEqual({ 'player.seekStep': 20, 'player.autoAdvance': false });
    expect(settings.settings['player.seekStep']).toBe(20);
    expect(hotkey('ArrowRight').getAttribute('value')).toBe('20');
    expect(document.querySelector('caramel-playlist')!.hasAttribute('no-auto-advance')).toBe(true);
    settings.set({ 'player.seekStep': 10 });
    expect(hotkey('ArrowRight').getAttribute('value')).toBe('10');
  });

  it('composes auto-skip with the site list and keeps sponsor', () => {
    const { settings } = mount('after');
    const skip = document.querySelector('caramel-skip-segments')!;
    skip.setAttribute('auto-skip', 'recap,sponsor');
    settings.set({ 'player.autoSkipOutro': true });
    expect(skip.getAttribute('auto-skip')).toBe('recap,outro,sponsor');
    settings.reset();
    expect(skip.getAttribute('auto-skip')).toBe('recap,sponsor');
  });

  it('writes the value to a hotkey added later', async () => {
    const { settings, container } = mount('after');
    settings.set({ 'player.seekStep': 25 });
    const late = document.createElement('media-hotkey');
    late.setAttribute('keys', 'ArrowRight');
    late.setAttribute('action', 'seekStep');
    late.setAttribute('value', '5');
    container.append(late);
    await macrotask();
    expect(late.getAttribute('value')).toBe('25');
  });

  it('hides player rows whose sibling is missing', async () => {
    const { settings } = mount('after');
    const seen: string[][] = [];
    settings.addEventListener('caramel-settings-availability', (e) =>
      seen.push((e as CustomEvent<{ keys: string[] }>).detail.keys),
    );
    document.querySelector('caramel-playlist')!.remove();
    await macrotask();
    expect(settings.availableKeys).not.toContain('player.autoAdvance');
    expect(seen.at(-1)).not.toContain('player.autoAdvance');
  });

  it('attaches the display styles to the player and removes them with the element', () => {
    const { settings, container } = mount('after');
    const scope = container.getAttribute('data-caramel-settings');
    expect(scope).toMatch(/^caramel-settings-\d+$/);
    expect(document.head.querySelector('style[data-caramel-settings]')).toBeNull();
    settings.set({ 'display.filter': 'vivid' });
    const style = document.head.querySelector(`style[data-caramel-settings="${scope}"]`);
    expect(style?.textContent).toBe(
      `[data-caramel-settings="${scope}"] video { filter: saturate(1.3) contrast(1.05); }`,
    );
    settings.set({ 'display.filter': 'none' });
    expect(document.head.querySelector('style[data-caramel-settings]')).toBeNull();
    settings.set({ 'display.filter': 'warm' });
    expect(document.head.querySelector('style[data-caramel-settings]')).not.toBeNull();
    settings.remove();
    expect(document.head.querySelector('style[data-caramel-settings]')).toBeNull();
    expect(container.hasAttribute('data-caramel-settings')).toBe(false);
  });

  it('styles a video inside a shadow root through that root', () => {
    document.body.innerHTML = `<video-player><media-container><fake-video></fake-video></media-container></video-player>`;
    const media = document.querySelector('fake-video')!;
    const root = media.attachShadow({ mode: 'open' });
    root.append(document.createElement('video'));
    const settings = document.createElement('caramel-settings') as CaramelSettingsElement;
    settings.setAttribute('storage-key', `test-settings-${++key}`);
    settings.setAttribute('defaults', '{"display.filter":"cinema"}');
    document.querySelector('media-container')!.append(settings);
    const sheets = root.adoptedStyleSheets ?? [];
    const inline = root.querySelector('style[data-caramel-settings]');
    expect(sheets.length > 0 || inline !== null).toBe(true);
    expect(document.head.querySelector('style[data-caramel-settings]')).toBeNull();
    settings.remove();
    expect((root.adoptedStyleSheets ?? []).length).toBe(0);
    expect(root.querySelector('style[data-caramel-settings]')).toBeNull();
  });

  it('restores every sibling attribute on disconnect', () => {
    const { settings, container } = mount('after');
    const before = attributes(container);
    settings.set({ 'player.seekStep': 30, 'player.numberKeys': false, 'player.autoSkipIntro': false });
    expect(hotkey('0-9').hasAttribute('disabled')).toBe(true);
    settings.remove();
    expect(attributes(container)).toBe(before.replace(/ data-caramel-settings=[^\]\s]*/, ''));
  });

  it('shares the store between players with the same key', () => {
    const { settings } = mount('after');
    const other = document.createElement('caramel-settings') as CaramelSettingsElement;
    other.setAttribute('storage-key', settings.storageKey);
    document.body.append(other);
    settings.set({ 'captions.bold': true });
    expect(other.settings['captions.bold']).toBe(true);
    expect(other.isUserSet('captions.bold')).toBe(true);
  });
});
