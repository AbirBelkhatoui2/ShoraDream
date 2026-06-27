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

// ✅ Avatar + nom cliquable
function OwnerInfo({ owner, navigate, t }) {
  const ownerId = owner?.id || owner?._id || null;
  const goToProfile = (e) => {
    e.stopPropagation();
    if (ownerId) navigate(`/u/${ownerId}`);
  };
  return (
    <div className="pub-user">
      <div className="pub-avatar" onClick={goToProfile} style={{ cursor: ownerId ? "pointer" : "default" }}>
        {owner?.avatar ? <img src={toAbs(owner.avatar)} alt="" /> : <span>👤</span>}
      </div>
      <div className="pub-user-meta">
        <div className="pub-name" onClick={goToProfile}
          style={{ cursor: ownerId ? "pointer" : "default", color: ownerId ? "#a78bfa" : "inherit" }}>
          {owner?.name || t("user")}
        </div>
        <div className="pub-mini">
          <span>📍 {owner?.location || "—"}</span>
        </div>
      </div>
    </div>
  );
}

// ✅ Bouton like étoile
function LikeBtn({ count, liked, onLike, busy }) {
  return (
    <button type="button" onClick={onLike} disabled={busy} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "6px 12px", borderRadius: 999,
      border: liked ? "1px solid rgba(255,210,0,0.6)" : "1px solid rgba(255,255,255,0.18)",
      background: liked ? "rgba(255,210,0,0.12)" : "rgba(255,255,255,0.06)",
      color: liked ? "#FFD700" : "rgba(255,255,255,0.85)",
      fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer",
      boxShadow: liked ? "0 0 10px rgba(255,210,0,0.25)" : "none",
      transition: "all 0.2s",
    }}>
      <span style={{ fontSize: 15, transition: "transform 0.2s", transform: liked ? "scale(1.2)" : "scale(1)" }}>
        {liked ? "⭐" : "☆"}
      </span>
      <span>{count}</span>
    </button>
  );
}

// ✅ Modale réclamer une annonce
function ReclamerModal({ open, annonce, ownerName, onClose }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open || !annonce) return null;

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 700));
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setMessage(""); onClose(); }, 1600);
    setSending(false);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">📩 Réclamer cette offre</div>
            <div className="modal-sub">"{annonce.title}" — par {ownerName}</div>
          </div>
          <button className="btn-ghost" type="button" onClick={onClose}>✕</button>
        </div>
        {success
          ? <div style={{ color: "#2ecc71", fontWeight: 700, textAlign: "center", padding: "14px 0" }}>
              ✅ Demande envoyée à {ownerName} !
            </div>
          : <>
              <label className="modal-label">Ton message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Bonjour ${ownerName}, je suis intéressé(e) par votre annonce...`}
                rows={4}
                style={{ width: "100%", padding: "12px", marginTop: 8, borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", color: "white", outline: "none", resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
              />
              <div className="modal-actions">
                <button className="btn-ghost" type="button" onClick={onClose} disabled={sending}>Annuler</button>
                <button className="btn-primary" type="button" onClick={send} disabled={sending || !message.trim()}>
                  {sending ? "Envoi…" : "📩 Envoyer"}
                </button>
              </div>
            </>
        }
      </div>
    </div>
  );
}

export default function Accueil() {
  const { token, user } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [annonces, setAnnonces] = useState([]);
  const [besoins,  setBesoins]  = useState([]);
  const [stars,    setStars]    = useState([]);
  const [filter,   setFilter]   = useState("all");
  const [favBusy,  setFavBusy]  = useState({});
  const [likeBusy, setLikeBusy] = useState({});

  // OfferModal
  const [offerOpen,      setOfferOpen]      = useState(false);
  const [selectedBesoin, setSelectedBesoin] = useState(null);

  // ReclamerModal
  const [reclamerOpen,  setReclamerOpen]  = useState(false);
  const [selectedAnn,   setSelectedAnn]   = useState(null);
  const [selectedOwner, setSelectedOwner] = useState("");

  // Recherche + pagination
  const [search,       setSearch]       = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  const locale = useMemo(() => {
    const lng = (i18n.language || "fr").split("-")[0];
    if (lng === "en") return "en-US";
    if (lng === "ar") return "ar";
    return "fr-FR";
  }, [i18n.language]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const data = await apiGet("/feed?limit=50", token);
        if (cancelled) return;
        setAnnonces(Array.isArray(data.annonces) ? data.annonces : []);
        setBesoins(Array.isArray(data.besoins)  ? data.besoins  : []);
        setStars(Array.isArray(data.stars)    ? data.stars    : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => { cancelled = true; };
  }, [token]);

  // Filtrage recherche
  const q = search.toLowerCase().trim();
  const filteredAnnonces = useMemo(() => annonces.filter(a =>
    !q || a.title?.toLowerCase().includes(q) || a.owner?.name?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q)
  ), [annonces, q]);
  const filteredBesoins = useMemo(() => besoins.filter(b =>
    !q || b.title?.toLowerCase().includes(q) || b.ownerPublic?.name?.toLowerCase().includes(q) || b.category?.toLowerCase().includes(q)
  ), [besoins, q]);
  const filteredStars = useMemo(() => stars.filter(s =>
    !q || s.title?.toLowerCase().includes(q) || s.owner?.name?.toLowerCase().includes(q)
  ), [stars, q]);

  const counts = useMemo(() => ({
    all: filteredAnnonces.length + filteredBesoins.length + filteredStars.length,
    annonces: filteredAnnonces.length, besoins: filteredBesoins.length, stars: filteredStars.length,
  }), [filteredAnnonces.length, filteredBesoins.length, filteredStars.length]);

  const showAnnonces = filter === "all" || filter === "annonces";
  const showBesoins  = filter === "all" || filter === "besoins";
  const showStars    = filter === "all" || filter === "stars";

  useEffect(() => { setVisibleCount(10); }, [filter, search]);

  const favKey  = (type, id) => `${type}:${id}`;
  const likeKey = (type, id) => `like_${type}_${id}`;

  const onFav = async (type, id) => {
    if (!token || !id) return;
    const key = favKey(type, id);
    if (favBusy[key]) return;
    setFavBusy(p => ({ ...p, [key]: true }));
    try {
      const res = await toggleFavorite(token, type, id);
      alert(res?.favorited ? t("fav_added") : t("fav_removed"));
    } catch (e) { alert(e?.message || String(e)); }
    finally { setFavBusy(p => { const c = { ...p }; delete c[key]; return c; }); }
  };

  // ✅ Toggle like
  const onLike = async (type, id) => {
    if (!token) return;
    const key = likeKey(type, id);
    if (likeBusy[key]) return;
    setLikeBusy(p => ({ ...p, [key]: true }));
    try {
      const res  = await fetch(`${API_BASE}/like/${type}/${id}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message);
      const { liked, count } = data;
      const upd = arr => arr.map(x => x._id === id ? { ...x, liked, likesCount: count } : x);
      if (type === "annonce") setAnnonces(upd);
      if (type === "besoin")  setBesoins(upd);
      if (type === "star")    setStars(upd);
    } catch (e) { console.error(e); }
    finally { setLikeBusy(p => { const c = { ...p }; delete c[key]; return c; }); }
  };

  const openOffer = (besoin) => { setSelectedBesoin(besoin); setOfferOpen(true); };

  const openReclamer = (annonce, ownerName) => {
    setSelectedAnn(annonce);
    setSelectedOwner(ownerName);
    setReclamerOpen(true);
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
            <span className="accueil-pill">📰 {counts.all} publication{counts.all > 1 ? "s" : ""}</span>
            <span className="accueil-pill">👤 {user?.name || t("user")}</span>
          </div>
        </header>

        {/* Barre de recherche */}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="search-input" type="text"
            placeholder="Rechercher par titre, nom, lieu, catégorie…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" type="button" onClick={() => setSearch("")}>✕</button>}
        </div>

        {/* Filtres */}
        <div className="filter-bar">
          {[
            { key: "all",      label: t("feed_filter_all"),   count: counts.all },
            { key: "annonces", label: t("feed_filter_ads"),   count: counts.annonces },
            { key: "besoins",  label: t("feed_filter_needs"), count: counts.besoins },
            { key: "stars",    label: t("feed_filter_stars"), count: counts.stars },
          ].map(({ key, label, count }) => (
            <button key={key} type="button"
              className={`filter-btn ${filter === key ? "filter-btn--active" : ""}`}
              onClick={() => setFilter(key)}>
              {label} <span className="filter-count">{count}</span>
            </button>
          ))}
        </div>

        {error && <div className="accueil-error">{error}</div>}

        {/* Aucun résultat */}
        {!loading && search && counts.all === 0 && (
          <div className="accueil-panel" style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Aucun résultat pour "{search}"</div>
            <button className="btn-ghost" style={{ marginTop: 14 }} onClick={() => setSearch("")}>Effacer</button>
          </div>
        )}

        {loading ? (
          <div className="accueil-panel">{t("loading")}</div>
        ) : counts.all === 0 && !search ? (
          <div className="accueil-panel">{t("feed_empty_all")}</div>
        ) : counts.all > 0 && (
          <div className="accueil-grid">

            {/* ── ANNONCES ── */}
            {showAnnonces && filteredAnnonces.length > 0 && (
              <section className="accueil-card">
                <div className="accueil-card-head">
                  <div className="accueil-card-title">{t("feed_ads")}</div>
                  <div className="accueil-card-count">{filteredAnnonces.length}</div>
                </div>
                <div className="accueil-list">
                  {filteredAnnonces.slice(0, visibleCount).map(a => {
                    const owner  = a.owner || {};
                    const images = (a.images || []).filter(Boolean).map(toAbs);
                    const lkey   = likeKey("annonce", a._id);
                    const fkey   = favKey("annonce", a._id);
                    return (
                      <article key={a._id} className="pub-item">
                        <div className="pub-top">
                          <OwnerInfo owner={owner} navigate={navigate} t={t} />
                          <span className="pub-status">{String(a.status || "active").toUpperCase()}</span>
                        </div>
                        <div className="pub-mini" style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                          <span>📅 {formatDate(a.createdAt, locale)}</span>
                        </div>
                        <div className="pub-title">{a.title}</div>
                        {images.length ? <div className="pub-gallery"><Gallery images={images} alt={a.title} /></div> : null}

                        {/* ✅ Actions : like + favoris + réclamer */}
                        <div className="pub-footer" style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
                          <LikeBtn count={a.likesCount || 0} liked={!!a.liked} onLike={() => onLike("annonce", a._id)} busy={!!likeBusy[lkey]} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-ghost" type="button" onClick={() => onFav("annonce", a._id)} disabled={!!favBusy[fkey]}>
                              ⭐ {favBusy[fkey] ? t("fav_busy") : t("add_favorite")}
                            </button>
                            {/* ✅ Bouton réclamer */}
                            <button className="btn-primary" type="button" onClick={() => openReclamer(a, owner?.name || t("user"))}>
                              📩 Réclamer l'offre
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {filteredAnnonces.length > visibleCount && (
                    <button className="load-more-btn" type="button" onClick={() => setVisibleCount(v => v + 10)}>
                      Charger plus ({filteredAnnonces.length - visibleCount} restants)
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* ── BESOINS ── */}
            {showBesoins && filteredBesoins.length > 0 && (
              <section className="accueil-card">
                <div className="accueil-card-head">
                  <div className="accueil-card-title">{t("feed_needs")}</div>
                  <div className="accueil-card-count">{filteredBesoins.length}</div>
                </div>
                <div className="accueil-list">
                  {filteredBesoins.slice(0, visibleCount).map(b => {
                    const owner  = b.ownerPublic || {};
                    const images = (b.images || []).filter(Boolean).map(toAbs);
                    const lkey   = likeKey("besoin", b._id);
                    const fkey   = favKey("besoin", b._id);
                    const isOpen = (b.status || "open") === "open";
                    return (
                      <article key={b._id} className="pub-item">
                        <div className="pub-top">
                          <OwnerInfo owner={owner} navigate={navigate} t={t} />
                          <span className="pub-status">{String(b.status || "open").toUpperCase()}</span>
                        </div>
                        <div className="pub-mini" style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                          <span>📅 {formatDate(b.createdAt, locale)}</span>
                        </div>
                        <div className="pub-title">{b.title}</div>
                        {images.length ? <div className="pub-gallery"><Gallery images={images} alt={b.title} /></div> : null}

                        {/* ✅ Actions : like + catégorie + favoris + proposer */}
                        <div className="pub-footer" style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <LikeBtn count={b.likesCount || 0} liked={!!b.liked} onLike={() => onLike("besoin", b._id)} busy={!!likeBusy[lkey]} />
                            <span className="pub-chip">🏷️ {b.category || "general"}</span>
                            <span className="pub-chip">🤝 {b.offersCount ?? 0}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-ghost" type="button" onClick={() => onFav("besoin", b._id)} disabled={!!favBusy[fkey]}>
                              ⭐ {favBusy[fkey] ? t("fav_busy") : t("add_favorite")}
                            </button>
                            <button className="btn-primary" type="button" onClick={() => openOffer(b)} disabled={!isOpen}>
                              {t("propose_help")}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {filteredBesoins.length > visibleCount && (
                    <button className="load-more-btn" type="button" onClick={() => setVisibleCount(v => v + 10)}>
                      Charger plus ({filteredBesoins.length - visibleCount} restants)
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* ── STARS ── */}
            {showStars && filteredStars.length > 0 && (
              <section className="accueil-card">
                <div className="accueil-card-head">
                  <div className="accueil-card-title">{t("feed_stars")}</div>
                  <div className="accueil-card-count">{filteredStars.length}</div>
                </div>
                <div className="accueil-list">
                  {filteredStars.slice(0, visibleCount).map(s => {
                    const owner  = s.owner || {};
                    const images = (s.images || []).filter(Boolean).map(toAbs);
                    const lkey   = likeKey("star", s._id);
                    const fkey   = favKey("star", s._id);
                    return (
                      <article key={s._id} className="pub-item">
                        <div className="pub-top">
                          <OwnerInfo owner={owner} navigate={navigate} t={t} />
                        </div>
                        <div className="pub-mini" style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                          <span>📅 {formatDate(s.createdAt, locale)}</span>
                        </div>
                        <div className="pub-title">{s.title}</div>
                        {images.length ? <div className="pub-gallery"><Gallery images={images} alt={s.title} /></div> : null}

                        {/* ✅ Actions : like + favoris */}
                        <div className="pub-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <LikeBtn count={s.likesCount || 0} liked={!!s.liked} onLike={() => onLike("star", s._id)} busy={!!likeBusy[lkey]} />
                          <button className="btn-ghost" type="button" onClick={() => onFav("star", s._id)} disabled={!!favBusy[fkey]}>
                            ⭐ {favBusy[fkey] ? t("fav_busy") : t("add_favorite")}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {filteredStars.length > visibleCount && (
                    <button className="load-more-btn" type="button" onClick={() => setVisibleCount(v => v + 10)}>
                      Charger plus ({filteredStars.length - visibleCount} restants)
                    </button>
                  )}
                </div>
              </section>
            )}

          </div>
        )}
      </main>

      {/* Modale offre */}
      <OfferModal
        open={offerOpen} besoin={selectedBesoin} token={token}
        apiGet={apiGet} apiSend={apiSend} currentUserId={user?.id}
        onClose={() => { setOfferOpen(false); setSelectedBesoin(null); }}
        onOfferAdded={besoinId => setBesoins(prev => prev.map(b => b._id === besoinId ? { ...b, offersCount: (b.offersCount ?? 0) + 1 } : b))}
        onOpenChat={() => navigate("/profile?tab=besoins")}
      />

      {/* ✅ Modale réclamer */}
      <ReclamerModal
        open={reclamerOpen}
        annonce={selectedAnn}
        ownerName={selectedOwner}
        onClose={() => { setReclamerOpen(false); setSelectedAnn(null); setSelectedOwner(""); }}
      />
    </div>
  );
}
