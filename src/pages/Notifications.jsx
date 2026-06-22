// src/pages/Notifications.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import { apiGet, apiSend } from "../api.js";
import Sidebar from "../components/SideBar.jsx";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

const TYPE_ICON = { offer: "🤝", like: "⭐", accepted: "✅", message: "💬" };
const TYPE_LABEL = {
  offer: "a proposé son aide sur votre besoin",
  like: "a aimé votre publication",
  accepted: "a accepté votre offre",
  message: "vous a envoyé un message",
};
const TYPE_HINT = {
  offer: "→ Cliquer pour voir la proposition",
  accepted: "→ Cliquer pour voir dans Mon Profil",
  message: "→ Cliquer pour ouvrir le chat",
  like: "→ Cliquer pour voir la publication",
};

function getDestination(notif) {
  if (notif.type === "message") return `/profile?tab=besoins&openChat=${notif.targetId || ""}`;
  if (notif.type === "offer") return `/profile?tab=besoins&openOffer=${notif.targetId || ""}`;
  if (notif.type === "accepted") return "/profile?tab=besoins";
  if (notif.type === "like") return "/accueil";
  return "/profile";
}

export default function Notifications() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (token) load(); }, [token]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/notifications/mine", token);
      setNotifs(res.items || []);
    } catch (e) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try {
      await apiSend("/notifications/read-all", "PUT", token, {});
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleClick = async (notif) => {
    if (!notif.read) {
      try {
        await apiSend(`/notifications/${notif._id}/read`, "PUT", token, {});
        setNotifs((prev) => prev.map((n) => n._id === notif._id ? { ...n, read: true } : n));
      } catch {}
    }
    navigate(getDestination(notif));
  };

  // ✅ Aller sur le profil public de l'expéditeur
  const goToProfile = (e, fromId) => {
    e.stopPropagation(); // ne pas déclencher handleClick
    if (fromId) navigate(`/u/${fromId}`);
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="home">
      <Sidebar />
      <main className="home__stage">
        <div className="wish" style={{ marginTop: 60, width: "min(680px, 94vw)", padding: "32px 28px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h1 className="wish__title" style={{ fontSize: 28, margin: 0 }}>🔔 {t("nav_notifications") || "Notifications"}</h1>
              {unread > 0 && <p style={{ margin: "6px 0 0", opacity: 0.75, fontSize: 13 }}>{unread} non lue{unread > 1 ? "s" : ""}</p>}
            </div>
            {unread > 0 && (
              <button className="btn-ghost" type="button" onClick={markAllRead} style={{ fontSize: 12 }}>
                Tout marquer lu
              </button>
            )}
          </div>

          {loading && <div style={{ opacity: 0.75 }}>Chargement…</div>}
          {error && <div style={{ color: "salmon", marginBottom: 12 }}>{error}</div>}
          {!loading && notifs.length === 0 && (
            <div style={{ opacity: 0.7, textAlign: "center", padding: "40px 0", fontSize: 14 }}>
              Aucune notification pour le moment.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifs.map((n) => (
              <div
                key={n._id}
                onClick={() => handleClick(n)}
                style={{
                  borderRadius: 16, padding: "14px 16px",
                  border: `1px solid ${n.read ? "rgba(255,255,255,0.10)" : "rgba(139,92,246,0.45)"}`,
                  background: n.read ? "rgba(255,255,255,0.04)" : "rgba(139,92,246,0.12)",
                  cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start",
                  transition: "background 0.2s, transform 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICON[n.type] || "🔔"}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {/* ✅ Nom cliquable → profil public */}
                    <span
                      onClick={(e) => goToProfile(e, n.from)}
                      style={{
                        color: "#a78bfa", cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted",
                      }}
                      title="Voir le profil"
                    >
                      {n.fromName || "Quelqu'un"}
                    </span>
                    {" "}{TYPE_LABEL[n.type] || n.message}
                  </div>

                  {n.targetTitle && (
                    <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📌 {n.targetTitle}
                    </div>
                  )}

                  <div style={{ marginTop: 6, fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>
                    {TYPE_HINT[n.type] || "→ Cliquer pour voir"}
                  </div>

                  <div style={{ marginTop: 4, opacity: 0.55, fontSize: 11 }}>{timeAgo(n.createdAt)}</div>
                </div>

                {!n.read && (
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: "#a78bfa", flexShrink: 0, marginTop: 4, boxShadow: "0 0 8px #a78bfa" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
