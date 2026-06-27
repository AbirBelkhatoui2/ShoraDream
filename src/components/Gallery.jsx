// src/components/Gallery.jsx
import { useState } from "react";
import { createPortal } from "react-dom";

export default function Gallery({ images = [], alt = "" }) {
  const imgs = (images || []).filter(Boolean).slice(0, 4);
  const [lightbox, setLightbox] = useState(null);

  if (imgs.length === 0) return null;

  const open  = (i) => setLightbox(i);
  const close = ()  => setLightbox(null);
  const prev  = (e) => { e.stopPropagation(); setLightbox(i => (i - 1 + imgs.length) % imgs.length); };
  const next  = (e) => { e.stopPropagation(); setLightbox(i => (i + 1) % imgs.length); };

  return (
    <>
      {/* ── GRILLE ── */}
      {imgs.length === 1 && (
        <div className="gal-1">
          <img src={imgs[0]} alt={alt} onClick={() => open(0)} style={{ cursor: "pointer" }} />
        </div>
      )}

      {imgs.length === 2 && (
        <div className="gal-2">
          {imgs.map((src, i) => (
            <img key={i} src={src} alt={alt} onClick={() => open(i)} style={{ cursor: "pointer" }} />
          ))}
        </div>
      )}

      {imgs.length === 3 && (
        <div className="gal-3">
          <img className="gal-3-big" src={imgs[0]} alt={alt} onClick={() => open(0)} style={{ cursor: "pointer" }} />
          <div className="gal-3-right">
            <img src={imgs[1]} alt={alt} onClick={() => open(1)} style={{ cursor: "pointer" }} />
            <img src={imgs[2]} alt={alt} onClick={() => open(2)} style={{ cursor: "pointer" }} />
          </div>
        </div>
      )}

      {imgs.length === 4 && (
        <div className="gal-4">
          {imgs.map((src, i) => (
            <img key={i} src={src} alt={alt} onClick={() => open(i)} style={{ cursor: "pointer" }} />
          ))}
        </div>
      )}

      {/* ── LIGHTBOX via createPortal → rendu dans document.body ── */}
      {lightbox !== null && createPortal(
        <div
          onClick={close}
          style={{
            position: "fixed",
            top: 0, left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.95)",
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Fermer */}
          <button
            onClick={close}
            style={{
              position: "fixed", top: 20, right: 20,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white", fontSize: 22,
              width: 48, height: 48,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 2147483647,
            }}
          >✕</button>

          {/* Précédent */}
          {imgs.length > 1 && (
            <button
              onClick={prev}
              style={{
                position: "fixed", left: 20, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white", fontSize: 28,
                width: 52, height: 52,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 2147483647,
              }}
            >‹</button>
          )}

          {/* Image */}
          <img
            src={imgs[lightbox]}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "88vw",
              maxHeight: "88vh",
              objectFit: "contain",
              borderRadius: 16,
              boxShadow: "0 25px 100px rgba(0,0,0,0.8)",
              userSelect: "none",
            }}
          />

          {/* Suivant */}
          {imgs.length > 1 && (
            <button
              onClick={next}
              style={{
                position: "fixed", right: 20, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white", fontSize: 28,
                width: 52, height: 52,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 2147483647,
              }}
            >›</button>
          )}

          {/* Indicateurs */}
          {imgs.length > 1 && (
            <div style={{
              position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
              display: "flex", gap: 10,
              zIndex: 2147483647,
            }}>
              {imgs.map((_, i) => (
                <div
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightbox(i); }}
                  style={{
                    width: i === lightbox ? 28 : 10,
                    height: 10,
                    borderRadius: 999,
                    background: i === lightbox ? "#a78bfa" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                />
              ))}
            </div>
          )}

          {/* Compteur */}
          {imgs.length > 1 && (
            <div style={{
              position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 999,
              padding: "6px 16px",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              zIndex: 2147483647,
            }}>
              {lightbox + 1} / {imgs.length}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
