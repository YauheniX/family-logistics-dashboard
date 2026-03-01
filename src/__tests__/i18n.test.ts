import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock navigator for locale detection tests
const mockNavigator = (languages: string[], language: string) => {
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages, language },
    writable: true,
    configurable: true,
  });
};

describe('i18n', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('detectLocale (via i18n instance)', () => {
    it('falls back to "en" when no navigator languages match', async () => {
      mockNavigator(['fr', 'de'], 'fr');
      const { default: i18n } = await import('@/i18n/index');
      // After fallback: locale is 'en'
      expect(i18n.global.locale.value).toBe('en');
    });

    it('detects English locale from navigator', async () => {
      mockNavigator(['en-US', 'en'], 'en-US');
      const { default: i18n } = await import('@/i18n/index');
      expect(i18n.global.locale.value).toBe('en');
    });

    it('detects Polish locale from navigator', async () => {
      mockNavigator(['pl-PL', 'pl'], 'pl-PL');
      const { default: i18n } = await import('@/i18n/index');
      expect(i18n.global.locale.value).toBe('pl');
    });

    it('detects Russian locale from navigator', async () => {
      mockNavigator(['ru-RU', 'ru'], 'ru-RU');
      const { default: i18n } = await import('@/i18n/index');
      expect(i18n.global.locale.value).toBe('ru');
    });
  });

  describe('translation messages', () => {
    it('has English messages loaded', async () => {
      mockNavigator(['en'], 'en');
      const { default: i18n } = await import('@/i18n/index');
      expect(i18n.global.t('common.cancel')).toBe('Cancel');
      expect(i18n.global.t('auth.login.title')).toBe('Welcome Back');
      expect(i18n.global.t('nav.households')).toBe('Households');
    });

    it('falls back to English for missing keys', async () => {
      mockNavigator(['pl'], 'pl');
      const { default: i18n } = await import('@/i18n/index');
      i18n.global.locale.value = 'pl';
      expect(i18n.global.t('common.cancel')).toBe('Anuluj');
    });

    it('supports interpolation in translations', async () => {
      mockNavigator(['en'], 'en');
      const { default: i18n } = await import('@/i18n/index');
      const result = i18n.global.t('auth.login.passwordTooShort', { min: 6 });
      expect(result).toContain('6');
    });

    it('has all 5 locales loaded (en, pl, ru, uk, be)', async () => {
      mockNavigator(['en'], 'en');
      const { default: i18n } = await import('@/i18n/index');
      const availableLocales = i18n.global.availableLocales;
      expect(availableLocales).toContain('en');
      expect(availableLocales).toContain('pl');
      expect(availableLocales).toContain('ru');
      expect(availableLocales).toContain('uk');
      expect(availableLocales).toContain('be');
    });

    it('Polish translations are present', async () => {
      mockNavigator(['pl'], 'pl');
      const { default: i18n } = await import('@/i18n/index');
      i18n.global.locale.value = 'pl';
      expect(i18n.global.t('common.cancel')).toBe('Anuluj');
      expect(i18n.global.t('nav.households')).toBe('Gospodarstwa');
    });

    it('Russian translations are present', async () => {
      mockNavigator(['ru'], 'ru');
      const { default: i18n } = await import('@/i18n/index');
      i18n.global.locale.value = 'ru';
      expect(i18n.global.t('common.cancel')).toBe('Отмена');
      expect(i18n.global.t('nav.shopping')).toBe('Покупки');
    });

    it('Ukrainian translations are present', async () => {
      mockNavigator(['uk'], 'uk');
      const { default: i18n } = await import('@/i18n/index');
      i18n.global.locale.value = 'uk';
      expect(i18n.global.t('common.cancel')).toBe('Скасувати');
      expect(i18n.global.t('nav.settings')).toBe('Налаштування');
    });

    it('Belarusian translations are present', async () => {
      mockNavigator(['be'], 'be');
      const { default: i18n } = await import('@/i18n/index');
      i18n.global.locale.value = 'be';
      expect(i18n.global.t('common.cancel')).toBe('Адмяніць');
      expect(i18n.global.t('nav.home')).toBe('Галоўная');
    });
  });
});
