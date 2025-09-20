import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialise i18n', error);
  });

export default i18n;
