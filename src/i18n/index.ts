import i18n, { type LanguageDetectorAsyncModule } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

// Detection order: a previously-chosen language (localStorage) always wins —
// once a user picks explicitly, that choice persists across visits and
// overrides geo, even if they later appear to browse from a different
// location. Otherwise, try a geo lookup (Quebec -> fr, elsewhere -> en) via
// our own Vercel edge function (api/geo-language.ts) — no third-party API or
// key involved. That lookup is time-boxed and best-effort: if it's slow,
// blocked (ad blockers/privacy extensions), or fails outright, we fall back
// to the browser/device language rather than blocking page load.
export const LANGUAGE_STORAGE_KEY = "spotsvault_lang";

const GEO_FETCH_TIMEOUT_MS = 800;

function isSupported(lng: string | null | undefined): lng is "en" | "fr" {
  return lng === "en" || lng === "fr";
}

async function detectViaGeo(): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEO_FETCH_TIMEOUT_MS);
    const res = await fetch("/api/geo-language", { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { language?: string };
    return isSupported(data.language) ? data.language : undefined;
  } catch {
    // Timed out, network error, or blocked by an extension — not fatal,
    // just means we fall through to the browser-language default below.
    return undefined;
  }
}

const languageDetector: LanguageDetectorAsyncModule = {
  type: "languageDetector",
  async: true,
  init: () => {},
  detect: async (): Promise<string> => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupported(stored)) return stored;

    const geoLanguage = await detectViaGeo();
    if (geoLanguage) return geoLanguage;

    const navigatorLanguage = navigator.language?.split("-")[0];
    return isSupported(navigatorLanguage) ? navigatorLanguage : "en";
  },
  cacheUserLanguage: (lng: string) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch {
      // Best-effort persistence — a failed write just means re-detection on next load.
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr"],
    interpolation: {
      escapeValue: false, // React already escapes output
    },
    // Detection is now async (the geo lookup above) — without this, any
    // component rendering before it resolves would suspend with no
    // <Suspense> boundary in place to catch it.
    react: {
      useSuspense: false,
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
