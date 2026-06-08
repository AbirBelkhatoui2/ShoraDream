import { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

// 3 étapes : "login" | "forgot_send" | "forgot_verify"
export default function Login() {
  const { login, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState("login");

  // -- login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // -- mot de passe oublié étape 1 (envoi code)
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // -- mot de passe oublié étape 2 (vérif code + nouveau mdp)
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  useEffect(() => {
    if (token) navigate("/home");
  }, [token, navigate]);

  // ── Connexion normale ──────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!email.trim()) errors.email = "L'email est obligatoire.";
    if (!password) errors.password = "Le mot de passe est obligatoire.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.message || "Email ou mot de passe incorrect");
        return;
      }
      login(data.token, data.user);
      navigate("/home");
    } catch (err) {
      setServerError("Erreur réseau : " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // ── Étape 1 : envoyer le code par email ───────────────────────────
  const handleSendCode = async () => {
    setForgotError("");
    setForgotSuccess("");
    if (!forgotEmail.trim()) {
      setForgotError("L'email est obligatoire.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:3001/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setForgotError(data.message || "Erreur envoi email.");
        return;
      }
      setForgotSuccess("Code envoyé ! Vérifie ta boîte mail 📧");
      // passe à l'étape 2
      setTimeout(() => setStep("forgot_verify"), 1500);
    } catch (err) {
      setForgotError("Erreur réseau : " + (err?.message || err));
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Étape 2 : vérifier le code + nouveau mot de passe ─────────────
  const handleResetPassword = async () => {
    setResetError("");
    setResetSuccess("");
    if (!resetCode.trim()) { setResetError("Le code est obligatoire."); return; }
    if (!newPassword || newPassword.length < 6) {
      setResetError("Minimum 6 caractères."); return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:3001/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: resetCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(data.message || "Code incorrect ou expiré.");
        return;
      }
      setResetSuccess("Mot de passe modifié ✅ Tu peux te connecter !");
      setTimeout(() => {
        setStep("login");
        setResetCode("");
        setNewPassword("");
        setForgotEmail("");
      }, 2000);
    } catch (err) {
      setResetError("Erreur réseau : " + (err?.message || err));
    } finally {
      setResetLoading(false);
    }
  };

  // ── RENDU ──────────────────────────────────────────────────────────

  // Étape 1 : saisie email pour recevoir le code
  if (step === "forgot_send") {
    return (
      <div className="login-page">
        <div className="glow-card">
          <h2>Mot de passe oublié</h2>
          <p style={{ opacity: 0.75, fontSize: 13, marginBottom: 16 }}>
            Saisis ton email — on t'envoie un code à 6 chiffres.
          </p>

          {forgotError && <div className="form-error">{forgotError}</div>}
          {forgotSuccess && (
            <div className="form-error" style={{ background: "rgba(2,195,154,0.15)", borderColor: "#02C39A", color: "#02C39A" }}>
              {forgotSuccess}
            </div>
          )}

          <div className="form-group">
            <input
              placeholder="Ton email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              type="email"
            />
          </div>

          <button
            className="magic-button"
            onClick={handleSendCode}
            disabled={forgotLoading}
          >
            {forgotLoading ? "Envoi en cours..." : "Envoyer le code"}
          </button>

          <p style={{ opacity: 0.8, fontSize: 13, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setStep("login")}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", textDecoration: "underline" }}
            >
              ← Retour à la connexion
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Étape 2 : saisie du code + nouveau mot de passe
  if (step === "forgot_verify") {
    return (
      <div className="login-page">
        <div className="glow-card">
          <h2>Nouveau mot de passe</h2>
          <p style={{ opacity: 0.75, fontSize: 13, marginBottom: 16 }}>
            Entre le code reçu par email et ton nouveau mot de passe.
          </p>

          {resetError && <div className="form-error">{resetError}</div>}
          {resetSuccess && (
            <div className="form-error" style={{ background: "rgba(2,195,154,0.15)", borderColor: "#02C39A", color: "#02C39A" }}>
              {resetSuccess}
            </div>
          )}

          <div className="form-group">
            <input
              placeholder="Code à 6 chiffres"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              maxLength={6}
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Nouveau mot de passe (min 6)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <button
            className="magic-button"
            onClick={handleResetPassword}
            disabled={resetLoading}
          >
            {resetLoading ? "Vérification..." : "Changer le mot de passe"}
          </button>

          <p style={{ opacity: 0.8, fontSize: 13, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setStep("forgot_send")}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", textDecoration: "underline" }}
            >
              ← Renvoyer un code
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Étape 0 : connexion normale
  return (
    <div className="login-page">
      <div className="glow-card">
        <h2>Connexion</h2>

        {serverError && <div className="form-error">{serverError}</div>}

        <div className="form-group">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && (
            <p className="field-error">{fieldErrors.email}</p>
          )}
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && (
            <p className="field-error">{fieldErrors.password}</p>
          )}
        </div>

        {/* Mot de passe oublié */}
        <div style={{ textAlign: "right", marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => { setStep("forgot_send"); setForgotEmail(email); }}
            style={{
              background: "none", border: "none",
              color: "rgba(255,255,255,0.65)", cursor: "pointer",
              fontSize: 13, textDecoration: "underline",
            }}
          >
            Mot de passe oublié ?
          </button>
        </div>

        <button
          className="magic-button"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p style={{ opacity: 0.8, fontSize: 13, marginTop: 14 }}>
          Pas de compte ?{" "}
          <Link to="/register" style={{ color: "white" }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
