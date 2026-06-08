import { useEffect, useMemo, useRef, useState } from "react";

export default function ChatModal({ open, onClose, besoin, offer, token, apiGet, apiSend }) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const offerId = offer?._id || null;
  const title = useMemo(() => {
    if (!besoin) return "";
    return `Chat • ${besoin.title}`;
  }, [besoin]);

  const boxRef = useRef(null);

  // ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const load = async () => {
    if (!open || !besoin?._id) return;
    setLoading(true);
    setError("");
    try {
      const qs = offerId ? `?offerId=${offerId}` : "";
      const res = await apiGet(`/chat/${besoin._id}/messages${qs}`, token);
      setItems(res.items || []);
      setTimeout(() => {
        if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
      }, 0);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // polling
  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, besoin?._id, offerId]);

  const send = async () => {
    if (!besoin?._id) return;
    if (!text.trim()) return;

    setSending(true);
    setError("");

    try {
      const res = await apiSend(`/chat/${besoin._id}/messages`, "POST", token, {
        text: text.trim(),
        offerId,
      });
      setText("");
      setItems((prev) => [...prev, res.item]);
      setTimeout(() => {
        if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
      }, 0);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSending(false);
    }
  };

  if (!open || !besoin) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card modal-card--chat" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            <div className="modal-sub">
              {offer ? `Offre de ${offer.authorName || "Utilisateur"}` : "Général"}
            </div>
          </div>
          <button className="btn-ghost" type="button" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div ref={boxRef} className="chat-box">
          {loading ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>Chargement…</div>
          ) : items.length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>Aucun message.</div>
          ) : (
            items.map((m) => (
              <div key={m._id} className="chat-item">
                <div className="chat-head">
                  <div className="chat-name">{m.authorName || "Utilisateur"}</div>
                  <div className="chat-time">{timeAgo(m.createdAt)}</div>
                </div>
                <div className="chat-text">{m.text}</div>
              </div>
            ))
          )}
        </div>

        <div className="chat-send">
          <input
            className="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message…"
          />
          <button className="btn-primary" type="button" onClick={send} disabled={sending || !text.trim()}>
            {sending ? "..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "À l’instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}