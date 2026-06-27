// src/pages/Messages.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { apiGet } from "../api.js";
import Sidebar from "../components/SideBar.jsx";
import "../styles/messages.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

function toAbs(url) {
  if (!url) return "";
  return String(url).startsWith("http") ? url : `${API_BASE}${url}`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

export default function Messages() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [myBesoins,    setMyBesoins]    = useState([]); // besoins dont je suis propriétaire
  const [offeredBesoins, setOfferedBesoins] = useState([]); // besoins où j'ai proposé

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        // Mes besoins avec leurs offres
        const [mine, pubBesoins] = await Promise.all([
          apiGet("/besoins/mine", token),
          apiGet("/besoins",      token),
        ]);

        if (cancelled) return;

        // Mes besoins qui ont au moins une offre
        const withOffers = (mine.items || []).filter(b => (b.offersCount || 0) > 0);
        setMyBesoins(withOffers);

        // Besoins des autres où j'ai fait une offre
        // On charge les offres de chaque besoin public pour voir si je suis dedans
        // Approche simple : charger toutes mes offres via les besoins publics
        // On utilise un flag "hasMyOffer" déjà dans le feed si disponible
        setOfferedBesoins([]); // sera rempli ci-dessous

        // Chercher les besoins où j'ai une offre
        const allPub = pubBesoins.items || [];
        const withMyOffer = [];
        await Promise.all(
          allPub.map(async (b) => {
            try {
              const res = await apiGet(`/besoins/${b._id}/offers`, token);
              const myOffer = (res.items || []).find(o => String(o.author) === String(user?.id));
              if (myOffer) withMyOffer.push({ ...b, myOffer });
            } catch {}
          })
        );
        if (!cancelled) setOfferedBesoins(withMyOffer);

      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token, user?.id]);

  const openChat = (besoinId, offerId) => {
    navigate(`/profile?tab=besoins&openChat=${besoinId}${offerId ? `&openOffer=${offerId}` : ""}`);
  };

  const totalConversations = myBesoins.length + offeredBesoins.length;

  return (
    <div className="messages-page">
      <Sidebar />

      <main className="messages-stage">
        <header className="messages-head">
          <div>
            <h1 className="messages-title">💬 Mes messages</h1>
            <p className="messages-sub">
              {totalConversations === 0
                ? "Aucune conversation pour le moment"
                : `${totalConversations} conversation${totalConversations > 1 ? "s" : ""} active${totalConversations > 1 ? "s" : ""}`
              }
            </p>
          </div>
        </header>

        {error && <div className="messages-error">{error}</div>}

        {loading ? (
          <div className="messages-empty">
            <div className="messages-empty-icon">⏳</div>
            <div>Chargement…</div>
          </div>
        ) : totalConversations === 0 ? (
          <div className="messages-empty">
            <div className="messages-empty-icon">💬</div>
            <div className="messages-empty-title">Pas encore de conversations</div>
            <div className="messages-empty-sub">
              Propose ton aide sur un besoin ou publie un besoin pour commencer à échanger.
            </div>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => navigate("/accueil")}>
              Voir les publications
            </button>
          </div>
        ) : (
          <div className="messages-grid">

            {/* ── MES BESOINS AVEC OFFRES REÇUES ── */}
            {myBesoins.length > 0 && (
              <section className="messages-section">
                <div className="messages-section-title">
                  🙋 Offres reçues sur mes besoins
                  <span className="messages-badge">{myBesoins.length}</span>
                </div>

                {myBesoins.map(b => (
                  <ConversationCard
                    key={b._id}
                    title={b.title}
                    subtitle={`${b.offersCount} offre${b.offersCount > 1 ? "s" : ""} reçue${b.offersCount > 1 ? "s" : ""}`}
                    status={b.status}
                    category={b.category}
                    date={b.createdAt}
                    icon="🙏"
                    role="Propriétaire"
                    roleColor="#a78bfa"
                    onClick={() => navigate(`/profile?tab=besoins&openChat=${b._id}`)}
                  />
                ))}
              </section>
            )}

            {/* ── BESOINS OÙ J'AI PROPOSÉ MON AIDE ── */}
            {offeredBesoins.length > 0 && (
              <section className="messages-section">
                <div className="messages-section-title">
                  🤝 Mes propositions d'aide
                  <span className="messages-badge">{offeredBesoins.length}</span>
                </div>

                {offeredBesoins.map(b => (
                  <ConversationCard
                    key={b._id}
                    title={b.title}
                    subtitle={
                      b.myOffer?.accepted
                        ? "✅ Ton offre a été acceptée !"
                        : "En attente de réponse…"
                    }
                    status={b.status}
                    category={b.category}
                    date={b.myOffer?.createdAt || b.createdAt}
                    icon="🤝"
                    role="Proposant"
                    roleColor="#39c6ff"
                    accepted={b.myOffer?.accepted}
                    onClick={() => openChat(b._id, b.myOffer?._id)}
                  />
                ))}
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

// ── Carte conversation ──
function ConversationCard({ title, subtitle, status, category, date, icon, role, roleColor, accepted, onClick }) {
  return (
    <div
      className={`conv-card ${accepted ? "conv-card--accepted" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick()}
    >
      {/* Icône */}
      <div className="conv-icon">{icon}</div>

      {/* Contenu */}
      <div className="conv-content">
        <div className="conv-title">{title}</div>
        <div className="conv-subtitle">{subtitle}</div>
        <div className="conv-meta">
          {category && <span className="conv-chip">🏷️ {category}</span>}
          <span className={`conv-chip conv-chip--${status || "open"}`}>
            {status === "open" ? "🟢 Ouvert" : status === "closed" ? "🔴 Fermé" : "✅ Terminé"}
          </span>
          <span className="conv-time">{timeAgo(date)}</span>
        </div>
      </div>

      {/* Rôle */}
      <div className="conv-role" style={{ color: roleColor }}>
        {role}
        <span className="conv-arrow">→</span>
      </div>
    </div>
  );
}
