// src/pages/Home.jsx
import { useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Sidebar from "../components/SideBar.jsx";
import "../styles/home.css";

import { AuthContext } from "../context/AuthContext.jsx";
import starsBg from "../assets/stars-bg.jpg";

// ✅ Imports avec les noms exacts de tes fichiers
import imgAriel        from "../assets/ariel-the-prince-flynn-rider-prince-charming-prince-naveen-disney-princess-1ff3ea0ef81b0873320abc1336adbb87.png";
import imgBeauty       from "../assets/beauty-and-the-beast-belle-beauty-and-the-beast-0f3174cfa6b24d0171506bc148812fe3.png";
import imgBelle        from "../assets/belle-princess-aurora-cinderella-rapunzel-princess-jasmine-beauty-and-the-beast-684565af2aaa99aff4f68d9828550c50.png";
import imgCinderella   from "../assets/cinderella-the-walt-disney-company-disney-princess-clip-art-cindrella-6606eb1115110f48079f0c6f79a8b6b1.png";
import imgStitch       from "../assets/disney-s-stitch-experiment-626-lilo-pelekai-lilo-stitch-the-walt-disney-company-stitch-2f0d0dfc377c19c28bfff54a764b6722.png";
import imgElsa1        from "../assets/elsa-kristoff-olaf-anna-clip-art-frozen-nose-cliparts-8d529c3fdceac098528072379f114389.png";
import imgElsa2        from "../assets/elsa-kristoff-rapunzel-anna-olaf-elsa-png-hd-b866e299bf3365820aa1d298fed993ff.png";
import imgFairyGodmother from "../assets/fairy-godmother-askepot-disney-fairies-fairy-da1e20fac3017e90d0759913b2ca43e5.png";
import imgFairy        from "../assets/fairy.png";
import imgMaleficent   from "../assets/maleficent-princess-aurora-ursula-evil-queen-cattivi-disney-castle-princess-da423cebe778d4e107b956675b53b308.png";
import imgAurora       from "../assets/princess-aurora-disney-fairies-thistletwit-the-sleeping-beauty-beauty-d4910d0f4e3cd87e97c2022eead59ebe.png";
import imgJasmine      from "../assets/princess-jasmine-belle-disney-princess-the-walt-disney-company-magic-carpet-princess-jasmine-ead6fc3b4aa5688fd89eb433e4369ef3.png";
import imgTinkerbell   from "../assets/tinker-bell-disney-fairies-silvermist-clip-art-fairy-dust-cliparts-7b091ec409ed84816140f882f1da7dba.png";

const CHARACTERS = [
  { id: "fairy",           name: "Fée ✨",         img: imgFairy },
  { id: "tinkerbell",      name: "Fée Clochette",   img: imgTinkerbell },
  { id: "fairygodmother",  name: "Fée Marraine",    img: imgFairyGodmother },
  { id: "ariel",           name: "Ariel",            img: imgAriel },
  { id: "belle",           name: "Belle",            img: imgBelle },
  { id: "beauty",          name: "La Belle & Bête",  img: imgBeauty },
  { id: "cinderella",      name: "Cendrillon",       img: imgCinderella },
  { id: "elsa1",           name: "Elsa",             img: imgElsa1 },
  { id: "elsa2",           name: "Elsa & Anna",      img: imgElsa2 },
  { id: "aurora",          name: "Aurore",           img: imgAurora },
  { id: "jasmine",         name: "Jasmine",          img: imgJasmine },
  { id: "maleficent",      name: "Maléfique",        img: imgMaleficent },
  { id: "stitch",          name: "Stitch",           img: imgStitch },
];

export default function Home() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext);

  const [burst, setBurst] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [charIndex, setCharIndex] = useState(() => {
    const saved = localStorage.getItem("shora_char");
    const idx = CHARACTERS.findIndex(c => c.id === saved);
    return idx >= 0 ? idx : 0;
  });

  const currentChar = CHARACTERS[charIndex];

  const onAddStar = async () => {
    if (busy) return;
    setBusy(true);
    setBurst(true);
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      }
    } catch {}
    setTimeout(() => navigate("/profile"), 650);
    setTimeout(() => { setBurst(false); setBusy(false); }, 900);
  };

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("shora_lang", lng);
  };

  const selectChar = (index) => {
    setCharIndex(index);
    localStorage.setItem("shora_char", CHARACTERS[index].id);
    setShowPicker(false);
  };

  const title = user?.name ? `${user.name}, fais un vœu…` : t("home_title");

  return (
    <div className="home">
      <Sidebar />

      <main className="home__stage">
        <div className="home__bg" style={{ backgroundImage: `url(${starsBg})` }} />
        <div className="home__stars" />

        <section className="wish">
          <h1 className="wish__title">{title}</h1>
          <p className="wish__subtitle">{t("home_subtitle")}</p>

          <div className="wish__circle">
            <div className="wish__circle-inner">
              <span className="wish__moon">‧₊˚ ☁️⋅♡🪐༘⋆</span>
              <span className="wish__teddy">⋆｡‧˚ʚ🧸ɞ˚‧｡⋆</span>
            </div>
          </div>

          <audio ref={audioRef} src="/bell.mp3" preload="auto" />

          <button className="wish__btn wish__btn--with-bell" type="button" onClick={onAddStar} disabled={busy}>
            {t("add_star")}
            <span className={`bell-pop ${burst ? "bell-pop--on" : ""}`} aria-hidden="true">🔔</span>
          </button>

          <div className="lang-switch">
            {[
              { code: "fr", label: "Français" },
              { code: "en", label: "English" },
              { code: "ar", label: "العربية" },
            ].map(({ code, label }) => (
              <button
                key={code}
                className={`lang-btn${i18n.language?.startsWith(code) ? " lang-btn--active" : ""}`}
                type="button"
                onClick={() => changeLang(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ✅ Personnage cliquable */}
        <div
          style={{ position: "absolute", right: "8%", top: 130, zIndex: 2, textAlign: "center" }}
        >
          <img
            className="fairy"
            src={currentChar.img}
            alt={currentChar.name}
            draggable="false"
            onClick={() => setShowPicker(v => !v)}
            style={{ cursor: "pointer", position: "static" }}
            title={`${currentChar.name} — Cliquer pour changer`}
          />
          <div style={{ fontSize: 11, opacity: 0.75, color: "white", fontWeight: 700, marginTop: 6 }}>
            ✨ {currentChar.name}
          </div>
          <div style={{ fontSize: 10, opacity: 0.45, color: "white", marginTop: 2 }}>
            cliquer pour changer
          </div>
        </div>
      </main>

      {/* ✅ Sélecteur de personnage */}
      {showPicker && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowPicker(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(5,11,46,0.98)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 26,
              padding: "28px 24px",
              width: "min(720px, 96vw)",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 80px rgba(0,0,0,0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "white" }}>✨ Choisir un personnage</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.55, fontSize: 13, color: "white" }}>
                  {CHARACTERS.length} personnages disponibles
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", color: "white", fontSize: 16, cursor: "pointer", borderRadius: 12, width: 38, height: 38, display: "grid", placeItems: "center" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
              {CHARACTERS.map((char, i) => (
                <div
                  key={char.id}
                  onClick={() => selectChar(i)}
                  style={{
                    borderRadius: 18,
                    padding: "14px 10px",
                    border: `2px solid ${charIndex === i ? "#a78bfa" : "rgba(255,255,255,0.10)"}`,
                    background: charIndex === i ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                    boxShadow: charIndex === i ? "0 0 24px rgba(167,139,250,0.4)" : "none",
                    position: "relative",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.background = charIndex === i ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = charIndex === i ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.03)"; }}
                >
                  {/* Badge sélectionné */}
                  {charIndex === i && (
                    <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 999, background: "#a78bfa", display: "grid", placeItems: "center", fontSize: 11, color: "white", fontWeight: 900, boxShadow: "0 0 8px rgba(167,139,250,0.8)" }}>
                      ✓
                    </div>
                  )}

                  <img
                    src={char.img}
                    alt={char.name}
                    style={{ width: 90, height: 110, objectFit: "contain", display: "block", margin: "0 auto 10px", filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.6))" }}
                  />
                  <div style={{ fontSize: 12, fontWeight: 800, color: charIndex === i ? "#a78bfa" : "rgba(255,255,255,0.8)", lineHeight: 1.3 }}>
                    {char.name}
                  </div>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 22, opacity: 0.4, fontSize: 11, textAlign: "center", color: "white" }}>
              Le personnage choisi est sauvegardé automatiquement dans ton navigateur
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
