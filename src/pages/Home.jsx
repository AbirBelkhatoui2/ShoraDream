// src/pages/Home.jsx
import { useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Sidebar from "../components/SideBar.jsx";
import "../styles/home.css";

import { AuthContext } from "../context/AuthContext.jsx";
import fairyImg from "../assets/fairy.png";
import starsBg from "../assets/stars-bg.jpg";

export default function Home() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext);

  const [burst, setBurst] = useState(false);
  const [busy, setBusy] = useState(false);

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
    setTimeout(() => {
      setBurst(false);
      setBusy(false);
    }, 900);
  };

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("shora_lang", lng);
  };

  const title = user?.name
    ? `${user.name}, fais un vœu…`
    : t("home_title");

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
              <span className="wish__moon"> ‧₊˚ ☁️⋅♡🪐༘⋆</span>
              <span className="wish__teddy">⋆｡‧˚ʚ🧸ɞ˚‧｡⋆</span>
            </div>
          </div>

          <audio ref={audioRef} src="/bell.mp3" preload="auto" />

          <button className="wish__btn wish__btn--with-bell" type="button" onClick={onAddStar} disabled={busy}>
            {t("add_star")}
            <span className={`bell-pop ${burst ? "bell-pop--on" : ""}`} aria-hidden="true">
              🔔
            </span>
          </button>

          <div className="lang-switch">
            <button className="lang-btn" type="button" onClick={() => changeLang("fr")}>
              Français
            </button>
            <button className="lang-btn" type="button" onClick={() => changeLang("en")}>
              English
            </button>
            <button className="lang-btn" type="button" onClick={() => changeLang("ar")}>
              العربية
            </button>
          </div>
        </section>

        <img className="fairy" src={fairyImg} alt="Fairy" draggable="false" />
      </main>
    </div>
  );
}
