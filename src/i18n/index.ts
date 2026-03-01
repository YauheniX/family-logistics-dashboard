import { createI18n } from 'vue-i18n';
import en from './en.json';
import pl from './pl.json';
import ru from './ru.json';
import ua from './ua.json';
import by from './by.json';

/**
 * Detect the best matching locale from the browser's language settings.
 * Falls back to 'en' if no supported locale is found.
 */
function detectLocale(): string {
  const supported = ['en', 'pl', 'ru', 'ua', 'by'];

  // navigator.languages is an ordered list of preferred languages
  const browserLanguages =
    typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language]
      : ['en'];

  for (const lang of browserLanguages) {
    if (!lang) continue;
    const base = lang.split('-')[0].toLowerCase();

    // Map language tags to our locale keys
    const mapping: Record<string, string> = {
      en: 'en',
      pl: 'pl',
      ru: 'ru',
      uk: 'ua', // Ukrainian BCP 47 tag is 'uk'
      be: 'by', // Belarusian BCP 47 tag is 'be'
    };

    const mapped = mapping[base];
    if (mapped && supported.includes(mapped)) {
      return mapped;
    }
  }

  return 'en';
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    pl,
    ru,
    ua,
    by,
  },
});

export default i18n;
