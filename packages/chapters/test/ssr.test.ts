import { describe, expect, it } from 'vitest';

/**
 * The package entry must load without a DOM (Node, SSR): the element module
 * swaps HTMLElement for a stub and `define` is a no-op without `window`.
 */
describe('SSR import', () => {
  it('imports the index and the element without a DOM', async () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    const mod = await import('../src/index.js');
    expect(typeof mod.EspChaptersPanelElement).toBe('function');
    expect(mod.EspChaptersPanelElement.tagName).toBe('esp-chapters-panel');
    expect(typeof mod.defineEspChaptersPanel).toBe('function');
    expect(() => mod.defineEspChaptersPanel()).not.toThrow();
    expect(mod.CHAPTERS_KEYS.empty).toBe('esp.chapters.empty');
  });

  it('resolves Turkish and English strings through the registry', async () => {
    const { createChaptersTranslator, CHAPTERS_KEYS, CHAPTERS_DEFAULTS } = await import('../src/i18n.js');
    const tr = createChaptersTranslator('tr-TR');
    const en = createChaptersTranslator('en');
    expect(tr(CHAPTERS_KEYS.empty, { default: CHAPTERS_DEFAULTS.empty })).toBe('Bölüm yok');
    expect(tr(CHAPTERS_KEYS.heading, { default: CHAPTERS_DEFAULTS.heading })).toBe('Bölümler');
    expect(en(CHAPTERS_KEYS.empty, { default: CHAPTERS_DEFAULTS.empty })).toBe('No chapters');
    expect(en(CHAPTERS_KEYS.heading, { default: CHAPTERS_DEFAULTS.heading })).toBe('Chapters');
  });
});
