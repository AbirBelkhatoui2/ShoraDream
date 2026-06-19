// src/api.js
const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

function stripHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/<pre>/g, "")
    .replace(/<\/pre>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function parseJsonSafe(res) {
  const text = await res.text();
  const looksJson = text && (text.trim().startsWith("{") || text.trim().startsWith("["));

  if (looksJson) {
    try {
      return JSON.parse(text);
    } catch {
      // ignore
    }
  }

  return { message: stripHtml(text) || `Erreur (${res.status})` };
}

export async function apiGet(path, token) {
  const res = await fetch(API_BASE + path, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || `Erreur (${res.status})`);
  return data;
}

export async function apiSend(path, method, token, body) {
  const isForm = body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isForm ? {} : { "Content-Type": "application/json" }),
  };

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body == null ? undefined : isForm ? body : JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || `Erreur (${res.status})`);
  return data;
}

// ⭐ FAVORITES
export async function toggleFavorite(token, targetType, targetId) {
  return apiSend("/favorites/toggle", "POST", token, { targetType, targetId });
}

export async function getMyFavorites(token) {
  return apiGet("/favorites/mine", token);
}

// 📰 FEED
export async function getFeed(token, limit = 20) {
  return apiGet(`/feed?limit=${limit}`, token);
}

// 📢 ANNONCES
export async function getAnnonces(token) {
  return apiGet("/annonces", token);
}

// 🙏 BESOINS
export async function getBesoins(token) {
  return apiGet("/besoins", token);
}

// ⭐ STARS
export async function getStars(token) {
  return apiGet("/stars", token);
}