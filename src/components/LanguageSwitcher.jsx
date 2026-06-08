// src/components/LanguageSwitcher.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS } from "../i18n";

const LABELS = {
  fr: "FR",
  en: "EN",
  ar: "AR",
  zh: "中文",
  ja: "日本語",
  es: "ES",
  hi: "HI",
  fa: "FA",
  ko: "KO",
  pt: "PT",
  de: "DE",
  tr: "TR",
  ru: "RU",
  it: "IT",
  nl: "NL",
  ro: "RO",
  vi: "VI",
  ur: "UR",
  ps: "PS",
  sw: "SW",
};

export default function LanguageSwitcher({ className = "" }) {
  const { i18n } = useTranslation();

  const current = useMemo(() => {
    return String(i18n.language || "fr").split("-")[0];
  }, [i18n.language]);

  const changeLang = (lng) => {
    const safe = SUPPORTED_LANGS.includes(lng) ? lng : "fr";
    i18n.changeLanguage(safe);
    try {
      localStorage.setItem("shora_lang", safe);
    } catch {}
  };

  return (
    <div className={`lang-switch ${className}`}>
      {SUPPORTED_LANGS.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => changeLang(lng)}
          className={`lang-btn ${current === lng ? "lang-btn--active" : ""}`}
          title={lng}
        >
          {LABELS[lng] || lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}