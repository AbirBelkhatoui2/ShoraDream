// src/pages/Home.jsx
import { useRef, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Sidebar from "../components/SideBar.jsx";
import "../styles/home.css";

import { AuthContext } from "../context/AuthContext.jsx";
import starsBg from "../assets/stars-bg.jpg";

import imgAriel          from "../assets/ariel-the-prince-flynn-rider-prince-charming-prince-naveen-disney-princess-1ff3ea0ef81b0873320abc1336adbb87.png";
import imgBeauty         from "../assets/beauty-and-the-beast-belle-beauty-and-the-beast-0f3174cfa6b24d0171506bc148812fe3.png";
import imgBelle          from "../assets/belle-princess-aurora-cinderella-rapunzel-princess-jasmine-beauty-and-the-beast-684565af2aaa99aff4f68d9828550c50.png";
import imgCinderella     from "../assets/cinderella-the-walt-disney-company-disney-princess-clip-art-cindrella-6606eb1115110f48079f0c6f79a8b6b1.png";
import imgStitch         from "../assets/disney-s-stitch-experiment-626-lilo-pelekai-lilo-stitch-the-walt-disney-company-stitch-2f0d0dfc377c19c28bfff54a764b6722.png";
import imgElsa1          from "../assets/elsa-kristoff-olaf-anna-clip-art-frozen-nose-cliparts-8d529c3fdceac098528072379f114389.png";
import imgElsa2          from "../assets/elsa-kristoff-rapunzel-anna-olaf-elsa-png-hd-b866e299bf3365820aa1d298fed993ff.png";
import imgFairyGodmother from "../assets/fairy-godmother-askepot-disney-fairies-fairy-da1e20fac3017e90d0759913b2ca43e5.png";
import imgFairy          from "../assets/fairy.png";
import imgMaleficent     from "../assets/maleficent-princess-aurora-ursula-evil-queen-cattivi-disney-castle-princess-da423cebe778d4e107b956675b53b308.png";
import imgAurora         from "../assets/princess-aurora-disney-fairies-thistletwit-the-sleeping-beauty-beauty-d4910d0f4e3cd87e97c2022eead59ebe.png";
import imgJasmine        from "../assets/princess-jasmine-belle-disney-princess-the-walt-disney-company-magic-carpet-princess-jasmine-ead6fc3b4aa5688fd89eb433e4369ef3.png";
import imgTinkerbell     from "../assets/tinker-bell-disney-fairies-silvermist-clip-art-fairy-dust-cliparts-7b091ec409ed84816140f882f1da7dba.png";

const CHARACTERS = [
  { id: "fairy",          name: "Fée",           img: imgFairy },
  { id: "tinkerbell",     name: "Fée Clochette",  img: imgTinkerbell },
  { id: "fairygodmother", name: "Fée Marraine",   img: imgFairyGodmother },
  { id: "ariel",          name: "Ariel",           img: imgAriel },
  { id: "belle",          name: "Belle",           img: imgBelle },
  { id: "beauty",         name: "La Bête",         img: imgBeauty },
  { id: "cinderella",     name: "Cendrillon",      img: imgCinderella },
  { id: "elsa1",          name: "Olaf",            img: imgElsa1 },
  { id: "elsa2",          name: "Elsa",            img: imgElsa2 },
  { id: "aurora",         name: "Aurore",          img: imgAurora },
  { id: "jasmine",        name: "Jasmine",         img: imgJasmine },
  { id: "maleficent",     name: "Maléfique",       img: imgMaleficent },
  { id: "stitch",         name: "Stitch",          img: imgStitch },
];

// ✅ Les rêves flottants
const DREAMS = [
  { text: "Devenir astronaute 🚀",        delay: 0,    dur: 18, x: 5,   size: 11 },
  { text: "Visiter le Louvre 🎨",         delay: 2,    dur: 22, x: 12,  size: 10 },
  { text: "Aller à Disneyland 🏰",        delay: 4,    dur: 16, x: 20,  size: 12 },
  { text: "Devenir millionnaire 💰",      delay: 1,    dur: 20, x: 75,  size: 11 },
  { text: "Avoir une Ferrari 🏎️",         delay: 6,    dur: 24, x: 83,  size: 10 },
  { text: "Jouer au football ⚽",         delay: 3,    dur: 19, x: 88,  size: 11 },
  { text: "Aller aux Maldives 🌴",        delay: 7,    dur: 21, x: 65,  size: 12 },
  { text: "Avoir l'iPhone 18 📱",         delay: 5,    dur: 17, x: 55,  size: 10 },
  { text: "Manger une pizza 🍕",          delay: 9,    dur: 23, x: 30,  size: 11 },
  { text: "Finir mes études 🎓",          delay: 2.5,  dur: 20, x: 42,  size: 12 },
  { text: "Voyager au Japon 🗾",          delay: 8,    dur: 18, x: 8,   size: 10 },
  { text: "Ouvrir mon restaurant 🍽️",    delay: 11,   dur: 22, x: 70,  size: 11 },
  { text: "Adopter un chaton 🐱",         delay: 3.5,  dur: 25, x: 92,  size: 10 },
  { text: "Écrire un livre 📖",           delay: 6.5,  dur: 19, x: 18,  size: 11 },
  { text: "Apprendre la guitare 🎸",      delay: 10,   dur: 21, x: 48,  size: 12 },
  { text: "Voir les aurores boréales 🌌", delay: 4.5,  dur: 23, x: 35,  size: 10 },
  { text: "Créer ma startup 💡",          delay: 7.5,  dur: 20, x: 78,  size: 11 },
  { text: "Danser sous la pluie 🌧️",     delay: 12,   dur: 18, x: 25,  size: 10 },
  { text: "Avoir un bateau ⛵",           delay: 1.5,  dur: 24, x: 60,  size: 12 },
  { text: "Rencontrer mon idole ⭐",      delay: 9.5,  dur: 22, x: 95,  size: 11 },
];

export default function Home() {
  const navigate    = useNavigate();
  const audioRef    = useRef(null);
  const { t, i18n } = useTranslation();
  const { user }    = useContext(AuthContext);

  const [burst, setBurst] = useState(false);
  const [busy,  setBusy]  = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [glowStars, setGlowStars]   = useState({});

  const [charIndex, setCharIndex] = useState(() => {
    const saved = localStorage.getItem("shora_char");
    const idx   = CHARACTERS.findIndex(c => c.id === saved);
    return idx >= 0 ? idx : 0;
  });

  const currentChar = CHARACTERS[charIndex];

  // ✅ Titre et sous-titre traduits avec interpolation
  const title    = t("home_title",    { name: user?.name || "ShoraDream" });
  const subtitle = t("home_subtitle", { char: currentChar.name.toUpperCase() });

  // ✅ Animation étoiles qui s'allument aléatoirement
  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * DREAMS.length);
      setGlowStars(prev => ({ ...prev, [idx]: true }));
      setTimeout(() => setGlowStars(prev => ({ ...prev, [idx]: false })), 1200);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const onAddStar = async () => {
    if (busy) return;
    setBusy(true); setBurst(true);
    try {
      if (audioRef.current) { audioRef.current.currentTime = 0; await audioRef.current.play(); }
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

  return (
    <div className="home">
      <Sidebar />

      <main className="home__stage">
        <div className="home__bg" style={{ backgroundImage: `url(${starsBg})` }} />
        <div className="home__stars" />

        {/* ✅ RÊVES FLOTTANTS */}
        <div className="dreams-layer" aria-hidden="true">
          {DREAMS.map((d, i) => (
            <div
              key={i}
              className="dream-item"
              style={{
                left: `${d.x}%`,
                animationDuration: `${d.dur}s`,
                animationDelay: `${d.delay}s`,
                fontSize: `${d.size}px`,
              }}
            >
              {/* Étoile qui s'allume */}
              <span className={`dream-star ${glowStars[i] ? "dream-star--glow" : ""}`}>
                ✦
              </span>
              <span className="dream-text">{d.text}</span>
            </div>
          ))}
        </div>

        {/* ── CARTE CENTRALE ── */}
        <section className="wish">
          <h1 className="wish__title">{title}</h1>
          <p className="wish__subtitle">{subtitle}</p>

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
              { code: "en", label: "English"  },
              { code: "ar", label: "العربية"  },
            ].map(({ code, label }) => (
              <button
                key={code} type="button"
                className={`lang-btn${i18n.language?.startsWith(code) ? " lang-btn--active" : ""}`}
                onClick={() => changeLang(code)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Personnage mobile */}
          <button type="button" className="char-btn--mobile" onClick={() => setShowPicker(v => !v)}>
            <img src={currentChar.img} alt={currentChar.name} className="char-img--mobile" />
            <span className="char-badge--mobile">✨ {currentChar.name} — changer</span>
          </button>
        </section>

        {/* Personnage desktop */}
        <button type="button" className="char-btn" onClick={() => setShowPicker(v => !v)}>
          <img src={currentChar.img} alt={currentChar.name} className="char-img" />
          <span className="char-badge">✨ {currentChar.name} — changer</span>
        </button>
      </main>

      {/* ── PICKER ── */}
      {showPicker && (
        <div className="picker-overlay" onClick={() => setShowPicker(false)}>
          <div className="picker-card" onClick={e => e.stopPropagation()}>
            <div className="picker-head">
              <div>
                <h2 className="picker-title">✨ Choisir un personnage</h2>
                <p className="picker-sub">{CHARACTERS.length} personnages disponibles</p>
              </div>
              <button type="button" className="picker-close" onClick={() => setShowPicker(false)}>✕</button>
            </div>
            <div className="picker-grid">
              {CHARACTERS.map((char, i) => (
                <div
                  key={char.id}
                  className={`picker-item${charIndex === i ? " picker-item--active" : ""}`}
                  onClick={() => selectChar(i)}
                >
                  {charIndex === i && <div className="picker-check">✓</div>}
                  <img src={char.img} alt={char.name} className="picker-item-img" />
                  <div className="picker-item-name">{char.name}</div>
                  {charIndex === i && <div className="picker-item-selected">Sélectionné</div>}
                </div>
              ))}
            </div>
            <p className="picker-footer">Le personnage est sauvegardé automatiquement</p>
          </div>
        </div>
      )}
    </div>
  );
}
