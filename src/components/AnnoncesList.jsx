import { useState } from "react";
import Gallery from "./Gallery";
import { useTranslation } from "react-i18next";
import { toggleFavorite } from "../api.js";

const API_BASE = "http://127.0.0.1:3001";

function toAbs(url) {
  if (!url) return "";
  return String(url).startsWith("http") ? url : `${API_BASE}${url}`;
}

export function AnnoncesList({ annonces, token }) {
  const { t } = useTranslation();

  const [favs, setFavs] = useState(new Set());
  const [busy, setBusy] = useState(new Set());

  const onFav = async (id) => {
    const key = `annonce_${id}`;
    if (busy.has(key)) return;
    setBusy(prev => new Set([...prev, key]));
    try {
      const res = await toggleFavorite(token, "annonce", id);
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

  if (!annonces?.length) return <div className="empty">{t("feed_empty_ads")}</div>;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {annonces.map((a) => {
        const imgs = (a.images || []).filter(Boolean).map(toAbs);
        const key = `annonce_${a._id}`;
        const isFav = favs.has(key);
        const isBusy = busy.has(key);

        return (
          <div key={a._id} className="bg-white/5 rounded-2xl p-4">
            {imgs.length ? <Gallery images={imgs} alt={a.title} /> : null}

            <h3 className="text-lg font-bold mt-3">{a.title}</h3>

            {"description" in a ? (
              <p className="opacity-70 text-sm">{a.description || "—"}</p>
            ) : null}

            <div className="mt-3" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div className="text-xs opacity-60">
                {new Date(a.createdAt).toLocaleDateString()}
              </div>

              <button
                className="btn-ghost"
                type="button"
                onClick={() => onFav(a._id)}
                disabled={isBusy || !token}
                style={{ color: isFav ? "#f9c74f" : "inherit", transition: "color 0.2s" }}
              >
                {isBusy ? "…" : isFav ? "★ Favori" : "☆ Favori"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
