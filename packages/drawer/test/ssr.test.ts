import { describe, expect, it } from 'vitest';

/**
 * The package entry must load without a DOM (Node, SSR): the element module
 * swaps HTMLElement for a stub and `define` is a no-op without `window`.
 */
describe('SSR import', () => {
  it('imports the index and the element without a DOM', async () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    const mod = await import('../src/index.js');
    expect(typeof mod.CaramelDrawerElement).toBe('function');
    expect(mod.CaramelDrawerElement.tagName).toBe('caramel-drawer');
    expect(typeof mod.defineCaramelDrawer).toBe('function');
    expect(() => mod.defineCaramelDrawer()).not.toThrow();
    expect(mod.DRAWER_KEYS.open).toBe('caramel.drawer.open');
    expect(mod.visibleTabs({ chapters: true, playlist: true })).toEqual(['chapters', 'playlist']);
  });

  it('resolves Turkish and English strings through the registry', async () => {
    const { createTranslator, getI18nTranslations } = await import('@videojs/html/i18n');
    const { registerDrawerI18n, DRAWER_KEYS, DRAWER_DEFAULTS } = await import('../src/i18n.js');
    const { CHAPTERS_KEYS, CHAPTERS_DEFAULTS } = await import('@esershnr/caramel-chapters');
    const { PLAYLIST_KEYS, PLAYLIST_DEFAULTS } = await import('@esershnr/caramel-playlist');
    registerDrawerI18n();
    const tr = createTranslator(getI18nTranslations('tr-TR'), 'tr-TR');
    const en = createTranslator(getI18nTranslations('en'), 'en');
    expect(tr(DRAWER_KEYS.open, { default: DRAWER_DEFAULTS.open })).toBe('Paneli aç');
    expect(tr(DRAWER_KEYS.close, { default: DRAWER_DEFAULTS.close })).toBe('Paneli kapat');
    expect(tr(DRAWER_KEYS.panel, { default: DRAWER_DEFAULTS.panel })).toBe('Bölümler ve oynatma listesi');
    expect(tr(CHAPTERS_KEYS.heading, { default: CHAPTERS_DEFAULTS.heading })).toBe('Bölümler');
    expect(tr(PLAYLIST_KEYS.heading, { default: PLAYLIST_DEFAULTS.heading })).toBe('Oynatma listesi');
    expect(en(DRAWER_KEYS.open, { default: DRAWER_DEFAULTS.open })).toBe('Open panel');
    expect(en(DRAWER_KEYS.panel, { default: DRAWER_DEFAULTS.panel })).toBe('Chapters and playlist');
    expect(en(PLAYLIST_KEYS.heading, { default: PLAYLIST_DEFAULTS.heading })).toBe('Playlist');
  });
});
