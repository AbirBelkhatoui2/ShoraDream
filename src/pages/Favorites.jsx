import { useEffect, useState, useContext, useMemo } from "react";
import Sidebar from "../components/SideBar.jsx";
import "../styles/home.css";
import { getMyFavorites, toggleFavorite } from "../api.js";
import { AuthContext } from "../context/AuthContext.jsx";
import Gallery from "../components/Gallery.jsx";
import { useTranslation } from "react-i18next";

const API_BASE = "http://127.0.0.1:3001";

function toAbs(p) {
  if (!p) return "";
  return String(p).startsWith("http") ? p : `${API_BASE}${p}`;
}

export default function Favorites() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setError("");
    try {
      const res = await getMyFavorites(token);
      setItems(res.items || []);
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const removeFav = async (f) => {
    if (!f?._id) return;
    try {
      setBusyId(f._id);
      await toggleFavorite(token, f.targetType, f.targetId);
      await load();
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const typeLabel = (type) => {
    if (type === "annonce") return t("type_ad") || "Annonce";
    if (type === "besoin") return t("type_need") || "Besoin";
    if (type === "star") return t("type_star") || "Étoile";
    return type || "—";
  };

  const cards = useMemo(() => items || [], [items]);

  return (
    <div className="home">
      <Sidebar />

      <main className="home__stage">
        <div className="wish" style={{ marginTop: 80, width: "min(1100px, 92vw)" }}>
          <h1 className="wish__title">{t("favorites_title") || "Favoris"}</h1>
          <p className="wish__subtitle">
            {t("favorites_sub") || "Tous tes favoris (besoins / annonces / étoiles)"}
          </p>

          {error ? <div style={{ marginTop: 12, color: "salmon" }}>{error}</div> : null}

          {cards.length === 0 ? (
            <div style={{ marginTop: 18, opacity: 0.85 }}>
              {t("favorites_empty") || "Aucun favori."}
            </div>
          ) : (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {cards.map((f) => {
                const x = f.item || {};

                // ✅ support "images" OU "image"
                const imgsFromImages = Array.isArray(x.images) ? x.images : [];
                const imgsFromSingle = x.image ? [x.image] : [];
                const imgs = [...imgsFromImages, ...imgsFromSingle].filter(Boolean).map(toAbs);

                return (
                  <div
                    key={f._id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.05)",
                      padding: 14,
                      boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
                    }}
                  >
                    {imgs.length ? (
                      <div style={{ marginBottom: 10 }}>
                        <Gallery images={imgs} alt={x.title || ""} />
                      </div>
                    ) : null}

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.16)",
                          background: "rgba(255,255,255,0.06)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {typeLabel(f.targetType)}
                      </div>

                      <button
                        className="btn-ghost"
                        type="button"
                        onClick={() => removeFav(f)}
                        disabled={busyId === f._id}
                        title={t("remove") || "Retirer"}
                      >
                        {busyId === f._id ? (t("removing") || "…") : t("remove") || "Retirer"}
                      </button>
                    </div>

                    <div style={{ marginTop: 10, fontWeight: 900, fontSize: 16 }}>
                      {x.title || "—"}
                    </div>

                    {"description" in x ? (
                      <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                        {x.description || "—"}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}