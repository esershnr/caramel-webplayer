import { describe, expect, it } from 'vitest';

describe('settings i18n', () => {
  it('resolves Turkish and English strings through the registry', async () => {
    const { createTranslator, getI18nTranslations } = await import('@videojs/html/i18n');
    const { registerSettingsI18n, SETTINGS_KEYS_I18N, SETTINGS_DEFAULTS_I18N } = await import('../src/i18n.js');
    registerSettingsI18n();
    const tr = createTranslator(getI18nTranslations('tr-TR'), 'tr-TR');
    const en = createTranslator(getI18nTranslations('en'), 'en');
    const t = (translate: typeof tr, name: keyof typeof SETTINGS_KEYS_I18N, params = {}) =>
      translate(SETTINGS_KEYS_I18N[name], { default: SETTINGS_DEFAULTS_I18N[name], ...params });

    expect(t(tr, 'pageCaptions')).toBe('Altyazı');
    expect(t(tr, 'pagePlayer')).toBe('Oynatıcı');
    expect(t(tr, 'pageDisplay')).toBe('Görüntü');
    expect(t(tr, 'seekStep')).toBe('İleri sarma adımı');
    expect(t(tr, 'autoFullscreen')).toBe('Oynatınca tam ekran');
    expect(t(tr, 'colorCyan')).toBe('Camgöbeği');
    expect(t(tr, 'filterCinema')).toBe('Sinema');
    expect(t(tr, 'off')).toBe('Kapalı');
    expect(t(tr, 'percent', { value: 120 })).toBe('%120');
    expect(t(tr, 'seconds', { value: 10 })).toBe('10 sn');

    expect(t(en, 'pageCaptions')).toBe('Subtitles');
    expect(t(en, 'numberKeys')).toBe('Number key seeking');
    expect(t(en, 'colorMagenta')).toBe('Magenta');
    expect(t(en, 'percent', { value: 120 })).toBe('120%');
    expect(t(en, 'seconds', { value: 10 })).toBe('10 s');
  });

  it('has a Turkish and an English string for every key, without em dashes', async () => {
    const { createTranslator, getI18nTranslations } = await import('@videojs/html/i18n');
    const { registerSettingsI18n, SETTINGS_KEYS_I18N } = await import('../src/i18n.js');
    registerSettingsI18n();
    const tr = createTranslator(getI18nTranslations('tr'), 'tr');
    const en = createTranslator(getI18nTranslations('en'), 'en');
    for (const key of Object.values(SETTINGS_KEYS_I18N)) {
      for (const translate of [tr, en]) {
        const value = translate(key, { default: '' });
        expect(value, key).not.toBe('');
        expect(value, key).not.toContain(String.fromCharCode(0x2014));
      }
    }
  });

  it('resolves the token form media-text uses, and caption font labels', async () => {
    const { createTranslator, getI18nTranslations, translateText } = await import('@videojs/html/i18n');
    const { registerSettingsI18n, registerCaptionFontLabels, captionFontKey } = await import('../src/i18n.js');
    const { getCaptionFonts } = await import('../src/captions.js');
    registerSettingsI18n();
    registerCaptionFontLabels(getCaptionFonts());
    const tr = createTranslator(getI18nTranslations('tr'), 'tr');
    const en = createTranslator(getI18nTranslations('en'), 'en');
    expect(translateText({ key: 'caramel.settings.page.display', text: 'Display' }, tr)).toBe('Görüntü');
    expect(translateText({ key: 'caramel.settings.page.display', text: 'Display' }, en)).toBe('Display');
    expect(tr(captionFontKey('mono'), { default: 'Mono' })).toBe('Eşit aralıklı');
    expect(en(captionFontKey('legible'), { default: '' })).toBe('High legibility');
    // A later registration merges with the earlier strings.
    expect(tr('caramel.settings.control.reset', { default: '' })).toBe('Sıfırla');
  });
});
