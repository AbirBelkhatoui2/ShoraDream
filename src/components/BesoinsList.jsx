// src/components/BesoinsList.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Gallery from "./Gallery";
import { useTranslation } from "react-i18next";
import { toggleFavorite } from "../api.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

function toAbs(url) {
  if (!url) return "";
  return String(url).startsWith("http") ? url : `${API_BASE}${url}`;
}

function formatDate(iso, i18nLang) {
  if (!iso) return "";
  const lang = (i18nLang || "fr").split("-")[0];
  const locale = lang === "en" ? "en-US" : lang === "ar" ? "ar" : "fr-FR";
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export function BesoinsList({ besoins, onPropose, currentUserId, onEdit, onDelete, token }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [favs, setFavs] = useState(new Set());
  const [busy, setBusy] = useState(new Set());

  const onFav = async (id) => {
    const key = `besoin_${id}`;
    if (busy.has(key)) return;
    setBusy(prev => new Set([...prev, key]));
    try {
      const res = await toggleFavorite(token, "besoin", id);
      setFavs(prev => {
        const next = new Set(prev);
        res.favorited ? next.add(key) : next.delete(key);
        return next;
      });
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusy(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  if (!besoins || besoins.length === 0) {
    return <div className="empty"><p>{t("empty_besoins")}</p></div>;
  }

  return (
    <div className="card-list">
      {besoins.map((b) => {
        const images = (b.images || []).filter(Boolean).map(toAbs);
        const isOwner = currentUserId && String(b.owner) === String(currentUserId);
        const key = `besoin_${b._id}`;
        const isFav = favs.has(key);
        const isBusy = busy.has(key);

        const ownerName = b.ownerPublic?.name || b.owner?.name || null;
        const ownerAvatar = b.ownerPublic?.avatar || b.owner?.avatar || null;
        const ownerId = b.ownerPublic?.id || b.ownerPublic?._id || b.owner?._id || null;

        return (
          <div key={b._id} className="card-ui">

            {/* ✅ En-tête avec avatar + nom cliquables */}
            {ownerName && !isOwner && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 10, paddingBottom: 10,
                borderBottom: "1px solid rgba(255,255,255,0.08)"
              }}>
                {/* Avatar cliquable */}
                <div
                  onClick={() => ownerId && navigate(`/u/${ownerId}`)}
                  style={{
                    width: 36, height: 36, borderRadius: 999,
                    overflow: "hidden", border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                    cursor: ownerId ? "pointer" : "default",
                  }}
                  title={ownerId ? `Voir le profil de ${ownerName}` : ""}
                >
                  {ownerAvatar
                    ? <img src={toAbs(ownerAvatar)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 16 }}>👤</span>
                  }
                </div>

                {/* Nom cliquable */}
                <span
                  onClick={() => ownerId && navigate(`/u/${ownerId}`)}
                  style={{
                    fontWeight: 800, fontSize: 13,
                    cursor: ownerId ? "pointer" : "default",
                    color: ownerId ? "#a78bfa" : "inherit",
                    textDecoration: ownerId ? "underline dotted" : "none",
                  }}
                  title={ownerId ? `Voir le profil de ${ownerName}` : ""}
                >
                  {ownerName}
                </span>
              </div>
            )}

            {/* Images */}
            {images.length ? (
              <div style={{ marginBottom: 10 }}>
                <Gallery images={images} alt={b.title} />
              </div>
            ) : null}

            {/* Titre */}
            <div className="card-ui-title">{b.title}</div>

            {/* Méta */}
            <div className="card-ui-meta">
              <span className="badge-ui">🏷️ {b.category || "general"}</span>
              <span className="badge-ui badge-ui--soft">{String(b.status || "open").toUpperCase()}</span>
              <span>📅 {formatDate(b.createdAt, i18n.language)}</span>
              <span>🤝 {b.offersCount ?? 0} proposition(s)</span>
            </div>

            {/* Description */}
            {b.description ? <p className="card-ui-desc">{b.description}</p> : null}

            {/* Actions */}
            <div className="card-ui-actions">
              {!isOwner && (
                <button
                  className="btn-ghost" type="button"
                  onClick={() => onFav(b._id)}
                  disabled={isBusy || !token}
                  style={{ color: isFav ? "#f9c74f" : "inherit" }}
                >
                  {isBusy ? "…" : isFav ? "★ Favori" : "☆ Favori"}
                </button>
              )}
              <button
                className="btn-primary" type="button"
                onClick={() => onPropose?.(b)}
                disabled={(b.status || "open") !== "open"}
              >
                {t("propose_help")}
              </button>
              {isOwner && onEdit && (
                <button className="btn-ghost" type="button" onClick={() => onEdit(b)}>{t("edit")}</button>
              )}
              {isOwner && onDelete && (
                <button className="btn-ghost" type="button" onClick={() => onDelete(b)}>{t("delete")}</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
