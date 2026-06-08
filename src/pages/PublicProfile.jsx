import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_BASE = "http://127.0.0.1:3001";

export default function PublicProfile() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [u, setU] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE}/users/public/${id}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data.message || `Erreur (${res.status})`);

        if (cancelled) return;
        setU(data.user || null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const avatarUrl = useMemo(() => {
    if (!u?.avatar) return "";
    return `${API_BASE}${u.avatar}`;
  }, [u?.avatar]);

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("Lien copié ✅");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Lien copié ✅");
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Chargement…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Profil indisponible</div>
          <div style={{ opacity: 0.85, marginBottom: 14 }}>{error}</div>
          <Link to="/home" style={linkStyle}>Retour</Link>
        </div>
      </div>
    );
  }

  if (!u) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div>Profil introuvable.</div>
          <Link to="/home" style={linkStyle}>Retour</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={bannerStyle} />

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: -26 }}>
          <div style={avatarWrapStyle}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={avatarStyle} />
            ) : (
              <div style={avatarFallbackStyle}>👤</div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{u.name || "Utilisateur"}</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>
              📞 {u.phone || "—"} <span style={dotStyle} /> 📍 {u.location || "—"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button style={btnPrimary} onClick={copyLink} type="button">
            Copier le lien
          </button>

          <Link to="/login" style={{ ...btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Se connecter
          </Link>
        </div>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
          Profil public ShoraDream (partageable).
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 16,
  background: "#0b0b0f",
  color: "white",
};

const cardStyle = {
  width: "min(560px, 100%)",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};

const bannerStyle = {
  height: 90,
  borderRadius: 14,
  background: "linear-gradient(90deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
};

const avatarWrapStyle = {
  width: 74,
  height: 74,
  borderRadius: 18,
  overflow: "hidden",
  border: "2px solid rgba(255,255,255,0.25)",
  background: "rgba(0,0,0,0.35)",
};

const avatarStyle = { width: "100%", height: "100%", objectFit: "cover" };

const avatarFallbackStyle = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontSize: 28,
};

const dotStyle = {
  display: "inline-block",
  width: 6,
  height: 6,
  borderRadius: 99,
  background: "rgba(255,255,255,0.35)",
  margin: "0 10px",
  transform: "translateY(-1px)",
};

const btnPrimary = {
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.18)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const btnGhost = {
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "10px 14px",
  borderRadius: 12,
  background: "transparent",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const linkStyle = {
  color: "white",
  opacity: 0.9,
};