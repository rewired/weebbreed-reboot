import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import common from './locales/en/common.json';
import navigation from './locales/en/navigation.json';
import simulation from './locales/en/simulation.json';

const resources = {
  en: {
    common,
    navigation,
    simulation,
  },
};

export const initI18n = (): I18nInstance => {
  const instance = createInstance();

  instance
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: ['en'],
      defaultNS: 'common',
      ns: ['common', 'navigation', 'simulation'],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['querystring', 'localStorage', 'navigator'],
        caches: ['localStorage'],
      },
      returnNull: false,
    });

  return instance;
};

export type AppLocales = keyof typeof resources;
export type AppNamespaces = keyof (typeof resources)['en'];
