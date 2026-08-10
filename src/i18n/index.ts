import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

// Detection order: a previously-chosen language (localStorage) always wins;
// otherwise fall back to the browser/device language on first visit. Once a
// language resolves (detected or manually toggled), it's cached back to the
// same localStorage key so it persists across sessions.
export const LANGUAGE_STORAGE_KEY = "spotsvault_lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr"],
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false, // React already escapes output
    },
  });

// index.html ships a static lang="en" (this is a pure client-rendered SPA,
// no SSR to set it correctly up front) — keep the <html> tag's lang in sync
// with whatever i18next actually resolves to, both on load and on toggle.
function syncHtmlLang(lang: string) {
  document.documentElement.lang = lang.split("-")[0];
}
syncHtmlLang(i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
