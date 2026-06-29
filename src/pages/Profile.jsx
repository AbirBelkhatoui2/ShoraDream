// src/pages/Profile.jsx (COMPLET + suppression de compte + delete annonces/besoins)
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/SideBar.jsx";
import "../styles/profile.css";
import { AuthContext } from "../context/AuthContext.jsx";
import { apiGet, apiSend } from "../api.js";
import { Camera } from "lucide-react";
import { BesoinsList } from "../components/BesoinsList.jsx";
import OfferModal from "../components/OfferModal.jsx";
import ChatModal from "../components/ChatModal.jsx";
import MultiImageUploader from "../components/MultiImageUploader.jsx";
import Gallery from "../components/Gallery.jsx";
import { useTranslation } from "react-i18next";
import starsBg from "../assets/stars-bg.jpg";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

export default function Profile() {
  const { user, token, logout, updateUser } = useContext(AuthContext);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "annonces";
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [annonces, setAnnonces] = useState([]);
  const [besoins, setBesoins] = useState([]);
  const [publicBesoins, setPublicBesoins] = useState([]);
  const [stars, setStars] = useState([]);
  const [newStarTitle, setNewStarTitle] = useState("");
  const [starImages, setStarImages] = useState([]);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [pfName, setPfName] = useState(user?.name || "");
  const [pfEmail, setPfEmail] = useState(user?.email || "");
  const [pfPhone, setPfPhone] = useState(user?.phone || "");
  const [pfLocation, setPfLocation] = useState(user?.location || "");
  const [pfTopSkills, setPfTopSkills] = useState(Array.isArray(user?.topSkills) ? user.topSkills.join(", ") : "");
  const [pfSummary, setPfSummary] = useState(user?.summary || "");
  const [pfSaving, setPfSaving] = useState(false);
  const [pfError, setPfError] = useState("");

  // Suppression de compte
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setPfName(user?.name || "");
    setPfEmail(user?.email || "");
    setPfPhone(user?.phone || "");
    setPfLocation(user?.location || "");
    setPfTopSkills(Array.isArray(user?.topSkills) ? user.topSkills.join(", ") : "");
    setPfSummary(user?.summary || "");
  }, [user?.name, user?.email, user?.phone, user?.location, user?.topSkills, user?.summary]);

  const saveProfile = async () => {
    setPfError("");
    const name = String(pfName || "").trim();
    const email = String(pfEmail || "").trim().toLowerCase();
    const phone = String(pfPhone || "").trim();
    const location = String(pfLocation || "").trim();
    const topSkills = String(pfTopSkills || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);
    const summary = String(pfSummary || "").trim();
    if (!name) return setPfError(t("err_name_required"));
    if (!email) return setPfError(t("err_email_required"));
    setPfSaving(true);
    try {
      const res = await apiSend("/users/me", "PUT", token, { name, email, phone, location, topSkills, summary });
      updateUser({ id: res.user.id, name: res.user.name, email: res.user.email, phone: res.user.phone || "", location: res.user.location || "", avatar: res.user.avatar || "", topSkills: Array.isArray(res.user.topSkills) ? res.user.topSkills : [], summary: res.user.summary || "" });
      setEditProfileOpen(false);
    } catch (e) {
      setPfError(e?.message || String(e));
    } finally {
      setPfSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (!deletePassword) { setDeleteError("Saisis ton mot de passe pour confirmer."); return; }
    setDeleteLoading(true);
    try {
      await apiSend("/users/me/delete", "DELETE", token, { password: deletePassword });
      logout();
      navigate("/login");
    } catch (e) {
      setDeleteError(e?.message || String(e));
    } finally {
      setDeleteLoading(false);
    }
  };

  const shareProfile = async () => {
    const id = user?.id;
    if (!id) return;
    const url = `${window.location.origin}/u/${id}`;
    try {
      if (navigator.share) { await navigator.share({ title: t("share_profile_title"), text: `${t("share_profile_text")} : ${url}`, url }); return; }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      alert(t("link_copied"));
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      alert(t("link_copied"));
    }
  };

  const createStar = async () => {
    const title = String(newStarTitle || "").trim();
    if (!title) return setError(t("err_title_required"));
    if (starImages.length > 4) return setError(t("err_max_4_images"));
    try {
      setError("");
      const fd = new FormData();
      fd.append("title", title);
      starImages.forEach((f) => fd.append("images", f));
      const res = await apiSend("/stars", "POST", token, fd);
      setStars((prev) => [res.item, ...prev]);
      setNewStarTitle(""); setStarImages([]);
    } catch (e) { setError(e?.message || String(e)); }
  };

  const deleteStar = async (id) => {
    if (!id || !confirm(t("confirm_delete_star"))) return;
    try {
      setError("");
      await apiSend(`/stars/${id}`, "DELETE", token, null);
      setStars((prev) => prev.filter((s) => s._id !== id));
    } catch (e) { setError(e?.message || String(e)); }
  };

  // ✅ Supprimer annonce
  const deleteAnnonce = async (id) => {
    if (!id || !confirm(t("confirm_delete"))) return;
    try {
      setError("");
      await apiSend(`/annonces/${id}`, "DELETE", token, null);
      setAnnonces((prev) => prev.filter((a) => a._id !== id));
    } catch (e) { setError(e?.message || String(e)); }
  };

  // ✅ Supprimer besoin
  const deleteBesoin = async (id) => {
    if (!id || !confirm(t("confirm_delete"))) return;
    try {
      setError("");
      await apiSend(`/besoins/${id}`, "DELETE", token, null);
      setBesoins((prev) => prev.filter((b) => b._id !== id));
    } catch (e) { setError(e?.message || String(e)); }
  };

  const [newAnnonceTitle, setNewAnnonceTitle] = useState("");
  const [newBesoinTitle, setNewBesoinTitle] = useState("");
  const [annonceImages, setAnnonceImages] = useState([]);
  const [besoinImages, setBesoinImages] = useState([]);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarAction, setShowAvatarAction] = useState(false);
  const fileRef = useRef(null);

  const avatarUrl = useMemo(() => {
    if (!user?.avatar) return "";
    if (user.avatar.startsWith("http")) return user.avatar;
    return `${API_BASE}${user.avatar}`;
  }, [user?.avatar]);

  const currentUserId = user?.id;

  const [offerOpen, setOfferOpen] = useState(false);
  const [selectedBesoin, setSelectedBesoin] = useState(null);
  const openOfferModal = (besoin) => { setSelectedBesoin(besoin); setOfferOpen(true); };
  const closeOfferModal = () => { setOfferOpen(false); setSelectedBesoin(null); };

  const [chatOpen, setChatOpen] = useState(false);
  const [chatBesoin, setChatBesoin] = useState(null);
  const [chatOffer, setChatOffer] = useState(null);
  const openChat = (besoin, offer) => { setChatBesoin(besoin); setChatOffer(offer || null); setChatOpen(true); };
  const closeChat = () => { setChatOpen(false); setChatBesoin(null); setChatOffer(null); };

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(""); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const [a, b, p, s] = await Promise.all([
          apiGet("/annonces/mine", token),
          apiGet("/besoins/mine", token),
          apiGet("/besoins", token),
          apiGet("/stars/mine", token),
        ]);
        if (cancelled) return;
        setAnnonces(a.items || []);
        setBesoins(b.items || []);
        setPublicBesoins(p.items || []);
        setStars(s.items || []);

        const params = new URLSearchParams(location.search);
        const openChatId = params.get("openChat");
        const openOfferId = params.get("openOffer");

        if (openChatId) {
          const allBesoins = [...(b.items || []), ...(p.items || [])];
          const targetBesoin = allBesoins.find(x => String(x._id) === openChatId);
          if (targetBesoin) {
            try {
              const offersRes = await apiGet(`/besoins/${openChatId}/offers`, token);
              openChat(targetBesoin, offersRes.items?.[0] || null);
            } catch { openChat(targetBesoin, null); }
          }
        }
        if (openOfferId) {
          const allBesoins = [...(b.items || []), ...(p.items || [])];
          const targetBesoin = allBesoins.find(x => String(x._id) === openOfferId);
          if (targetBesoin) openOfferModal(targetBesoin);
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e?.message || String(e);
        setError(msg);
        if (String(msg).toLowerCase().includes("token")) logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => { cancelled = true; };
  }, [token, logout]);

  const createAnnonce = async () => {
    if (!newAnnonceTitle.trim()) return;
    try {
      setError("");
      const fd = new FormData();
      fd.append("title", newAnnonceTitle.trim());
      fd.append("location", user?.location || "");
      fd.append("stars", "5");
      fd.append("status", "active");
      annonceImages.forEach((file) => fd.append("images", file));
      const res = await apiSend("/annonces", "POST", token, fd);
      setAnnonces((prev) => [res.item, ...prev]);
      setNewAnnonceTitle(""); setAnnonceImages([]);
    } catch (e) { setError(e?.message || String(e)); }
  };

  const createBesoin = async () => {
    if (!newBesoinTitle.trim()) return;
    try {
      setError("");
      const fd = new FormData();
      fd.append("title", newBesoinTitle.trim());
      fd.append("location", user?.location || "");
      fd.append("category", "general");
      fd.append("priority", "high");
      fd.append("status", "open");
      besoinImages.forEach((file) => fd.append("images", file));
      const res = await apiSend("/besoins", "POST", token, fd);
      setBesoins((prev) => [res.item, ...prev]);
      setNewBesoinTitle(""); setBesoinImages([]);
    } catch (e) { setError(e?.message || String(e)); }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) { setError(t("choose_image_first")); return; }
    if (!token) { setError(t("missing_token")); return; }
    setUploadingAvatar(true); setError("");
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const res = await fetch(`${API_BASE}/users/avatar`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Erreur upload (${res.status})`);
      updateUser({ avatar: data.avatar });
      setAvatarFile(null); setAvatarPreview(""); setShowAvatarAction(false);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const shownSkills = Array.isArray(user?.topSkills) ? user.topSkills : [];
  const shownSummary = String(user?.summary || "").trim();

  return (
    <div className="profile-page">
      <Sidebar />
      <div className="profile__bg" style={{ backgroundImage: `url(${starsBg})` }} />
      <div className="profile__stars" />

      <main className="profile-stage">
        <section className="profile-col">
          <div className="profile-card">
            <div className="profile-banner" />
            <div className="profile-head">
              <div className="profile-avatar-wrap">
                <button type="button" className="profile-avatar" onClick={() => setShowAvatarAction((v) => !v)} title={t("change_photo")}>
                  {avatarPreview ? <img src={avatarPreview} alt="preview" className="avatar-img" />
                    : avatarUrl ? <img src={avatarUrl} alt="avatar" className="avatar-img" />
                    : <span className="avatar-fallback">👩‍💻</span>}
                  <span className="avatar-overlay"><Camera size={18} /><span>{t("change")}</span></span>
                </button>
                {showAvatarAction && (
                  <div className="avatar-actions">
                    <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="avatar-file" />
                    <button type="button" className="btn-ghost" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} disabled={uploadingAvatar}>{t("choose_image")}</button>
                    <button className="btn-primary" type="button" onClick={(e) => { e.stopPropagation(); uploadAvatar(); }} disabled={uploadingAvatar || !avatarFile}>{uploadingAvatar ? t("uploading") : t("change_photo")}</button>
                    <button className="btn-ghost" type="button" onClick={(e) => { e.stopPropagation(); setAvatarFile(null); setShowAvatarAction(false); }} disabled={uploadingAvatar}>{t("cancel")}</button>
                  </div>
                )}
              </div>
              <div className="profile-id">
                <div className="profile-handle">@{slugify(user?.name || "user")}</div>
                <div className="profile-name">{user?.name || t("user")} <span className="badge-verified">✔</span></div>
                <div className="profile-sub">{t("my_profile")}</div>
                <div className="profile-meta">
                  <span>📧 {user?.email || ""}</span><span className="dot" />
                  <span>📞 {user?.phone || "—"}</span><span className="dot" />
                  <span>📍 {user?.location || "—"}</span>
                </div>
                <div className="profile-actions" style={{ marginTop: 12 }}>
                  <button className="btn-primary" type="button" onClick={() => setEditProfileOpen(true)}>{t("edit_profile")}</button>
                  <button className="btn-ghost" type="button" onClick={shareProfile}>{t("share")}</button>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="panel" style={{ borderColor: "rgba(255,80,80,0.35)" }}>{error}</div>}

          <div className="tabs">
            <button className={`tab ${tab === "annonces" ? "tab--active" : ""}`} onClick={() => setTab("annonces")} type="button">{t("tab_annonces")}</button>
            <button className={`tab ${tab === "stars" ? "tab--active" : ""}`} onClick={() => setTab("stars")} type="button">{t("tab_stars")}</button>
            <button className={`tab ${tab === "besoins" ? "tab--active" : ""}`} onClick={() => setTab("besoins")} type="button">{t("tab_besoins")}</button>
          </div>

          {loading ? (
            <div className="panel"><div className="panel-title">{t("loading")}</div></div>
          ) : tab === "annonces" ? (
            <div className="panel">
              <div className="panel-title">{t("annonces")}</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <input value={newAnnonceTitle} onChange={(e) => setNewAnnonceTitle(e.target.value)} placeholder={t("new_annonce_placeholder")} style={inputStyle} />
                <button className="btn-primary" type="button" onClick={createAnnonce}>{t("add")}</button>
              </div>
              <MultiImageUploader images={annonceImages} setImages={setAnnonceImages} />
              {/* ✅ onDelete passé à AnnonceCard */}
              <div className="card-list">{annonces.map((x) => <AnnonceCard key={x._id} item={x} t={t} onDelete={() => deleteAnnonce(x._id)} />)}</div>
              {annonces.length === 0 && <div className="empty">{t("empty_annonces")}</div>}
            </div>
          ) : tab === "stars" ? (
            <div className="panel">
              <div className="panel-title">{t("my_stars")}</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input value={newStarTitle} onChange={(e) => setNewStarTitle(e.target.value)} placeholder={t("star_title_placeholder")} style={inputStyle} />
                <button className="btn-primary" type="button" onClick={createStar} disabled={!newStarTitle.trim()}>{t("add")}</button>
              </div>
              <MultiImageUploader images={starImages} setImages={setStarImages} />
              <div className="card-list">{stars.map((s) => <StarCard key={s._id} item={s} onDelete={() => deleteStar(s._id)} t={t} />)}</div>
              {stars.length === 0 && <div className="empty">{t("empty_stars")}</div>}
            </div>
          ) : (
            <>
              <div className="panel">
                <div className="panel-title">{t("create_besoin")}</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <input value={newBesoinTitle} onChange={(e) => setNewBesoinTitle(e.target.value)} placeholder={t("new_besoin_placeholder")} style={inputStyle} />
                  <button className="btn-primary" type="button" onClick={createBesoin}>{t("add")}</button>
                </div>
                <MultiImageUploader images={besoinImages} setImages={setBesoinImages} />
              </div>
              <div className="panel" style={{ marginTop: 14 }}>
                <div className="panel-title">{t("my_besoins")}</div>
                {/* ✅ onDelete passé à BesoinsList */}
                <BesoinsList besoins={besoins} onPropose={openOfferModal} onDelete={deleteBesoin} currentUserId={currentUserId} token={token} />
              </div>
              <div className="panel" style={{ marginTop: 14 }}>
                <div className="panel-title">{t("others_besoins")}</div>
                <BesoinsList besoins={publicBesoins} onPropose={openOfferModal} currentUserId={currentUserId} token={token} />
              </div>
            </>
          )}
        </section>

        <aside className="profile-side">
          <div className="side-box">
            <div className="side-title">{t("top_skills")}</div>
            <div className="chips">
              {shownSkills.length ? shownSkills.map((s, i) => <span key={i} className="chip">{s}</span>) : <span className="chip">—</span>}
            </div>
          </div>
          <div className="side-box">
            <div className="side-title">{t("summary")}</div>
            <p className="side-text">{shownSummary || t("summary_text")}</p>
          </div>
        </aside>

        <OfferModal open={offerOpen} besoin={selectedBesoin} token={token} apiGet={apiGet} apiSend={apiSend} currentUserId={currentUserId} onClose={closeOfferModal}
          onOfferAdded={(besoinId) => {
            setPublicBesoins((prev) => prev.map((b) => b._id === besoinId ? { ...b, offersCount: (b.offersCount ?? 0) + 1 } : b));
            setBesoins((prev) => prev.map((b) => b._id === besoinId ? { ...b, offersCount: (b.offersCount ?? 0) + 1 } : b));
          }}
          onOpenChat={openChat}
        />

        <ChatModal open={chatOpen} onClose={closeChat} besoin={chatBesoin} offer={chatOffer} token={token} apiGet={apiGet} apiSend={apiSend} />

        {/* MODALE SUPPRESSION DE COMPTE */}
        {deleteOpen && (
          <div className="modal-backdrop" onMouseDown={() => { setDeleteOpen(false); setDeletePassword(""); setDeleteError(""); }}>
            <div className="modal-card" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-head">
                <div>
                  <div className="modal-title" style={{ color: "#ff6b6b" }}>🗑️ Supprimer mon compte</div>
                  <div className="modal-sub">Cette action est irréversible. Toutes tes données seront supprimées.</div>
                </div>
                <button className="btn-ghost" type="button" onClick={() => { setDeleteOpen(false); setDeletePassword(""); setDeleteError(""); }}>✕</button>
              </div>
              <div style={{ margin: "16px 0", padding: "14px", borderRadius: 14, background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.25)", fontSize: 13 }}>
                ⚠️ Seront supprimés définitivement : ton profil, tes annonces, tes besoins, tes étoiles, tes favoris et tes notifications.
              </div>
              {deleteError && <div className="modal-error">{deleteError}</div>}
              <label className="modal-label">Confirme avec ton mot de passe</label>
              <input type="password" placeholder="Ton mot de passe actuel" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} style={{ ...inputStyle, width: "100%", marginTop: 8 }} />
              <div className="modal-actions">
                <button className="btn-ghost" type="button" onClick={() => { setDeleteOpen(false); setDeletePassword(""); setDeleteError(""); }} disabled={deleteLoading}>Annuler</button>
                <button type="button" onClick={handleDeleteAccount} disabled={deleteLoading || !deletePassword}
                  style={{ background: "linear-gradient(90deg, #ff4d6d, #c9184a)", border: "none", borderRadius: 999, padding: "10px 16px", color: "white", fontWeight: 800, cursor: "pointer", fontSize: 13, opacity: deleteLoading || !deletePassword ? 0.5 : 1 }}>
                  {deleteLoading ? "Suppression…" : "🗑️ Supprimer définitivement"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE EDIT PROFILE */}
        {editProfileOpen && (
          <div className="modal-backdrop" onMouseDown={() => setEditProfileOpen(false)}>
            <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><div className="modal-title">{t("edit_profile")}</div><div className="modal-sub">{t("edit_profile_sub")}</div></div>
                <button className="btn-ghost" type="button" onClick={() => setEditProfileOpen(false)}>✕</button>
              </div>
              {pfError && <div className="modal-error">{pfError}</div>}
              <label className="modal-label">{t("name")}</label>
              <input value={pfName} onChange={(e) => setPfName(e.target.value)} placeholder={t("your_name")} style={{ ...inputStyle, width: "100%", marginTop: 8 }} />
              <label className="modal-label" style={{ marginTop: 12 }}>{t("email")}</label>
              <input value={pfEmail} onChange={(e) => setPfEmail(e.target.value)} placeholder="ton@email.com" style={{ ...inputStyle, width: "100%", marginTop: 8 }} />
              <label className="modal-label" style={{ marginTop: 12 }}>{t("phone")}</label>
              <input value={pfPhone} onChange={(e) => setPfPhone(e.target.value)} placeholder="06..." style={{ ...inputStyle, width: "100%", marginTop: 8 }} />
              <label className="modal-label" style={{ marginTop: 12 }}>{t("location")}</label>
              <input value={pfLocation} onChange={(e) => setPfLocation(e.target.value)} placeholder={t("city")} style={{ ...inputStyle, width: "100%", marginTop: 8 }} />
              <label className="modal-label" style={{ marginTop: 12 }}>{t("top_skills")}</label>
              <input value={pfTopSkills} onChange={(e) => setPfTopSkills(e.target.value)} placeholder="Ex: React, Organisation, Communication" style={{ ...inputStyle, width: "100%", marginTop: 8 }} />
              <label className="modal-label" style={{ marginTop: 12 }}>{t("summary")}</label>
              <textarea value={pfSummary} onChange={(e) => setPfSummary(e.target.value)} placeholder={t("summary_text")} style={{ ...inputStyle, width: "100%", marginTop: 8, minHeight: 110, resize: "vertical" }} />
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,80,80,0.2)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,120,120,0.9)", marginBottom: 8 }}>Zone de danger</div>
                <button type="button" onClick={() => { setEditProfileOpen(false); setDeleteOpen(true); }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 14, cursor: "pointer", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.3)", color: "rgba(255,120,120,0.9)", fontWeight: 800, fontSize: 13, textAlign: "left" }}>
                  🗑️ Supprimer mon compte définitivement
                </button>
              </div>
              <div className="modal-actions">
                <button className="btn-ghost" type="button" onClick={() => setEditProfileOpen(false)} disabled={pfSaving}>{t("cancel")}</button>
                <button className="btn-primary" type="button" onClick={saveProfile} disabled={pfSaving}>{pfSaving ? t("saving") : t("save")}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StarCard({ item, onDelete, t }) {
  const images = (item.images || []).filter(Boolean).map((p) =>
    p.startsWith("http") ? p : `${API_BASE}${p}`
  );
  return (
    <div className="item-card" style={{ display: "block" }}>
      {images.length > 0 && <div style={{ marginBottom: 10 }}><Gallery images={images} alt={item.title} /></div>}
      <div className="item-title">{item.title}</div>
      <div style={{ marginTop: 10 }}>
        <button className="btn-ghost" type="button" onClick={onDelete}>{t("delete")}</button>
      </div>
    </div>
  );
}

// ✅ AnnonceCard avec bouton supprimer
function AnnonceCard({ item, onDelete, t }) {
  const images = (item.images || []).filter(Boolean).map((p) =>
    p.startsWith("http") ? p : `${API_BASE}${p}`
  );
  return (
    <div className="item-card" style={{ display: "block" }}>
      {images.length > 0 && <div style={{ marginBottom: 10 }}><Gallery images={images} alt={item.title} /></div>}
      <div className="item-title">{item.title}</div>
      <div className="item-meta" style={{ marginTop: 6, opacity: 0.75 }}>
        {`${item.location || "—"} • ${formatDate(item.createdAt)} • ⭐ ${item.stars ?? 0}`}
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="btn-ghost" type="button" onClick={onDelete}>{t("delete")}</button>
      </div>
    </div>
  );
}

function slugify(name) {
  return String(name || "user").trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR");
}

const inputStyle = {
  flex: 1, padding: "12px 14px", borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "white", outline: "none",
};
