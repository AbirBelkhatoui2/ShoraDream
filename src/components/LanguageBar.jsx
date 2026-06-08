import i18n from "../i18n";

const LANGS = [
  ["fr", "Français"],
  ["en", "English"],
  ["ar", "العربية"],
  ["zh", "中文"],
  ["ja", "日本語"],
  ["es", "Español"],
  ["hi", "हिन्दी"],
  ["fa", "فارسی"],
  ["ko", "한국어"],
  ["pt", "Português"],
  ["de", "Deutsch"],
  ["tr", "Türkçe"],
  ["ru", "Русский"],
  ["it", "Italiano"],
  ["nl", "Nederlands"],
  ["ro", "Română"],
  ["vi", "Tiếng Việt"],
  ["ps", "پښتو"],
  ["sw", "Kiswahili"],
];

export default function LanguageBar() {
  const change = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
        Languages
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {LANGS.map(([code, label]) => (
          <button
            key={code}
            type="button"
            onClick={() => change(code)}
            className="btn-ghost"
            style={{ padding: "8px 10px", fontSize: 12 }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}