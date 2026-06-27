// src/components/SideBar.jsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { apiGet } from "../api.js";

function ShoraDreamLogo() {
  return (
    <svg width="38" height="38" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <defs>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0"/>
        </radialGradient>
        <filter id="f1"><feGaussianBlur stdDeviation="2.5"/></filter>
        <filter id="f2"><feGaussianBlur stdDeviation="5"/></filter>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#halo)"/>
      <g filter="url(#f2)">
        <ellipse cx="40" cy="40" rx="30" ry="6" fill="#A78BFA" opacity="0.8"/>
        <ellipse cx="40" cy="40" rx="6" ry="30" fill="#A78BFA" opacity="0.8"/>
        <circle cx="40" cy="40" r="12" fill="#C4B5FD"/>
      </g>
      <g filter="url(#f1)">
        <ellipse cx="40" cy="40" rx="26" ry="3.5" fill="#ffffff" opacity="0.95"/>
        <ellipse cx="40" cy="40" rx="3.5" ry="26" fill="#ffffff" opacity="0.95"/>
      </g>
      <polygon points="40,14 44.5,30 60,30 48,39 52,56 40,47 28,56 32,39 20,30 35.5,30" fill="#7C3AED" opacity="0.7"/>
      <polygon points="40,22 43,32 53,32 45,38 48,49 40,43 32,49 35,38 27,32 37,32" fill="#A78BFA" opacity="0.9"/>
      <polygon points="40,28 42,34 48,34 43,38 45,44 40,41 35,44 37,38 32,34 38,34" fill="#EDE9FE"/>
      <circle cx="40" cy="40" r="4.5" fill="#ffffff"/>
    </svg>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const { logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Ajout de /messages dans les routes
  const routes = ["/home", "/accueil", "/profile", "/favorites", "/notifications", "/messages"];
  const activeIndex = routes.indexOf(pathname);
  const lineTop = 90 + activeIndex * 70;

  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res = await apiGet("/notifications/unread-count", token);
        setUnreadCount(res.count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className="side-nav">

      {/* Logo — caché sur mobile */}
      <div className="side-nav__logo" title="ShoraDream">
        <ShoraDreamLogo />
      </div>

      {activeIndex >= 0 && (
        <div className="side-nav__active-line" style={{ top: lineTop }} />
      )}

      <NavLink to="/home" className="side-nav__btn" title={t("nav_home") || "Home"}>
        <span className="side-nav__icon">🏠︎</span>
      </NavLink>

      <NavLink to="/accueil" className="side-nav__btn" title={t("feed_title") || "Publications"}>
        <span className="side-nav__icon">☰</span>
      </NavLink>

      <NavLink to="/profile" className="side-nav__btn" title={t("nav_profile") || "Profil"}>
        <span className="side-nav__icon">👤</span>
      </NavLink>

      <NavLink to="/favorites" className="side-nav__btn" title={t("nav_favorites") || "Favoris"}>
        <span className="side-nav__icon">★</span>
      </NavLink>

      {/* Notifications avec badge */}
      <NavLink
        to="/notifications"
        className="side-nav__btn"
        title={t("nav_notifications") || "Notifications"}
        style={{ position: "relative" }}
      >
        <span className="side-nav__icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </span>
        {unreadCount > 0 && (
          <span className="side-nav__badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </NavLink>

      {/* ✅ 💬 Messages */}
      <NavLink to="/messages" className="side-nav__btn" title="Mes messages">
        <span className="side-nav__icon">💬</span>
      </NavLink>

      <div className="side-nav__spacer" />

      {/* Langue — caché sur mobile */}
      <div className="side-nav__lang">
        <LanguageSwitcher />
      </div>

      <button
        className="side-nav__btn side-nav__btn--small"
        onClick={handleLogout}
        title={t("logout") || "Logout"}
      >
        🔚
      </button>
    </aside>
  );
}
