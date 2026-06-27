// src/pages/PublicProfile.jsx
import { useEffect, useMemo, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { apiGet, apiSend, toggleFavorite } from "../api.js";
import Gallery from "../components/Gallery.jsx";
import OfferModal from "../components/OfferModal.jsx";
import Sidebar from "../components/SideBar.jsx";
import "../styles/profile.css";

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

// ✅ Bouton étoile like
function LikeBtn({ count, liked, onLike, busy }) {
  return (
    <button
      type="button"
      onClick={onLike}
      disabled={busy}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 999,
        border: liked ? "1px solid rgba(255,210,0,0.6)" : "1px solid rgba(255,255,255,0.18)",
        background: liked ? "rgba(255,210,0,0.12)" : "rgba(255,255,255,0.06)",
        color: liked ? "#FFD700" : "rgba(255,255,255,0.85)",
        fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        boxShadow: liked ? "0 0 12px rgba(255,210,0,0.3)" : "none",
      }}
    >
      <span style={{ fontSize: 16, transition: "transform 0.2s", transform: liked ? "scale(1.2)" : "scale(1)" }}>
        {liked ? "⭐" : "☆"}
      </span>
      <span>{count}</span>
    </button>
  );
}

// ✅ Modale réclamer une annonce
function ReclamerModal({ open, annonce, ownerName, token, onClose }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  if (!open || !annonce) return null;

  const send = async () => {
    if (!message.trim()) { setError("Écris un message."); return; }
    setSending(true); setError("");
    try {
      // Crée un besoin de type "demande" pour contacter le propriétaire
      // Simple alert pour l'instant — tu peux brancher une vraie route plus tard
      await new Promise(r => setTimeout(r, 800));
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setMessage(""); onClose(); }, 1800);
    } catch (e) { setError(e?.message || String(e)); }
    finally { setSending(false); }
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

        {error   && <div className="modal-error">{error}</div>}
        {success && <div style={{ color: "#2ecc71", fontWeight: 700, margin: "10px 0", textAlign: "center" }}>✅ Demande envoyée à {ownerName} !</div>}

        {!success && (
          <>
            <label className="modal-label">Ton message à {ownerName}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Bonjour ${ownerName}, je suis intéressé(e) par votre annonce "${annonce.title}"...`}
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
        )}
      </div>
    </div>
  );
}

// ✅ Modale signalement
function ReportModal({ open, targetName, targetId, token, onClose }) {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const send = async () => {
    if (!reason.trim()) { setError("Indique une raison."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/users/${targetId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur");
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setReason(""); onClose(); }, 1800);
    } catch (e) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  };

  const reasons = ["Contenu inapproprié", "Spam ou arnaque", "Faux profil", "Harcèlement", "Autre"];

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title" style={{ color: "#ff6b6b" }}>🚨 Signaler {targetName}</div>
            <div className="modal-sub">Ce signalement sera examiné par notre équipe.</div>
          </div>
          <button className="btn-ghost" type="button" onClick={onClose}>✕</button>
        </div>
        {error   && <div className="modal-error">{error}</div>}
        {success && <div style={{ color: "#2ecc71", fontWeight: 700, margin: "10px 0" }}>✅ Signalement envoyé. Merci !</div>}
        {!success && (
          <>
            <label className="modal-label">Raison *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "10px 0" }}>
              {reasons.map(r => (
                <label key={r} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: 13, opacity: reason === r ? 1 : 0.7 }}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" type="button" onClick={onClose} disabled={loading}>Annuler</button>
              <button type="button" onClick={send} disabled={loading || !reason.trim()}
                style={{ background: "linear-gradient(90deg,#ff4d6d,#c9184a)", border: "none", borderRadius: 999, padding: "10px 16px", color: "white", fontWeight: 800, cursor: "pointer", fontSize: 13, opacity: loading || !reason.trim() ? 0.5 : 1 }}>
                {loading ? "Envoi…" : "🚨 Signaler"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { id } = useParams();
  const { token, user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [u, setU]             = useState(null);
  const [tab, setTab]         = useState("annonces");

  const [annonces, setAnnonces] = useState([]);
  const [besoins,  setBesoins]  = useState([]);
  const [stars,    setStars]    = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [favBusy,  setFavBusy]  = useState({});
  const [likeBusy, setLikeBusy] = useState({});

  // Modales
  const [offerOpen,   setOfferOpen]   = useState(false);
  const [selectedBesoin, setSelectedBesoin] = useState(null);
  const [reportOpen,  setReportOpen]  = useState(false);
  const [reclamerOpen, setReclamerOpen] = useState(false);
  const [selectedAnnonce, setSelectedAnnonce] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const res  = await fetch(`${API_BASE}/users/public/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Erreur (${res.status})`);
        if (!cancelled) setU(data.user || null);
      } catch (e) { if (!cancelled) setError(e?.message || String(e)); }
      finally { if (!cancelled) setLoading(false); }
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
          apiGet(`/users/${id}/besoins`,  token).catch(() => ({ items: [] })),
          apiGet(`/users/${id}/stars`,    token).catch(() => ({ items: [] })),
        ]);
        if (!cancelled) { setAnnonces(a.items||[]); setBesoins(b.items||[]); setStars(s.items||[]); }
      } catch {} finally { if (!cancelled) setLoadingContent(false); }
    }
    loadContent();
    return () => { cancelled = true; };
  }, [token, id]);

  const avatarUrl = useMemo(() => u?.avatar ? toAbs(u.avatar) : "", [u?.avatar]);
  const isOwnProfile = currentUser?.id && String(id) === String(currentUser.id);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); alert("Lien copié ✅"); }
    catch { alert("Impossible de copier"); }
  };

  // ✅ Toggle like
  const onLike = async (type, itemId) => {
    if (!token) { navigate("/login"); return; }
    const key = `${type}_${itemId}`;
    if (likeBusy[key]) return;
    setLikeBusy(p => ({ ...p, [key]: true }));
    try {
      const res  = await fetch(`${API_BASE}/like/${type}/${itemId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message);
      const { liked, count } = data;
      if (type === "annonce") setAnnonces(prev => prev.map(a => a._id === itemId ? { ...a, liked, likesCount: count } : a));
      if (type === "besoin")  setBesoins(prev  => prev.map(b => b._id === itemId ? { ...b, liked, likesCount: count } : b));
      if (type === "star")    setStars(prev    => prev.map(s => s._id === itemId ? { ...s, liked, likesCount: count } : s));
    } catch (e) { alert(e?.message || String(e)); }
    finally { setLikeBusy(p => { const c = { ...p }; delete c[key]; return c; }); }
  };

  const onFav = async (type, itemId) => {
    if (!token) { navigate("/login"); return; }
    const key = `fav_${type}_${itemId}`;
    if (favBusy[key]) return;
    setFavBusy(p => ({ ...p, [key]: true }));
    try {
      const res = await toggleFavorite(token, type, itemId);
      alert(res.favorited ? "Ajouté aux favoris ✅" : "Retiré des favoris");
    } catch (e) { alert(e?.message || String(e)); }
    finally { setFavBusy(p => { const c = { ...p }; delete c[key]; return c; }); }
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
                  {avatarUrl ? <img src={avatarUrl} alt="avatar" className="avatar-img" /> : <span className="avatar-fallback">👤</span>}
                </div>
              </div>
              <div className="profile-id">
                <div className="profile-handle">@{slugify(u.name)}</div>
                <div className="profile-name">{u.name}</div>
                <div className="profile-sub">Profil ShoraDream</div>
                <div className="profile-meta">
                  {u.phone    && <span>📞 {u.phone}</span>}
                  {u.phone && u.location && <span className="dot" />}
                  {u.location && <span>📍 {u.location}</span>}
                </div>
                <div className="profile-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
                  <button className="btn-ghost" type="button" onClick={copyLink}>🔗 Copier le lien</button>
                  <button className="btn-ghost" type="button" onClick={() => navigate(-1)}>← Retour</button>
                  {!isOwnProfile && token && (
                    <button className="btn-ghost" type="button" onClick={() => setReportOpen(true)}
                      style={{ borderColor: "rgba(255,80,80,0.4)", color: "rgba(255,120,120,0.9)" }}>
                      🚨 Signaler
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── ONGLETS ── */}
          <div className="tabs">
            <button className={`tab ${tab==="annonces"?"tab--active":""}`} onClick={() => setTab("annonces")} type="button">
              Annonces {annonces.length > 0 && `(${annonces.length})`}
            </button>
            <button className={`tab ${tab==="besoins"?"tab--active":""}`} onClick={() => setTab("besoins")} type="button">
              Besoins {besoins.length > 0 && `(${besoins.length})`}
            </button>
            <button className={`tab ${tab==="stars"?"tab--active":""}`} onClick={() => setTab("stars")} type="button">
              Étoiles {stars.length > 0 && `(${stars.length})`}
            </button>
          </div>

          {loadingContent ? (
            <div className="panel"><div style={{ opacity: 0.75 }}>Chargement…</div></div>
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
              {annonces.length === 0 ? <div className="empty">Aucune annonce.</div> : (
                <div className="card-list">
                  {annonces.map(a => {
                    const imgs = (a.images||[]).filter(Boolean).map(toAbs);
                    const lkey = `annonce_${a._id}`;
                    return (
                      <div key={a._id} className="item-card" style={{ display: "block" }}>
                        {imgs.length > 0 && <div style={{ marginBottom: 10, overflow: "visible" }}><Gallery images={imgs} alt={a.title} /></div>}
                        <div className="item-title">{a.title}</div>
                        <div className="item-meta" style={{ marginTop: 6, opacity: 0.75 }}>
                          {a.location||"—"} • {formatDate(a.createdAt)}
                        </div>
                        {/* ✅ Actions */}
                        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
                          <LikeBtn count={a.likesCount||0} liked={!!a.liked} onLike={() => onLike("annonce", a._id)} busy={!!likeBusy[lkey]} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-ghost" type="button" onClick={() => onFav("annonce", a._id)}>⭐ Favoris</button>
                            {!isOwnProfile && (
                              <button className="btn-primary" type="button" onClick={() => { setSelectedAnnonce(a); setReclamerOpen(true); }}>
                                📩 Réclamer l'offre
                              </button>
                            )}
                          </div>
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
              {besoins.length === 0 ? <div className="empty">Aucun besoin.</div> : (
                <div className="card-list">
                  {besoins.map(b => {
                    const imgs = (b.images||[]).filter(Boolean).map(toAbs);
                    const lkey = `besoin_${b._id}`;
                    const isOpen = (b.status||"open") === "open";
                    const isMyOwn = currentUser?.id && String(b.owner) === String(currentUser.id);
                    return (
                      <div key={b._id} className="card-ui">
                        {imgs.length > 0 && <div style={{ marginBottom: 10, overflow: "visible" }}><Gallery images={imgs} alt={b.title} /></div>}
                        <div className="card-ui-title">{b.title}</div>
                        <div className="card-ui-meta">
                          <span className="badge-ui">🏷️ {b.category||"general"}</span>
                          <span className="badge-ui badge-ui--soft">{String(b.status||"open").toUpperCase()}</span>
                          <span>📅 {formatDate(b.createdAt)}</span>
                        </div>
                        {b.description && <p className="card-ui-desc">{b.description}</p>}
                        {/* ✅ Actions */}
                        <div className="card-ui-actions" style={{ justifyContent: "space-between" }}>
                          <LikeBtn count={b.likesCount||0} liked={!!b.liked} onLike={() => onLike("besoin", b._id)} busy={!!likeBusy[lkey]} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-ghost" type="button" onClick={() => onFav("besoin", b._id)}>⭐ Favoris</button>
                            {!isMyOwn && (
                              <button className="btn-primary" type="button" onClick={() => { setSelectedBesoin(b); setOfferOpen(true); }} disabled={!isOpen}>
                                🤝 Proposer mon aide
                              </button>
                            )}
                          </div>
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
              {stars.length === 0 ? <div className="empty">Aucune étoile.</div> : (
                <div className="card-list">
                  {stars.map(s => {
                    const imgs = (s.images||[]).filter(Boolean).map(toAbs);
                    const lkey = `star_${s._id}`;
                    return (
                      <div key={s._id} className="item-card" style={{ display: "block" }}>
                        {imgs.length > 0 && <div style={{ marginBottom: 10, overflow: "visible" }}><Gallery images={imgs} alt={s.title} /></div>}
                        <div className="item-title">{s.title}</div>
                        <div className="item-meta" style={{ marginTop: 6, opacity: 0.75 }}>{formatDate(s.createdAt)}</div>
                        {/* ✅ Actions */}
                        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                          <LikeBtn count={s.likesCount||0} liked={!!s.liked} onLike={() => onLike("star", s._id)} busy={!!likeBusy[lkey]} />
                          <button className="btn-ghost" type="button" onClick={() => onFav("star", s._id)}>⭐ Favoris</button>
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
              <div className="chips">{u.topSkills.map((s,i)=><span key={i} className="chip">{s}</span>)}</div>
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
              {u.phone    && <div style={{ display: "flex", gap: 8, opacity: 0.85 }}><span>📞</span><span>{u.phone}</span></div>}
              {u.location && <div style={{ display: "flex", gap: 8, opacity: 0.85 }}><span>📍</span><span>{u.location}</span></div>}
              {!u.phone && !u.location && <span style={{ opacity: 0.55 }}>Aucune coordonnée.</span>}
            </div>
          </div>
          <div className="side-box">
            <div className="side-title">📊 Activité</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display:"flex", justifyContent:"space-between", opacity:0.85 }}><span>📢 Annonces</span><strong>{annonces.length}</strong></div>
              <div style={{ display:"flex", justifyContent:"space-between", opacity:0.85 }}><span>🙏 Besoins</span><strong>{besoins.length}</strong></div>
              <div style={{ display:"flex", justifyContent:"space-between", opacity:0.85 }}><span>⭐ Étoiles</span><strong>{stars.length}</strong></div>
            </div>
          </div>
        </aside>
      </main>

      {/* ── MODALES ── */}
      <OfferModal
        open={offerOpen} besoin={selectedBesoin} token={token}
        apiGet={apiGet} apiSend={apiSend} currentUserId={currentUser?.id}
        onClose={() => { setOfferOpen(false); setSelectedBesoin(null); }}
        onOfferAdded={besoinId => setBesoins(prev => prev.map(b => b._id===besoinId ? { ...b, offersCount:(b.offersCount??0)+1 } : b))}
        onOpenChat={() => navigate("/profile?tab=besoins")}
      />

      <ReclamerModal
        open={reclamerOpen} annonce={selectedAnnonce} ownerName={u?.name||""} token={token}
        onClose={() => { setReclamerOpen(false); setSelectedAnnonce(null); }}
      />

      <ReportModal
        open={reportOpen} targetName={u?.name||""} targetId={id} token={token}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}
