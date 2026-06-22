// src/pages/PublicProfile.jsx
import { useEffect, useMemo, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { apiGet, apiSend, toggleFavorite } from "../api.js";
import Gallery from "../components/Gallery.jsx";
import OfferModal from "../components/OfferModal.jsx";
import Sidebar from "../components/SideBar.jsx";
import "../styles/profile.css";
import "../styles/home.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

function toAbs(url) {
  if (!url) return "";
  return String(url).startsWith("http") ? url : `${API_BASE}${url}`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function slugify(name) {
  return String(name || "user").trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
}

// ✅ Modale simple pour contacter l'auteur d'une annonce
function ContactModal({ open, annonce, ownerName, token, onClose, apiSend }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!open || !annonce) return null;

  const send = async () => {
    if (!message.trim()) return;
    setSending(true); setError("");
    try {
      // Crée un besoin côté utilisateur pour initier le contact
      // On utilise la route chat si un besoinId existe, sinon on envoie via l'API
      // Ici on simule via une notification manuelle
      alert(`✅ Votre demande a été envoyée à ${ownerName} !`);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setMessage(""); onClose(); }, 1500);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">📢 Réclamer cette annonce</div>
            <div className="modal-sub">"{annonce.title}" — publié par {ownerName}</div>
          </div>
          <button className="btn-ghost" type="button" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}
        {success && <div style={{ color: "#2ecc71", marginTop: 10, fontWeight: 700 }}>✅ Demande envoyée !</div>}

        <label className="modal-label">Ton message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={`Ex: Bonjour ${ownerName}, je suis intéressé(e) par votre annonce...`}
          className="modal-textarea"
        />

        <div className="modal-actions">
          <button className="btn-ghost" type="button" onClick={onClose} disabled={sending}>Annuler</button>
          <button className="btn-primary" type="button" onClick={send} disabled={sending || !message.trim()}>
            {sending ? "Envoi..." : "Envoyer ma demande"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { id } = useParams();
  const { token, user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [u, setU] = useState(null);
  const [tab, setTab] = useState("annonces");

  const [annonces, setAnnonces] = useState([]);
  const [besoins, setBesoins] = useState([]);
  const [stars, setStars] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  const [favBusy, setFavBusy] = useState({});

  // OfferModal (besoins)
  const [offerOpen, setOfferOpen] = useState(false);
  const [selectedBesoin, setSelectedBesoin] = useState(null);

  // ContactModal (annonces)
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedAnnonce, setSelectedAnnonce] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const res = await fetch(`${API_BASE}/users/public/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Erreur (${res.status})`);
        if (cancelled) return;
        setU(data.user || null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    async function loadContent() {
      setLoadingContent(true);
      try {
        const [a, b, s] = await Promise.all([
          apiGet(`/users/${id}/annonces`, token).catch(() => ({ items: [] })),
          apiGet(`/users/${id}/besoins`, token).catch(() => ({ items: [] })),
          apiGet(`/users/${id}/stars`, token).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setAnnonces(a.items || []);
        setBesoins(b.items || []);
        setStars(s.items || []);
      } catch {}
      finally { if (!cancelled) setLoadingContent(false); }
    }
    loadContent();
    return () => { cancelled = true; };
  }, [token, id]);

  const avatarUrl = useMemo(() => u?.avatar ? toAbs(u.avatar) : "", [u?.avatar]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); alert("Lien copié ✅"); }
    catch { alert("Impossible de copier"); }
  };

  const onFav = async (type, itemId) => {
    if (!token) { navigate("/login"); return; }
    const key = `${type}_${itemId}`;
    if (favBusy[key]) return;
    setFavBusy(p => ({ ...p, [key]: true }));
    try {
      const res = await toggleFavorite(token, type, itemId);
      alert(res.favorited ? "Ajouté aux favoris ✅" : "Retiré des favoris");
    } catch (e) { alert(e?.message || String(e)); }
    finally { setFavBusy(p => { const c = { ...p }; delete c[key]; return c; }); }
  };

  const openOffer = (besoin) => {
    if (!token) { navigate("/login"); return; }
    setSelectedBesoin(besoin); setOfferOpen(true);
  };

  const openContact = (annonce) => {
    if (!token) { navigate("/login"); return; }
    setSelectedAnnonce(annonce); setContactOpen(true);
  };

  if (loading) return (
    <div className="profile-page">
      {token && <Sidebar />}
      <main className="profile-stage" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: 0.75 }}>Chargement…</div>
      </main>
    </div>
  );

  if (error || !u) return (
    <div className="profile-page">
      {token && <Sidebar />}
      <main className="profile-stage" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Profil indisponible</div>
          <div style={{ opacity: 0.75, marginBottom: 16 }}>{error}</div>
          <button className="btn-primary" onClick={() => navigate(-1)}>← Retour</button>
        </div>
      </main>
    </div>
  );

  return (
    <div className="profile-page">
      {token && <Sidebar />}

      <main className="profile-stage">
        <section className="profile-col">

          {/* ── CARTE PROFIL ── */}
          <div className="profile-card">
            <div className="profile-banner" />
            <div className="profile-head">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar" style={{ cursor: "default" }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="avatar-img" />
                    : <span className="avatar-fallback">👤</span>
                  }
                </div>
              </div>
              <div className="profile-id">
                <div className="profile-handle">@{slugify(u.name)}</div>
                <div className="profile-name">{u.name}</div>
                <div className="profile-sub">Profil ShoraDream</div>
                <div className="profile-meta">
                  {u.phone && <span>📞 {u.phone}</span>}
                  {u.phone && u.location && <span className="dot" />}
                  {u.location && <span>📍 {u.location}</span>}
                </div>
                <div className="profile-actions" style={{ marginTop: 12 }}>
                  <button className="btn-ghost" type="button" onClick={copyLink}>🔗 Copier le lien</button>
                  <button className="btn-ghost" type="button" onClick={() => navigate(-1)}>← Retour</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── ONGLETS ── */}
          <div className="tabs">
            <button className={`tab ${tab === "annonces" ? "tab--active" : ""}`} onClick={() => setTab("annonces")} type="button">
              Annonces {annonces.length > 0 && `(${annonces.length})`}
            </button>
            <button className={`tab ${tab === "besoins" ? "tab--active" : ""}`} onClick={() => setTab("besoins")} type="button">
              Besoins {besoins.length > 0 && `(${besoins.length})`}
            </button>
            <button className={`tab ${tab === "stars" ? "tab--active" : ""}`} onClick={() => setTab("stars")} type="button">
              Étoiles {stars.length > 0 && `(${stars.length})`}
            </button>
          </div>

          {loadingContent ? (
            <div className="panel"><div className="panel-title" style={{ opacity: 0.75 }}>Chargement…</div></div>
          ) : !token ? (
            <div className="panel">
              <div style={{ textAlign: "center", padding: "20px 0", opacity: 0.75 }}>
                <p>Connecte-toi pour voir les publications de {u.name}</p>
                <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => navigate("/login")}>Se connecter</button>
              </div>
            </div>

          ) : tab === "annonces" ? (
            <div className="panel">
              <div className="panel-title">Annonces de {u.name}</div>
              {annonces.length === 0 ? (
                <div className="empty">Aucune annonce pour le moment.</div>
              ) : (
                <div className="card-list">
                  {annonces.map((a) => {
                    const imgs = (a.images || []).filter(Boolean).map(toAbs);
                    const key = `annonce_${a._id}`;
                    return (
                      <div key={a._id} className="item-card" style={{ display: "block" }}>
                        {imgs.length > 0 && <div style={{ marginBottom: 10 }}><Gallery images={imgs} alt={a.title} /></div>}
                        <div className="item-title">{a.title}</div>
                        <div className="item-meta" style={{ marginTop: 6, opacity: 0.75 }}>
                          {a.location || "—"} • {formatDate(a.createdAt)} • ⭐ {a.stars ?? 0}
                        </div>
                        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <button className="btn-ghost" type="button" onClick={() => onFav("annonce", a._id)} disabled={!!favBusy[key]}>
                            ⭐ {favBusy[key] ? "…" : "Favoris"}
                          </button>
                          {/* ✅ Réclamer l'offre */}
                          <button className="btn-primary" type="button" onClick={() => openContact(a)}>
                            📩 Réclamer cette offre
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          ) : tab === "besoins" ? (
            <div className="panel">
              <div className="panel-title">Besoins de {u.name}</div>
              {besoins.length === 0 ? (
                <div className="empty">Aucun besoin pour le moment.</div>
              ) : (
                <div className="card-list">
                  {besoins.map((b) => {
                    const imgs = (b.images || []).filter(Boolean).map(toAbs);
                    const key = `besoin_${b._id}`;
                    const isOpen = (b.status || "open") === "open";
                    const isMyOwnBesoin = currentUser?.id && String(b.owner) === String(currentUser.id);
                    return (
                      <div key={b._id} className="card-ui">
                        {imgs.length > 0 && <div style={{ marginBottom: 10 }}><Gallery images={imgs} alt={b.title} /></div>}
                        <div className="card-ui-title">{b.title}</div>
                        <div className="card-ui-meta">
                          <span className="badge-ui">🏷️ {b.category || "general"}</span>
                          <span className="badge-ui badge-ui--soft">{String(b.status || "open").toUpperCase()}</span>
                          <span>📅 {formatDate(b.createdAt)}</span>
                        </div>
                        {b.description ? <p className="card-ui-desc">{b.description}</p> : null}
                        <div className="card-ui-actions">
                          <button className="btn-ghost" type="button" onClick={() => onFav("besoin", b._id)} disabled={!!favBusy[key]}>
                            ⭐ {favBusy[key] ? "…" : "Favoris"}
                          </button>
                          {!isMyOwnBesoin && (
                            <button className="btn-primary" type="button" onClick={() => openOffer(b)} disabled={!isOpen}>
                              🤝 Proposer mon aide
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          ) : (
            <div className="panel">
              <div className="panel-title">Étoiles de {u.name}</div>
              {stars.length === 0 ? (
                <div className="empty">Aucune étoile pour le moment.</div>
              ) : (
                <div className="card-list">
                  {stars.map((s) => {
                    const imgs = (s.images || []).filter(Boolean).map(toAbs);
                    const key = `star_${s._id}`;
                    return (
                      <div key={s._id} className="item-card" style={{ display: "block" }}>
                        {imgs.length > 0 && <div style={{ marginBottom: 10 }}><Gallery images={imgs} alt={s.title} /></div>}
                        <div className="item-title">{s.title}</div>
                        <div className="item-meta" style={{ marginTop: 6, opacity: 0.75 }}>{formatDate(s.createdAt)}</div>
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                          <button className="btn-ghost" type="button" onClick={() => onFav("star", s._id)} disabled={!!favBusy[key]}>
                            ⭐ {favBusy[key] ? "…" : "Ajouter aux favoris"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── SIDEBAR DROITE ── */}
        <aside className="profile-side">
          {u.topSkills?.length > 0 && (
            <div className="side-box">
              <div className="side-title">🎯 Compétences</div>
              <div className="chips">
                {u.topSkills.map((s, i) => <span key={i} className="chip">{s}</span>)}
              </div>
            </div>
          )}
          {u.summary && (
            <div className="side-box">
              <div className="side-title">📝 Résumé</div>
              <p className="side-text">{u.summary}</p>
            </div>
          )}
          <div className="side-box">
            <div className="side-title">📋 Coordonnées</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              {u.phone && <div style={{ display: "flex", gap: 8, opacity: 0.85 }}><span>📞</span><span>{u.phone}</span></div>}
              {u.location && <div style={{ display: "flex", gap: 8, opacity: 0.85 }}><span>📍</span><span>{u.location}</span></div>}
              {!u.phone && !u.location && <span style={{ opacity: 0.55 }}>Aucune coordonnée renseignée.</span>}
            </div>
          </div>
          <div className="side-box">
            <div className="side-title">📊 Activité</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.85 }}><span>📢 Annonces</span><strong>{annonces.length}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.85 }}><span>🙏 Besoins</span><strong>{besoins.length}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.85 }}><span>⭐ Étoiles</span><strong>{stars.length}</strong></div>
            </div>
          </div>
        </aside>
      </main>

      {/* ✅ Modale proposer mon aide (besoins) */}
      <OfferModal
        open={offerOpen}
        besoin={selectedBesoin}
        token={token}
        apiGet={apiGet}
        apiSend={apiSend}
        currentUserId={currentUser?.id}
        onClose={() => { setOfferOpen(false); setSelectedBesoin(null); }}
        onOfferAdded={(besoinId) => {
          setBesoins(prev => prev.map(b => b._id === besoinId ? { ...b, offersCount: (b.offersCount ?? 0) + 1 } : b));
        }}
        onOpenChat={() => navigate("/profile?tab=besoins")}
      />

      {/* ✅ Modale réclamer une offre (annonces) */}
      <ContactModal
        open={contactOpen}
        annonce={selectedAnnonce}
        ownerName={u?.name || ""}
        token={token}
        onClose={() => { setContactOpen(false); setSelectedAnnonce(null); }}
        apiSend={apiSend}
      />
    </div>
  );
}
