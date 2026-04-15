import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import viTranslation from './locales/vi/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: viTranslation },
    },
    lng: 'vi', // Force Vietnamese
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;
