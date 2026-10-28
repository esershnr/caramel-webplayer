// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { applyBinding, BOUND_KEYS, readSiteDefaults } from '../src/binder.js';
import { resolveSettings, SETTINGS_DEFAULTS, type SettingsKey, type SettingsValues } from '../src/schema.js';

const FIXTURE = `
<media-container>
  <media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
  <media-hotkey keys="ArrowLeft" action="seekStep" value="-5"></media-hotkey>
  <media-hotkey keys="l" action="seekStep" value="5"></media-hotkey>
  <media-hotkey keys="j" action="seekStep" value="-5"></media-hotkey>
  <media-hotkey keys="0-9" action="seekToPercent"></media-hotkey>
  <media-hotkey keys="Home" action="seekToPercent" value="0"></media-hotkey>
  <media-gesture type="doubletap" action="seekStep" region="left" value="-5"></media-gesture>
  <media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>
  <media-gesture type="doubletap" action="seekStep" region="right" value="5"></media-gesture>
  <caramel-skip-segments auto-skip="recap"></caramel-skip-segments>
  <caramel-playlist></caramel-playlist>
</media-container>`;

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('video-player');
  root.innerHTML = FIXTURE;
  document.body.replaceChildren(root);
});

const values = (partial: Partial<SettingsValues> = {}) => ({ ...SETTINGS_DEFAULTS, ...partial });
const keys = (...list: SettingsKey[]) => new Set<SettingsKey>(list);
const attr = (selector: string, name: string) => root.querySelector(selector)!.getAttribute(name);
const skip = 'caramel-skip-segments';

describe('readSiteDefaults', () => {
  it('reads what the siblings do today', () => {
    expect(readSiteDefaults(root)).toEqual({
      'player.seekStep': 5,
      'player.numberKeys': true,
      // The site skips recaps only: that does not speak for the intro switch, which stays off.
      // No delay from the site, so the package default applies (the key is absent).
      'player.autoSkipIntro': false,
      'player.autoSkipOutro': false,
      'player.autoAdvance': true,
    });
    root.querySelector(skip)!.setAttribute('auto-skip', 'intro');
    expect(readSiteDefaults(root)['player.autoSkipIntro']).toBe(true);
  });

  it('uses the Video.js step when the hotkey has no value', () => {
    root.querySelector('media-hotkey[keys="ArrowRight"]')!.removeAttribute('value');
    expect(readSiteDefaults(root)['player.seekStep']).toBe(10);
  });

  it('reads disabled keys, outro, all, delay and no auto advance', () => {
    root.querySelector('media-hotkey[keys="0-9"]')!.setAttribute('disabled', '');
    root.querySelector(skip)!.setAttribute('auto-skip', 'outro');
    root.querySelector(skip)!.setAttribute('auto-skip-delay', '3');
    root.querySelector('caramel-playlist')!.setAttribute('no-auto-advance', '');
    // The site counts outros down 3 s: the switch is off and 3 s is the countdown default.
    expect(readSiteDefaults(root)).toMatchObject({
      'player.numberKeys': false,
      'player.autoSkipIntro': false,
      'player.autoSkipOutro': false,
      'player.autoSkipDelay': 3,
      'player.autoAdvance': false,
    });
    root.querySelector(skip)!.setAttribute('auto-skip', 'all');
    expect(readSiteDefaults(root)).toMatchObject({ 'player.autoSkipIntro': false, 'player.autoSkipOutro': false });
    root.querySelector(skip)!.removeAttribute('auto-skip-delay');
    expect(readSiteDefaults(root)).toMatchObject({ 'player.autoSkipIntro': true, 'player.autoSkipOutro': true });
    expect(readSiteDefaults(root)).not.toHaveProperty('player.autoSkipDelay');
    // A per type site delay: intro at once, outro counted down.
    root.querySelector(skip)!.setAttribute('auto-skip', 'intro,outro');
    root.querySelector(skip)!.setAttribute('auto-skip-delay', 'intro:0,outro:2');
    expect(readSiteDefaults(root)).toMatchObject({
      'player.autoSkipIntro': true,
      'player.autoSkipOutro': false,
      'player.autoSkipDelay': 2,
    });
  });

  it('returns only keys whose element exists', () => {
    const empty = document.createElement('div');
    expect(readSiteDefaults(empty)).toEqual({});
    empty.innerHTML = '<caramel-playlist no-auto-advance></caramel-playlist>';
    expect(readSiteDefaults(empty)).toEqual({ 'player.autoAdvance': false });
  });

  it('keeps reading the site values after a write', () => {
    applyBinding(root, values({ 'player.seekStep': 20, 'player.autoAdvance': false }), keys(...BOUND_KEYS));
    expect(readSiteDefaults(root)).toMatchObject({ 'player.seekStep': 5, 'player.autoAdvance': true });
  });
});

describe('applyBinding', () => {
  it('writes nothing with no active key', () => {
    const before = root.outerHTML;
    expect(applyBinding(root, values({ 'player.seekStep': 30, 'player.numberKeys': false }), keys())).toEqual([]);
    expect(root.outerHTML).toBe(before);
  });

  it('writes a signed seek step to hotkeys and gestures', () => {
    expect(applyBinding(root, values({ 'player.seekStep': 15 }), keys('player.seekStep'))).toEqual(['player.seekStep']);
    expect(attr('media-hotkey[keys="ArrowRight"]', 'value')).toBe('15');
    expect(attr('media-hotkey[keys="l"]', 'value')).toBe('15');
    expect(attr('media-hotkey[keys="ArrowLeft"]', 'value')).toBe('-15');
    expect(attr('media-hotkey[keys="j"]', 'value')).toBe('-15');
    expect(attr('media-gesture[region="right"]', 'value')).toBe('15');
    expect(attr('media-gesture[region="left"]', 'value')).toBe('-15');
    expect(attr('media-hotkey[keys="Home"]', 'value')).toBe('0');
    expect(attr('media-gesture[region="center"]', 'value')).toBeNull();

    expect(applyBinding(root, values({ 'player.seekStep': 15 }), keys())).toEqual(['player.seekStep']);
    expect(attr('media-hotkey[keys="ArrowRight"]', 'value')).toBe('5');
    expect(attr('media-gesture[region="left"]', 'value')).toBe('-5');
  });

  it('toggles the number keys', () => {
    const sel = 'media-hotkey[keys="0-9"]';
    applyBinding(root, values({ 'player.numberKeys': false }), keys('player.numberKeys'));
    expect(attr(sel, 'disabled')).toBe('');
    applyBinding(root, values({ 'player.numberKeys': true }), keys('player.numberKeys'));
    expect(attr(sel, 'disabled')).toBeNull();
  });

  const autoSkipKeys = keys('player.autoSkipIntro', 'player.autoSkipOutro', 'player.autoSkipDelay');

  it('writes the auto-skip model: switch on skips at once, off counts down, off with 0 shows the button only', () => {
    // Intro at once, outro counted down 3 s (the package default).
    expect(applyBinding(root, values({ 'player.autoSkipIntro': true }), autoSkipKeys)).toEqual([
      'player.autoSkipIntro',
      'player.autoSkipOutro',
      'player.autoSkipDelay',
    ]);
    expect(attr(skip, 'auto-skip')).toBe('intro,recap,outro');
    expect(attr(skip, 'auto-skip-delay')).toBe('intro:0,recap:0,outro:3,sponsor:0');
    // Both off: every type counts down.
    applyBinding(root, values(), autoSkipKeys);
    expect(attr(skip, 'auto-skip')).toBe('intro,recap,outro');
    expect(attr(skip, 'auto-skip-delay')).toBe('intro:3,recap:3,outro:3,sponsor:0');
    // Both off and countdown 0: no auto-skip at all.
    applyBinding(root, values({ 'player.autoSkipDelay': 0 }), autoSkipKeys);
    expect(attr(skip, 'auto-skip')).toBe('');
    expect(attr(skip, 'auto-skip-delay')).toBe('intro:0,recap:0,outro:0,sponsor:0');
    // Both on: everything at once, the countdown has nothing to do.
    applyBinding(root, values({ 'player.autoSkipIntro': true, 'player.autoSkipOutro': true }), autoSkipKeys);
    expect(attr(skip, 'auto-skip')).toBe('intro,recap,outro');
    expect(attr(skip, 'auto-skip-delay')).toBe('intro:0,recap:0,outro:0,sponsor:0');
    // Restore: the site's list is back and the delay it never set is gone.
    expect(applyBinding(root, values(), keys())).toEqual(autoSkipKeys.size === 3 ? [...autoSkipKeys] : []);
    expect(attr(skip, 'auto-skip')).toBe('recap');
    expect(root.querySelector(skip)!.hasAttribute('auto-skip-delay')).toBe(false);
  });

  it('leaves recap to the site until the intro switch is set', () => {
    // Site: recap at once, nothing else. Untouched settings: intro counts down the
    // default 3 s, recap keeps skipping at once, outro counts down too.
    expect(applyBinding(root, values(), autoSkipKeys, keys())).toEqual([...autoSkipKeys]);
    expect(attr(skip, 'auto-skip')).toBe('intro,recap,outro');
    expect(attr(skip, 'auto-skip-delay')).toBe('intro:3,recap:0,outro:3,sponsor:0');
    // Countdown 0 and nothing touched: recap is still the site's.
    applyBinding(root, values({ 'player.autoSkipDelay': 0 }), autoSkipKeys, keys('player.autoSkipDelay'));
    expect(attr(skip, 'auto-skip')).toBe('recap');
    // The viewer sets the intro switch: recap follows it from now on.
    applyBinding(root, values({ 'player.autoSkipIntro': true }), autoSkipKeys, keys('player.autoSkipIntro'));
    expect(attr(skip, 'auto-skip')).toBe('intro,recap,outro');
    expect(attr(skip, 'auto-skip-delay')).toBe('intro:0,recap:0,outro:3,sponsor:0');
    applyBinding(
      root,
      values({ 'player.autoSkipIntro': false, 'player.autoSkipDelay': 0 }),
      autoSkipKeys,
      keys('player.autoSkipIntro', 'player.autoSkipDelay'),
    );
    expect(attr(skip, 'auto-skip')).toBe('');
    applyBinding(root, values(), keys());
    expect(attr(skip, 'auto-skip')).toBe('recap');
  });

  it('keeps sponsor and its site delay and round trips the site list', () => {
    root.querySelector(skip)!.setAttribute('auto-skip', 'sponsor, outro');
    root.querySelector(skip)!.setAttribute('auto-skip-delay', 'sponsor:2');
    applyBinding(root, values({ 'player.autoSkipIntro': true }), autoSkipKeys);
    expect(attr(skip, 'auto-skip')).toBe('intro,recap,outro,sponsor');
    expect(attr(skip, 'auto-skip-delay')).toBe('intro:0,recap:0,outro:3,sponsor:2');
    applyBinding(root, values({ 'player.autoSkipDelay': 0 }), autoSkipKeys);
    expect(attr(skip, 'auto-skip')).toBe('sponsor');
    applyBinding(root, values(), keys());
    expect(attr(skip, 'auto-skip')).toBe('sponsor, outro');
    // The delay comes back in its per type form, which skip-segments reads the same way.
    expect(attr(skip, 'auto-skip-delay')).toBe('intro:0,recap:0,outro:0,sponsor:2');
  });

  it('expands all before replacing the groups', () => {
    root.querySelector(skip)!.setAttribute('auto-skip', 'all');
    applyBinding(root, values({ 'player.autoSkipDelay': 0 }), autoSkipKeys);
    expect(attr(skip, 'auto-skip')).toBe('sponsor');
  });

  it('writes an empty list when the site had none and nothing is auto-skipped', () => {
    root.querySelector(skip)!.removeAttribute('auto-skip');
    applyBinding(root, values({ 'player.autoSkipDelay': 0 }), autoSkipKeys);
    expect(attr(skip, 'auto-skip')).toBe('');
    applyBinding(root, values(), keys());
    expect(root.querySelector(skip)!.hasAttribute('auto-skip')).toBe(false);
  });

  it('toggles auto advance', () => {
    applyBinding(root, values({ 'player.autoAdvance': false }), keys('player.autoAdvance'));
    expect(attr('caramel-playlist', 'no-auto-advance')).toBe('');
    applyBinding(root, values({ 'player.autoAdvance': true }), keys('player.autoAdvance'));
    expect(attr('caramel-playlist', 'no-auto-advance')).toBeNull();
  });

  it('is idempotent', () => {
    const chosen = values({
      'player.seekStep': 20,
      'player.numberKeys': false,
      'player.autoSkipIntro': true,
      'player.autoSkipOutro': true,
      'player.autoSkipDelay': 4,
      'player.autoAdvance': false,
    });
    expect(applyBinding(root, chosen, keys(...BOUND_KEYS))).toEqual([...BOUND_KEYS]);
    const after = root.outerHTML;
    expect(applyBinding(root, chosen, keys(...BOUND_KEYS))).toEqual([]);
    expect(root.outerHTML).toBe(after);
    expect(applyBinding(root, chosen, keys())).toEqual([...BOUND_KEYS]);
    expect(applyBinding(root, chosen, keys())).toEqual([]);
  });

  it('writes nothing when the chosen values equal what the site set', () => {
    const before = root.outerHTML;
    const site = resolveSettings({}, readSiteDefaults(root));
    expect(applyBinding(root, site, keys('player.seekStep', 'player.numberKeys', 'player.autoAdvance'))).toEqual([]);
    expect(root.outerHTML).toBe(before);
  });

  it('reaches elements added later', () => {
    const chosen = values({ 'player.autoSkipOutro': true, 'player.autoSkipDelay': 2 });
    applyBinding(root, chosen, autoSkipKeys);
    const late = document.createElement('caramel-skip-segments');
    late.setAttribute('auto-skip', 'sponsor');
    root.querySelector('media-container')!.append(late);
    expect(applyBinding(root, chosen, autoSkipKeys)).toEqual([...autoSkipKeys]);
    // Outro at once, intro and recap counted down 2 s, sponsor as the site set it.
    expect(late.getAttribute('auto-skip')).toBe('intro,recap,outro,sponsor');
    expect(late.getAttribute('auto-skip-delay')).toBe('intro:2,recap:2,outro:0,sponsor:0');
    applyBinding(root, chosen, keys());
    expect(late.getAttribute('auto-skip')).toBe('sponsor');
    expect(late.hasAttribute('auto-skip-delay')).toBe(false);
  });

  it('drives upgraded siblings through their properties and keeps the site config', () => {
    // Stand-ins for the upgraded elements: the methods the binder looks for exist.
    class FakeSkip extends HTMLElement {
      autoSkip: Record<string, boolean> = { sponsor: true };
      autoSkipDelay: number | Record<string, number> = 0;
      skip(): boolean {
        return false;
      }
    }
    class FakePlaylist extends HTMLElement {
      autoAdvance = false;
      loop = true;
      select(): boolean {
        return false;
      }
    }
    customElements.define('caramel-skip-segments', FakeSkip);
    customElements.define('caramel-playlist', FakePlaylist);
    const player = document.createElement('video-player');
    const skip = new FakeSkip();
    const playlist = new FakePlaylist();
    player.append(skip, playlist);

    expect(readSiteDefaults(player)).toMatchObject({
      'player.autoSkipIntro': false,
      'player.autoSkipOutro': false,
      'player.autoAdvance': false,
    });

    const chosen = values({ 'player.autoSkipIntro': true, 'player.autoSkipDelay': 3, 'player.autoAdvance': true });
    const active = keys('player.autoSkipIntro', 'player.autoSkipDelay', 'player.autoAdvance');
    expect(applyBinding(player, chosen, active)).toEqual([
      'player.autoSkipIntro',
      'player.autoSkipOutro',
      'player.autoSkipDelay',
      'player.autoAdvance',
    ]);
    // Intro at once; outro (switch off) counts down the 3 s; sponsor untouched.
    expect(skip.autoSkip).toEqual({ sponsor: true, intro: true, recap: true, outro: true });
    expect(skip.autoSkipDelay).toEqual({ intro: 0, recap: 0, outro: 3, sponsor: 0 });
    expect(skip.hasAttribute('auto-skip')).toBe(false);
    expect(skip.hasAttribute('auto-skip-delay')).toBe(false);
    expect(playlist.autoAdvance).toBe(true);
    expect(playlist.hasAttribute('no-auto-advance')).toBe(false);
    expect(playlist.loop).toBe(true);
    // The site default is still what the site set.
    expect(readSiteDefaults(player)['player.autoAdvance']).toBe(false);

    // The site changes its config after our write: the new value is the site's.
    skip.autoSkip = { sponsor: true, outro: true };
    expect(readSiteDefaults(player)['player.autoSkipOutro']).toBe(true);
    applyBinding(player, chosen, active);
    expect(skip.autoSkip).toEqual({ intro: true, recap: true, outro: true, sponsor: true });

    expect(applyBinding(player, chosen, keys())).toEqual([
      'player.autoSkipIntro',
      'player.autoSkipOutro',
      'player.autoSkipDelay',
      'player.autoAdvance',
    ]);
    expect(skip.autoSkip).toEqual({ outro: true, sponsor: true });
    expect(skip.autoSkipDelay).toEqual({ intro: 0, recap: 0, outro: 0, sponsor: 0 });
    expect(playlist.autoAdvance).toBe(false);
  });
});
