import 'i18next';
import common from './locales/en/common.json';
import navigation from './locales/en/navigation.json';
import simulation from './locales/en/simulation.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      navigation: typeof navigation;
      simulation: typeof simulation;
    };
  }
}
