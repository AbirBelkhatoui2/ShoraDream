import { apiSend } from "../api";

export default function UserActions({ userId, token }) {
  if (!userId) return null;

  return (
    <div className="flex gap-3 mt-4">
      <button
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        onClick={async () => {
          try {
            await apiSend(`/users/${userId}/report`, "POST", token, {});
            alert("Profil signalé.");
          } catch (e) {
            alert(e.message);
          }
        }}
      >
        Signaler
      </button>

      <button
        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg"
        onClick={async () => {
          try {
            await apiSend(`/users/${userId}/block`, "POST", token, {});
            alert("Utilisateur bloqué / débloqué.");
          } catch (e) {
            alert(e.message);
          }
        }}
      >
        Bloquer
      </button>
    </div>
  );
}