// src/pages/Accueil.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/SideBar.jsx";
import Gallery from "../components/Gallery.jsx";
import OfferModal from "../components/OfferModal.jsx";
import "../styles/accueil.css";

import { AuthContext } from "../context/AuthContext.jsx";
import { apiGet, apiSend, toggleFavorite } from "../api.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

function toAbs(url) {
  if (!url) return "";
  return String(url).startsWith("http") ? url : `${API_BASE}${url}`;
}

function formatDate(iso, locale = "fr-FR") {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

export default function Accueil() {
  const { token, user } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [annonces, setAnnonces] = useState([]);
  const [besoins, setBesoins] = useState([]);
  const [stars, setStars] = useState([]);
  const [filter, setFilter] = useState("all");
  const [favBusy, setFavBusy] = useState({});

  // ✅ OfferModal state
  const [offerOpen, setOfferOpen] = useState(false);
  const [selectedBesoin, setSelectedBesoin] = useState(null);

  const locale = useMemo(() => {
    const lng = (i18n.language || "fr").split("-")[0];
    if (lng === "en") return "en-US";
    if (lng === "ar") return "ar";
    return "fr-FR";
  }, [i18n.language]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiGet("/feed?limit=30", token);
        if (cancelled) return;
        setAnnonces(Array.isArray(data.annonces) ? data.annonces : []);
        setBesoins(Array.isArray(data.besoins) ? data.besoins : []);
        setStars(Array.isArray(data.stars) ? data.stars : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => { cancelled = true; };
  }, [token]);

  const counts = useMemo(() => ({
    all: annonces.length + besoins.length + stars.length,
    annonces: annonces.length,
    besoins: besoins.length,
    stars: stars.length,
  }), [annonces.length, besoins.length, stars.length]);

  const showAnnonces = filter === "all" || filter === "annonces";
  const showBesoins = filter === "all" || filter === "besoins";
  const showStars = filter === "all" || filter === "stars";

  const favKey = (type, id) => `${type}:${id}`;

  const onFav = async (type, id) => {
    if (!token || !id) return;
    const key = favKey(type, id);
    if (favBusy[key]) return;
    setFavBusy((p) => ({ ...p, [key]: true }));
    try {
      const res = await toggleFavorite(token, type, id);
      if (res?.favorited) alert(t("fav_added"));
      else alert(t("fav_removed"));
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setFavBusy((p) => { const copy = { ...p }; delete copy[key]; return copy; });
    }
  };

  // ✅ Ouvrir la modale d'offre
  const openOffer = (besoin) => {
    setSelectedBesoin(besoin);
    setOfferOpen(true);
  };

  return (
    <div className="accueil-page">
      <Sidebar />

      <main className="accueil-stage">
        <header className="accueil-head">
          <div>
            <h1 className="accueil-title">{t("feed_title")}</h1>
            <p className="accueil-sub">{t("feed_subtitle")}</p>
          </div>
          <div className="accueil-badges">
            <span className="accueil-pill">📰 {t("feed_tab_all")}</span>
            <span className="accueil-pill">👤 {user?.name || t("user")}</span>
          </div>
        </header>

        {/* FILTER BAR */}
        <div className="filter-bar">
          {[
            { key: "all", label: t("feed_filter_all"), count: counts.all },
            { key: "annonces", label: t("feed_filter_ads"), count: counts.annonces },
            { key: "besoins", label: t("feed_filter_needs"), count: counts.besoins },
            { key: "stars", label: t("feed_filter_stars"), count: counts.stars },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              className={`filter-btn ${filter === key ? "filter-btn--active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label} <span className="filter-count">{count}</span>
            </button>
          ))}
        </div>

        {error ? <div className="accueil-error">{error}</div> : null}

        {loading ? (
          <div className="accueil-panel">{t("loading")}</div>
        ) : counts.all === 0 ? (
          <div className="accueil-panel">{t("feed_empty_all")}</div>
        ) : (
          <div className="accueil-grid">

            {/* ── ANNONCES ── */}
            {showAnnonces && (
              <section className="accueil-card">
                <div className="accueil-card-head">
                  <div className="accueil-card-title">{t("feed_ads")}</div>
                  <div className="accueil-card-count">{annonces.length}</div>
                </div>
                {annonces.length === 0 ? (
                  <div className="accueil-empty">{t("feed_empty_ads")}</div>
                ) : (
                  <div className="accueil-list">
                    {annonces.map((a) => {
                      const owner = a.owner || {};
                      const images = (a.images || []).filter(Boolean).map(toAbs);
                      const key = favKey("annonce", a._id);
                      return (
                        <article key={a._id} className="pub-item">
                          <div className="pub-top">
                            <div className="pub-user">
                              <div className="pub-avatar">
                                {owner.avatar ? <img src={toAbs(owner.avatar)} alt="" /> : <span>👤</span>}
                              </div>
                              <div className="pub-user-meta">
                                <div className="pub-name">{owner.name || t("user")}</div>
                                <div className="pub-mini">
                                  <span>📍 {owner.location || a.location || "—"}</span>
                                  <span className="dot" />
                                  <span>📅 {formatDate(a.createdAt, locale)}</span>
                                </div>
                              </div>
                            </div>
                            <span className="pub-status">{String(a.status || "active").toUpperCase()}</span>
                          </div>
                          <div className="pub-title">{a.title}</div>
                          {images.length ? <div className="pub-gallery"><Gallery images={images} alt={a.title} /></div> : null}
                          <div className="pub-footer" style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                            <span className="pub-chip">⭐ {a.stars ?? 0}</span>
                            <button className="btn-ghost" type="button" onClick={() => onFav("annonce", a._id)} disabled={!!favBusy[key]}>
                              ⭐ {favBusy[key] ? t("fav_busy") : t("add_favorite")}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ── BESOINS ── */}
            {showBesoins && (
              <section className="accueil-card">
                <div className="accueil-card-head">
                  <div className="accueil-card-title">{t("feed_needs")}</div>
                  <div className="accueil-card-count">{besoins.length}</div>
                </div>
                {besoins.length === 0 ? (
                  <div className="accueil-empty">{t("feed_empty_needs")}</div>
                ) : (
                  <div className="accueil-list">
                    {besoins.map((b) => {
                      const owner = b.ownerPublic || {};
                      const images = (b.images || []).filter(Boolean).map(toAbs);
                      const key = favKey("besoin", b._id);
                      const isOpen = (b.status || "open") === "open";
                      return (
                        <article key={b._id} className="pub-item">
                          <div className="pub-top">
                            <div className="pub-user">
                              <div className="pub-avatar">
                                {owner.avatar ? <img src={toAbs(owner.avatar)} alt="" /> : <span>👤</span>}
                              </div>
                              <div className="pub-user-meta">
                                <div className="pub-name">{owner.name || t("user")}</div>
                                <div className="pub-mini">
                                  <span>📍 {owner.location || b.location || "—"}</span>
                                  <span className="dot" />
                                  <span>📅 {formatDate(b.createdAt, locale)}</span>
                                </div>
                              </div>
                            </div>
                            <span className="pub-status">{String(b.status || "open").toUpperCase()}</span>
                          </div>

                          <div className="pub-title">{b.title}</div>

                          {images.length ? <div className="pub-gallery"><Gallery images={images} alt={b.title} /></div> : null}

                          <div className="pub-footer" style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <span className="pub-chip">🏷️ {b.category || "general"}</span>
                              <span className="pub-chip">🤝 {b.offersCount ?? 0}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="btn-ghost" type="button"
                                onClick={() => onFav("besoin", b._id)}
                                disabled={!!favBusy[key]}
                              >
                                ⭐ {favBusy[key] ? t("fav_busy") : t("add_favorite")}
                              </button>
                              {/* ✅ Bouton Proposer mon aide */}
                              <button
                                className="btn-primary" type="button"
                                onClick={() => openOffer(b)}
                                disabled={!isOpen}
                                title={!isOpen ? "Ce besoin est fermé" : ""}
                              >
                                {t("propose_help")}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ── STARS ── */}
            {showStars && (
              <section className="accueil-card">
                <div className="accueil-card-head">
                  <div className="accueil-card-title">{t("feed_stars")}</div>
                  <div className="accueil-card-count">{stars.length}</div>
                </div>
                {stars.length === 0 ? (
                  <div className="accueil-empty">{t("feed_empty_stars")}</div>
                ) : (
                  <div className="accueil-list">
                    {stars.map((s) => {
                      const owner = s.owner || {};
                      const images = (s.images || []).filter(Boolean).map(toAbs);
                      const key = favKey("star", s._id);
                      return (
                        <article key={s._id} className="pub-item">
                          <div className="pub-top">
                            <div className="pub-user">
                              <div className="pub-avatar">
                                {owner.avatar ? <img src={toAbs(owner.avatar)} alt="" /> : <span>👤</span>}
                              </div>
                              <div className="pub-user-meta">
                                <div className="pub-name">{owner.name || t("user")}</div>
                                <div className="pub-mini">
                                  <span>📍 {owner.location || "—"}</span>
                                  <span className="dot" />
                                  <span>📅 {formatDate(s.createdAt, locale)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="pub-title">{s.title}</div>
                          {images.length ? <div className="pub-gallery"><Gallery images={images} alt={s.title} /></div> : null}
                          <div className="pub-footer" style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" type="button" onClick={() => onFav("star", s._id)} disabled={!!favBusy[key]}>
                              ⭐ {favBusy[key] ? t("fav_busy") : t("add_favorite")}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

          </div>
        )}
      </main>

      {/* ✅ Modale proposition d'aide */}
      <OfferModal
        open={offerOpen}
        besoin={selectedBesoin}
        token={token}
        apiGet={apiGet}
        apiSend={apiSend}
        currentUserId={user?.id}
        onClose={() => { setOfferOpen(false); setSelectedBesoin(null); }}
        onOfferAdded={(besoinId) => {
          setBesoins((prev) =>
            prev.map((b) => b._id === besoinId ? { ...b, offersCount: (b.offersCount ?? 0) + 1 } : b)
          );
        }}
        onOpenChat={() => navigate("/profile?tab=besoins")}
      />
    </div>
  );
}
