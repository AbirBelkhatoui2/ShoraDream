// src/pages/Notifications.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import { apiGet, apiSend } from "../api.js";
import Sidebar from "../components/SideBar.jsx";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "../styles/profile.css";

function timeAgo(iso, t) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return t("notif_ago_now");
  if (min < 60) return t("notif_ago_min", { count: min });
  const h = Math.floor(min / 60);
  if (h < 24)   return t("notif_ago_h",   { count: h });
  return t("notif_ago_d", { count: Math.floor(h / 24) });
}

function getConfig(type, t) {
  const configs = {
    offer:    { icon: "🤝", label: t("notif_offer"),   hint: t("notif_hint_offer"),   color: "#39c6ff", bg: "rgba(57,198,255,0.10)",  border: "rgba(57,198,255,0.35)"  },
    like:     { icon: "⭐", label: t("notif_like"),    hint: t("notif_hint_like"),    color: "#FFD700", bg: "rgba(255,215,0,0.10)",   border: "rgba(255,215,0,0.4)"    },
    accepted: { icon: "✅", label: t("notif_accepted"), hint: t("notif_hint_accepted"), color: "#02C39A", bg: "rgba(2,195,154,0.10)",  border: "rgba(2,195,154,0.35)"   },
    message:  { icon: "💬", label: t("notif_message"), hint: t("notif_hint_message"), color: "#a78bfa", bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.35)"  },
    report:   { icon: "🚨", label: t("notif_report"),  hint: "",                       color: "#ff6b6b", bg: "rgba(255,107,107,0.08)", border: "rgba(255,107,107,0.25)" },
    comment:  { icon: "💬", label: t("notif_comment"), hint: t("notif_hint_comment"), color: "#a78bfa", bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.35)"  },
  };
  return configs[type] || { icon: "🔔", label: "", hint: "", color: "#a78bfa", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)" };
}

function getDestination(notif) {
  if (notif.type === "message")  return `/profile?tab=besoins&openChat=${notif.targetId || ""}`;
  if (notif.type === "offer")    return `/profile?tab=besoins&openOffer=${notif.targetId || ""}`;
  if (notif.type === "accepted") return "/profile?tab=besoins";
  return "/accueil";
}

export default function Notifications() {
  const { token } = useContext(AuthContext);
  const { t }     = useTranslation();
  const navigate  = useNavigate();

  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => { if (token) load(); }, [token]);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await apiGet("/notifications/mine", token);
      setNotifs(res.items || []);
    } catch (e) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try {
      await apiSend("/notifications/read-all", "PUT", token, {});
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleClick = async (notif) => {
    if (!notif.read) {
      try {
        await apiSend(`/notifications/${notif._id}/read`, "PUT", token, {});
        setNotifs(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      } catch {}
    }
    navigate(getDestination(notif));
  };

  const goToProfile = (e, fromId) => {
    e.stopPropagation();
    if (fromId) navigate(`/u/${fromId}`);
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="profile-page">
      <Sidebar />
      <main className="profile-stage" style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 40 }}>
        <div style={{ width: "min(680px, 94vw)", padding: "32px 28px", borderRadius: 26, background: "rgba(10,25,70,0.62)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 18px 80px rgba(0,0,0,0.4)" }}>

          {/* ── EN-TÊTE ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
                {t("notif_title")}
              </h1>
              <p style={{ margin: "6px 0 0", opacity: 0.65, fontSize: 13 }}>
                {unread > 0
                  ? t("notif_unread", { count: unread })
                  : t("notif_all_read")
                }
              </p>
            </div>
            {unread > 0 && (
              <button className="btn-ghost" type="button" onClick={markAllRead} style={{ fontSize: 12 }}>
                {t("notif_mark_all")}
              </button>
            )}
          </div>

          {loading && <div style={{ opacity: 0.75, textAlign: "center", padding: "20px 0" }}>{t("loading")}</div>}
          {error   && <div style={{ color: "salmon", marginBottom: 12 }}>{error}</div>}

          {/* ── VIDE ── */}
          {!loading && notifs.length === 0 && (
            <div style={{ opacity: 0.6, textAlign: "center", padding: "50px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t("notif_empty_title")}</div>
              <div style={{ fontSize: 13, marginTop: 6, opacity: 0.7 }}>{t("notif_empty_sub")}</div>
            </div>
          )}

          {/* ── LISTE ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifs.map(n => {
              const cfg = getConfig(n.type, t);
              return (
                <div
                  key={n._id}
                  onClick={() => handleClick(n)}
                  style={{
                    borderRadius: 16, padding: "14px 16px",
                    border: `1px solid ${n.read ? "rgba(255,255,255,0.10)" : cfg.border}`,
                    background: n.read ? "rgba(255,255,255,0.04)" : cfg.bg,
                    cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.25)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Icône */}
                  <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: `${cfg.color}22`, border: `1px solid ${cfg.color}44`, display: "grid", placeItems: "center", fontSize: 20 }}>
                    {cfg.icon}
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.4 }}>
                      {/* Nom cliquable */}
                      <span
                        onClick={e => goToProfile(e, n.from)}
                        style={{ color: cfg.color, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                        title="Voir le profil"
                      >
                        {n.fromName || t("notif_someone")}
                      </span>
                      {" "}{cfg.label}
                    </div>

                    {/* Titre publication */}
                    {n.targetTitle && (
                      <div style={{ marginTop: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 12, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📌 {n.targetTitle}
                      </div>
                    )}

                    {/* Hint */}
                    {cfg.hint && (
                      <div style={{ marginTop: 6, fontSize: 11, color: cfg.color, fontWeight: 700, opacity: 0.85 }}>
                        {cfg.hint}
                      </div>
                    )}

                    {/* Heure */}
                    <div style={{ marginTop: 5, opacity: 0.45, fontSize: 11 }}>
                      {timeAgo(n.createdAt, t)}
                    </div>
                  </div>

                  {/* Point non lu */}
                  {!n.read && (
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: cfg.color, flexShrink: 0, marginTop: 6, boxShadow: `0 0 8px ${cfg.color}` }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
