import { useEffect, useState, useContext, useCallback } from "react";
import Sidebar from "../components/SideBar.jsx";
import "../styles/home.css";
import { AuthContext } from "../context/AuthContext.jsx";
import { getFeed, toggleFavorite, getMyFavorites } from "../api.js";
import Gallery from "../components/Gallery.jsx";
import { useTranslation } from "react-i18next";

const API_BASE = "http://127.0.0.1:3001";

function imgUrl(p) {
  if (!p) return "";
  return String(p).startsWith("http") ? p : `${API_BASE}${p}`;
}

// Bouton favori avec état visuel
function FavBtn({ isFav, busy, onClick }) {
  return (
    <button
      className="btn-ghost"
      type="button"
      onClick={onClick}
      disabled={busy}
      title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 13,
        opacity: busy ? 0.5 : 1,
        color: isFav ? "#f9c74f" : "inherit",
        transition: "color 0.2s",
      }}
    >
      {busy ? "…" : isFav ? "★ Favori" : "☆ Favori"}
    </button>
  );
}

export default function Feed() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [annonces, setAnnonces] = useState([]);
  const [besoins, setBesoins] = useState([]);
  const [stars, setStars] = useState([]);

  // Set des IDs en favori : "annonce_<id>", "besoin_<id>", "star_<id>"
  const [favIds, setFavIds] = useState(new Set());
  // IDs en cours de traitement
  const [busyIds, setBusyIds] = useState(new Set());

  // Charge le feed
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getFeed(token, 30);
        if (cancelled) return;
        setAnnonces(res.annonces || []);
        setBesoins(res.besoins || []);
        setStars(res.stars || []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => { cancelled = true; };
  }, [token]);

  // Charge les favoris existants pour afficher l'état ⭐
  useEffect(() => {
    async function loadFavs() {
      try {
        const res = await getMyFavorites(token);
        const ids = new Set(
          (res.items || []).map((f) => `${f.targetType}_${f.targetId}`)
        );
        setFavIds(ids);
      } catch {
        // silencieux
      }
    }
    if (token) loadFavs();
  }, [token]);

  const handleFav = useCallback(async (type, id) => {
    const key = `${type}_${id}`;
    if (busyIds.has(key)) return;

    setBusyIds((prev) => new Set([...prev, key]));
    try {
      const res = await toggleFavorite(token, type, id);
      // Mise à jour instantanée de l'état sans recharger
      setFavIds((prev) => {
        const next = new Set(prev);
        if (res.favorited) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [token, busyIds]);

  return (
    <div className="home">
      <Sidebar />
      <main className="home__stage">
        <div className="wish" style={{ marginTop: 70, width: 980, maxWidth: "94vw" }}>
          <h1 className="wish__title">{t("feed_title") || "Publications"}</h1>
          <p className="wish__subtitle">{t("feed_sub") || "Annonces • Besoins • Étoiles des autres"}</p>

          {loading ? <div style={{ opacity: 0.8 }}>{t("loading") || "Chargement…"}</div> : null}
          {error ? <div style={{ marginTop: 10, color: "salmon" }}>{error}</div> : null}

          {/* ── ANNONCES ── */}
          <h2 style={{ marginTop: 18, fontSize: 16, fontWeight: 800 }}>
            {t("annonces") || "Annonces"}
          </h2>
          {annonces.length === 0 ? (
            <div style={{ opacity: 0.75, marginTop: 8 }}>
              {t("empty_annonces") || "Aucune annonce."}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6" style={{ marginTop: 12 }}>
              {annonces.map((a) => {
                const imgs = (a.images || []).filter(Boolean).map(imgUrl);
                const key = `annonce_${a._id}`;
                return (
                  <div key={a._id} className="bg-white/5 rounded-2xl p-4">
                    {imgs.length ? <Gallery images={imgs} alt={a.title} /> : null}
                    <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
                      👤 {a.owner?.name || "—"}
                    </div>
                    <h3 className="text-lg font-bold mt-2">{a.title}</h3>
                    <p className="opacity-70 text-sm">{a.description || "—"}</p>
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <FavBtn
                        isFav={favIds.has(key)}
                        busy={busyIds.has(key)}
                        onClick={() => handleFav("annonce", a._id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BESOINS ── */}
          <h2 style={{ marginTop: 22, fontSize: 16, fontWeight: 800 }}>
            {t("my_besoins") || "Besoins"}
          </h2>
          {besoins.length === 0 ? (
            <div style={{ opacity: 0.75, marginTop: 8 }}>
              {t("empty_besoins") || "Aucun besoin."}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6" style={{ marginTop: 12 }}>
              {besoins.map((b) => {
                const imgs = (b.images || []).filter(Boolean).map(imgUrl);
                const key = `besoin_${b._id}`;
                return (
                  <div key={b._id} className="bg-white/5 rounded-2xl p-4">
                    {imgs.length ? <Gallery images={imgs} alt={b.title} /> : null}
                    <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
                      👤 {b.ownerPublic?.name || "—"}
                    </div>
                    <h3 className="text-lg font-bold mt-2">{b.title}</h3>
                    <p className="opacity-70 text-sm">{b.description || "—"}</p>
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <FavBtn
                        isFav={favIds.has(key)}
                        busy={busyIds.has(key)}
                        onClick={() => handleFav("besoin", b._id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ÉTOILES ── */}
          <h2 style={{ marginTop: 22, fontSize: 16, fontWeight: 800 }}>
            {t("my_stars") || "Étoiles"}
          </h2>
          {stars.length === 0 ? (
            <div style={{ opacity: 0.75, marginTop: 8 }}>
              {t("empty_stars") || "Aucune étoile."}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6" style={{ marginTop: 12 }}>
              {stars.map((s) => {
                const imgs = (s.images || []).filter(Boolean).map(imgUrl);
                const key = `star_${s._id}`;
                return (
                  <div key={s._id} className="bg-white/5 rounded-2xl p-4">
                    {imgs.length ? <Gallery images={imgs} alt={s.title} /> : null}
                    <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
                      👤 {s.owner?.name || "—"}
                    </div>
                    <h3 className="text-lg font-bold mt-2">{s.title}</h3>
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <FavBtn
                        isFav={favIds.has(key)}
                        busy={busyIds.has(key)}
                        onClick={() => handleFav("star", s._id)}
                      />
                    </div>
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
