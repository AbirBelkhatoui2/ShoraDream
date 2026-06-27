// src/pages/Register.jsx
import { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

export default function Register() {
  const { login, token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => { if (token) navigate("/home"); }, [token, navigate]);

  // Étapes : "form" → "verify" → done
  const [step, setStep] = useState("form");

  // Champs
  const [firstName, setFirstName] = useState("");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [location,  setLocation]  = useState("");

  // Vérification email
  const [verifyCode,    setVerifyCode]    = useState("");
  const [codeSent,      setCodeSent]      = useState(false);
  const [codeVerified,  setCodeVerified]  = useState(false);
  const [cooldown,      setCooldown]      = useState(0);

  // UI
  const [loading,     setLoading]     = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Cooldown 60s entre chaque envoi
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const validateForm = () => {
    const errs = {};
    if (!name.trim())     errs.name     = "Nom obligatoire.";
    if (!email.trim())    errs.email    = "Email obligatoire.";
    if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Email invalide.";
    if (!password)        errs.password = "Mot de passe obligatoire.";
    if (password.length < 6) errs.password = "Minimum 6 caractères.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Étape 1 → vérification email
  const handleFormSubmit = () => {
    setServerError("");
    if (!validateForm()) return;
    setStep("verify");
  };

  // Envoyer le code par email
  const sendVerifyCode = async () => {
    setServerError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setServerError(data.message || "Erreur envoi email"); return; }
      setCodeSent(true);
      setCooldown(60);
    } catch (err) {
      setServerError("Erreur réseau : " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Vérifier le code
  const verifyEmailCode = async () => {
    setServerError("");
    if (!verifyCode.trim() || verifyCode.length !== 6) {
      setServerError("Saisis le code à 6 chiffres reçu par email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: verifyCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setServerError(data.message || "Code incorrect"); return; }
      setCodeVerified(true);
    } catch (err) {
      setServerError("Erreur réseau : " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Créer le compte
  const handleRegister = async () => {
    setServerError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          location: location.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setServerError(data.message || "Erreur inscription"); return; }

      // Auto-login
      const loginRes = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (loginRes.ok) { login(loginData.token, loginData.user); navigate("/home"); }
      else navigate("/login");
    } catch (err) {
      setServerError("Erreur réseau : " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // ── ÉTAPE VÉRIFICATION EMAIL ──
  if (step === "verify") return (
    <div className="login-page">
      <div className="glow-card">
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📧</div>
          <h2 style={{ margin: 0 }}>Vérifie ton email</h2>
          <p style={{ opacity: 0.7, fontSize: 13, marginTop: 8 }}>
            On va envoyer un code à <strong>{email}</strong>
          </p>
        </div>

        {serverError && <div className="form-error">{serverError}</div>}

        {/* Code reçu */}
        {codeSent && !codeVerified && (
          <>
            <p style={{ opacity: 0.65, fontSize: 12, textAlign: "center", marginBottom: 8 }}>
              Code envoyé ! Vérifie ta boîte mail (et les spams 📂)
            </p>
            <div className="form-group">
              <input
                placeholder="Code à 6 chiffres"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                style={{ letterSpacing: 8, fontSize: 24, textAlign: "center", fontWeight: 900 }}
                autoFocus
              />
            </div>
          </>
        )}

        {/* Vérifié */}
        {codeVerified && (
          <div className="form-error" style={{ background: "rgba(2,195,154,0.15)", borderColor: "#02C39A", color: "#02C39A", textAlign: "center", marginBottom: 14 }}>
            ✅ Email vérifié ! Ton compte est prêt.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>

          {/* Bouton envoyer/renvoyer */}
          {!codeVerified && (
            <button
              className="magic-button"
              type="button"
              onClick={sendVerifyCode}
              disabled={loading || cooldown > 0}
              style={{
                background: codeSent ? "rgba(255,255,255,0.08)" : undefined,
                border: codeSent ? "1px solid rgba(255,255,255,0.2)" : undefined,
              }}
            >
              {loading && !codeSent ? "Envoi…" :
               cooldown > 0 ? `Renvoyer dans ${cooldown}s` :
               codeSent ? "📨 Renvoyer le code" : "📨 Envoyer le code"}
            </button>
          )}

          {/* Bouton vérifier */}
          {codeSent && !codeVerified && (
            <button
              className="magic-button"
              type="button"
              onClick={verifyEmailCode}
              disabled={loading || verifyCode.length !== 6}
            >
              {loading ? "Vérification…" : "✅ Vérifier le code"}
            </button>
          )}

          {/* Bouton créer le compte */}
          {codeVerified && (
            <button
              className="magic-button"
              type="button"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "Création…" : "🎉 Créer mon compte"}
            </button>
          )}
        </div>

        <p style={{ opacity: 0.75, fontSize: 13, marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setStep("form"); setCodeSent(false);
              setCodeVerified(false); setVerifyCode("");
              setServerError(""); setCooldown(0);
            }}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", textDecoration: "underline" }}
          >
            ← Modifier mes informations
          </button>
        </p>
      </div>
    </div>
  );

  // ── ÉTAPE FORMULAIRE ──
  return (
    <div className="login-page">
      <div className="glow-card">
        <h2>Créer un compte</h2>
        <p style={{ opacity: 0.65, fontSize: 12, marginBottom: 12 }}>
          📧 Un code de vérification sera envoyé à ton email
        </p>

        {serverError && <div className="form-error">{serverError}</div>}

        <div className="form-group">
          <input placeholder="Prénom (optionnel)" value={firstName} onChange={e => setFirstName(e.target.value)} />
        </div>

        <div className="form-group">
          <input placeholder="Nom d'utilisateur *" value={name} onChange={e => setName(e.target.value)} />
          {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
        </div>

        <div className="form-group">
          <input placeholder="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
        </div>

        <div className="form-group">
          <input placeholder="Mot de passe * (min 6 caractères)" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
        </div>

        <div className="form-group">
          <input placeholder="📱 Téléphone (optionnel)" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>

        <div className="form-group">
          <input placeholder="Ville (optionnel)" value={location} onChange={e => setLocation(e.target.value)} />
        </div>

        <button className="magic-button" type="button" onClick={handleFormSubmit} disabled={loading}>
          Suivant → Vérifier mon email
        </button>

        <p style={{ opacity: 0.8, fontSize: 13, marginTop: 14 }}>
          Déjà un compte ?{" "}
          <Link to="/login" style={{ color: "white" }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
