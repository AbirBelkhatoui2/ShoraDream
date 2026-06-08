import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { DreamsContext } from "../context/DreamsContext.jsx";


export default function Upload() {
  const { token } = useContext(AuthContext);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Choisis un fichier");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("audio", file);
 const res = await fetch("http://127.0.0.1:3001/stars", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
    if (!res.ok) return alert("Erreur upload");
    alert("Upload réussi ⭐");
  };

  return (
    <div className="login-page">
      <div className="glow-card">
        <h2>Ajouter une étoile</h2>

        <input
          placeholder="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button className="magic-button" onClick={handleSubmit}>
          Envoyer
        </button>
      </div>
    </div>
  );
}
