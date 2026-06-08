// src/components/OfferModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const API_BASE = "http://127.0.0.1:3001";

export default function OfferModal({
  open,
  besoin,
  token,
  apiGet,
  apiSend,
  currentUserId,
  onClose,
  onOfferAdded,
  onOpenChat, // (besoin, offer) => void
}) {
  const { t, i18n } = useTranslation();

  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef(null);

  const isOwner = useMemo(() => {
    if (!besoin || !currentUserId) return false;
    return String(besoin.owner) === String(currentUserId);
  }, [besoin, currentUserId]);

  // ESC close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Load offers
  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      if (!open || !besoin?._id) return;

      setLoadingOffers(true);
      setError("");

      try {
        const res = await apiGet(`/besoins/${besoin._id}/offers`, token);
        if (cancelled) return;
        setOffers(res.items || []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoadingOffers(false);
      }
    }

    // reset input when opening
    if (open) {
      setMessage("");
      setFile(null);
    }

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, [open, besoin?._id, token, apiGet]);

  const submit = async () => {
    if (!besoin?._id) return;
    if (!message.trim()) return;

    setSending(true);
    setError("");

    try {
      // ✅ FormData pour image optionnelle
      const fd = new FormData();
      fd.append("message", message.trim());
      if (file) fd.append("image", file);

      const res = await fetch(`${API_BASE}/besoins/${besoin._id}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Erreur (${res.status})`);

      setOffers((prev) => [data.item, ...prev]);
      setMessage("");
      setFile(null);

      onOfferAdded?.(besoin._id);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSending(false);
    }
  };

  const acceptOffer = async (offerId) => {
    setError("");
    try {
      await apiSend(`/offers/${offerId}/accept`, "POST", token, {});
      const res = await apiGet(`/besoins/${besoin._id}/offers`, token);
      setOffers(res.items || []);
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  const deleteOffer = async (offerId) => {
    setError("");
    try {
      await apiSend(`/offers/${offerId}`, "DELETE", token, {});
      setOffers((prev) => prev.filter((x) => x._id !== offerId));
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  // ✅ report user
  const reportUser = async (userId) => {
    try {
      const res = await apiSend(`/users/${userId}/report`, "POST", token, {});
      alert(res.message || t("reported") || "Profil signalé.");

      if (res.deleted) {
        setOffers((prev) => prev.filter((x) => String(x.author) !== String(userId)));
      }
    } catch (e) {
      alert(e?.message || String(e));
    }
  };

  // ✅ block user (toggle)
  const blockUser = async (userId) => {
    try {
      const res = await apiSend(`/users/${userId}/block`, "POST", token, {});
      alert(res.blocked ? (t("user_blocked") || "Utilisateur bloqué.") : (t("user_unblocked") || "Utilisateur débloqué."));

      if (res.blocked) {
        setOffers((prev) => prev.filter((x) => String(x.author) !== String(userId)));
      }
    } catch (e) {
      alert(e?.message || String(e));
    }
  };

  if (!open || !besoin) return null;

  const lang = String(i18n.language || "fr").split("-")[0];

  const statusLabel = (s) => {
    if (s === "open") return t("need_status_open", { defaultValue: "OPEN" });
    if (s === "closed") return t("need_status_closed", { defaultValue: "CLOSED" });
    if (s === "done") return t("need_status_done", { defaultValue: "DONE" });
    return String(s || "").toUpperCase();
  };

  const categoryLabel = (c) => {
    if (c === "general") return t("need_category_general", { defaultValue: "general" });
    return (c || "").toLowerCase();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{besoin.title}</div>
            <div className="modal-sub">
              {statusLabel(besoin.status)} • {categoryLabel(besoin.category)} • {formatDate(besoin.createdAt, lang)}
            </div>
          </div>

          <button className="btn-ghost" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.9, fontWeight: 800 }}>
          {t("offers_count", { count: offers.length, defaultValue: `${offers.length} proposition(s) d’aide` })}
        </div>

        {error && <div className="modal-error">{error}</div>}

        {/* ✅ Input offer */}
        <label className="modal-label">{t("your_message", { defaultValue: "Ton message" })}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("example_message", { defaultValue: "Ex: Bonjour ! Je peux vous aider samedi matin…" })}
          className="modal-textarea"
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 10,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button className="btn-ghost" type="button" onClick={() => fileRef.current?.click()} disabled={sending}>
            {t("add_image", { defaultValue: "Ajouter une image" })}
          </button>
          {file && <span style={{ fontSize: 12, opacity: 0.8 }}>{file.name}</span>}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" type="button" onClick={onClose} disabled={sending}>
            {t("cancel")}
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={submit}
            disabled={sending || !message.trim() || (besoin.status || "open") !== "open"}
          >
            {sending ? t("sending", { defaultValue: "Envoi..." }) : t("send")}
          </button>
        </div>

        {/* ✅ Offers list */}
        <div style={{ marginTop: 14 }}>
          {loadingOffers ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              {t("loading_offers", { defaultValue: "Chargement des propositions…" })}
            </div>
          ) : offers.length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              {t("no_offers_yet")}
            </div>
          ) : (
            <div className="offers-list">
              {offers.map((o) => {
                const isOfferAuthor = String(o.author) === String(currentUserId);

                return (
                  <div key={o._id} className="offer-item">
                    <div className="offer-head">
                      <div className="offer-name">
                        {o.authorName || t("user")}{" "}
                        {o.accepted ? (
                          <span className="badge-ui badge-ui--accepted">
                            {t("accepted", { defaultValue: "ACCEPTÉE" })}
                          </span>
                        ) : null}
                      </div>
                      <div className="offer-time">{timeAgo(o.createdAt, lang, t)}</div>
                    </div>

                    <div className="offer-msg">{o.message}</div>

                    {o.image ? (
                      <div style={{ marginTop: 10 }}>
                        <img
                          src={`${API_BASE}${o.image}`}
                          alt="offer"
                          style={{
                            width: "100%",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                        />
                      </div>
                    ) : null}

                    <div className="offer-actions">
                      <button className="btn-ghost" type="button" onClick={() => onOpenChat?.(besoin, o)}>
                        {t("chat", { defaultValue: "Discuter" })}
                      </button>

                      <button className="btn-ghost" type="button" onClick={() => o.author && reportUser(o.author)}>
                        {t("report", { defaultValue: "Signaler" })}
                      </button>

                      <button className="btn-ghost" type="button" onClick={() => o.author && blockUser(o.author)}>
                        {t("block", { defaultValue: "Bloquer" })}
                      </button>

                      {isOwner && !o.accepted && (besoin.status || "open") === "open" && (
                        <button className="btn-primary" type="button" onClick={() => acceptOffer(o._id)}>
                          {t("accept", { defaultValue: "Accepter" })}
                        </button>
                      )}

                      {(isOwner || isOfferAuthor) && !o.accepted && (
                        <button className="btn-ghost" type="button" onClick={() => deleteOffer(o._id)}>
                          {t("delete")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso, lang) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(lang || "fr", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

function timeAgo(iso, lang, t) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);

  // Traductions simples
  const justNow = t?.("just_now", { defaultValue: "À l’instant" });
  const minutesAgo = (n) => t?.("minutes_ago", { count: n, defaultValue: `Il y a ${n} min` });
  const hoursAgo = (n) => t?.("hours_ago", { count: n, defaultValue: `Il y a ${n}h` });
  const daysAgo = (n) => t?.("days_ago", { count: n, defaultValue: `Il y a ${n}j` });

  if (min < 1) return justNow;
  if (min < 60) return minutesAgo(min);

  const h = Math.floor(min / 60);
  if (h < 24) return hoursAgo(h);

  const d = Math.floor(h / 24);
  return daysAgo(d);
}