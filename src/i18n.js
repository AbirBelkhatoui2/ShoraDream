// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import fr from "./locales/fr/common.json";
import en from "./locales/en/common.json";
import ar from "./locales/ar/common.json";

export const SUPPORTED_LANGS = ["fr", "en", "ar"];
const RTL_LANGS = new Set(["ar"]);

function applyHtmlLang(lng) {
  const lang = String(lng || "fr").split("-")[0];
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: SUPPORTED_LANGS,
    fallbackLng: "fr",
    ns: ["common"],
    defaultNS: "common",

    resources: {
      fr: { common: fr },
      en: { common: en },
      ar: { common: ar },
    },

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "shora_lang",
    },

    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

applyHtmlLang(i18n.language);
i18n.on("languageChanged", (lng) => {
  applyHtmlLang(lng);
  // ✅ assure que la langue reste après refresh
  try {
    localStorage.setItem("shora_lang", lng);
  } catch {}
});

export default i18n;