// src/components/UserForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiSend } from "../api.js";

export default function UserForm({ token, initialUser, onClose, onSaved }) {
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const [summary, setSummary] = useState("");
  const [skillsText, setSkillsText] = useState(""); // ex: "Web, Admin, React"

  const [avatarFile, setAvatarFile] = useState(null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = initialUser || {};
    setName(u.name || "");
    setEmail(u.email || "");
    setPhone(u.phone || "");
    setLocation(u.location || "");
    setSummary(u.summary || "");
    setSkillsText(Array.isArray(u.topSkills) ? u.topSkills.join(", ") : "");
  }, [initialUser]);

  const topSkills = useMemo(() => {
    return String(skillsText || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [skillsText]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError(t("missing_token") || "Token manquant. Reconnecte-toi.");
      return;
    }
    if (!name.trim()) {
      setError(t("err_name_required") || "Nom obligatoire.");
      return;
    }
    if (!email.trim()) {
      setError(t("err_email_required") || "Email obligatoire.");
      return;
    }

    setSaving(true);
    try {
      // 1) Update infos + summary + topSkills
      const res1 = await apiSend("/users/me", "PUT", token, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        location: location.trim(),
        summary: summary.trim(),
        topSkills,
      });

      let updatedUser = res1.user;

      // 2) Upload avatar si choisi
      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const res2 = await apiSend("/users/avatar", "POST", token, fd);

        updatedUser = { ...(updatedUser || {}), avatar: res2.avatar };
      }

      onSaved?.(updatedUser);
      onClose?.();
    } catch (e2) {
      setError(e2?.message || String(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="userform">
      <div className="userform__row">
        <label>{t("name") || "Nom"}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("your_name") || "Ton nom"} />
      </div>

      <div className="userform__row">
        <label>{t("email") || "Email"}</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
      </div>

      <div className="userform__row">
        <label>{t("phone") || "Téléphone"}</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phone") || "Téléphone"} />
      </div>

      <div className="userform__row">
        <label>{t("location") || "Lieu"}</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("city") || "Ville"} />
      </div>

      {/* ✅ Summary */}
      <div className="userform__row">
        <label>{t("summary") || "Résumé"}</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={t("summary_text") || "Résumé…"}
          rows={3}
        />
      </div>

      {/* ✅ Top Skills */}
      <div className="userform__row">
        <label>{t("top_skills") || "Top Skills"}</label>
        <input
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="Web, Admin, Organisation, Communication, React"
        />
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
          Sépare par des virgules (ex: Web, Admin, React)
        </div>
      </div>

      {/* ✅ Avatar */}
      <div className="userform__row">
        <label>{t("change_photo") || "Changer la photo"}</label>
        <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
      </div>

      {error ? <div style={{ color: "salmon", marginTop: 10 }}>{error}</div> : null}

      <div className="userform__actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
        <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
          {t("cancel") || "Annuler"}
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? (t("saving") || "Enregistrement...") : (t("save") || "Enregistrer")}
        </button>
      </div>
    </form>
  );
}