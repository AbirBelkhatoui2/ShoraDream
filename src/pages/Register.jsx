import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const emailOk = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const validate = () => {
    const errors = {};
    if (!firstName.trim()) errors.firstName = "Le prénom est obligatoire.";
    if (!name.trim()) errors.name = "Le nom est obligatoire.";
    if (!email.trim()) errors.email = "L'email est obligatoire.";
    else if (!emailOk) errors.email = "Format email invalide.";
    if (!password) errors.password = "Le mot de passe est obligatoire.";
    else if (password.length < 6) errors.password = "Minimum 6 caractères.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:3001/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          location: location.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setServerError(data.message || "Erreur inscription");
        return;
      }

      navigate("/login");
    } catch (err) {
      console.error("REGISTER FETCH ERROR:", err);
      setServerError("Erreur réseau : " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="glow-card">
        <h2>Inscription</h2>

        {serverError && <div className="form-error">{serverError}</div>}

        {/* PRÉNOM */}
        <div className="form-group">
          <input
            placeholder="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          {fieldErrors.firstName && (
            <p className="field-error">{fieldErrors.firstName}</p>
          )}
        </div>

        {/* NOM */}
        <div className="form-group">
          <input
            placeholder="Nom (unique)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {fieldErrors.name && (
            <p className="field-error">{fieldErrors.name}</p>
          )}
        </div>

        {/* EMAIL */}
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

        {/* TÉLÉPHONE */}
        <div className="form-group">
          <input
            placeholder="Téléphone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* LIEU */}
        <div className="form-group">
          <input
            placeholder="Lieu (ville)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {/* MOT DE PASSE */}
        <div className="form-group">
          <input
            type="password"
            placeholder="Mot de passe (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && (
            <p className="field-error">{fieldErrors.password}</p>
          )}
        </div>

        <button
          className="magic-button"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Création..." : "Créer un compte"}
        </button>

        <p style={{ opacity: 0.8, fontSize: 13, marginTop: 14 }}>
          Déjà un compte ?{" "}
          <Link to="/login" style={{ color: "white" }}>
            Connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
