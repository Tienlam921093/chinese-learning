/**
 * SHARED HELPERS — Common utilities for all app pages
 * FIX N26: Tách helper functions chung giữa các trang
 */
"use strict";

// Global API base URL — accessible to all scripts
window.API = window.HANYU_API =
  window.location.protocol === "file:"
    ? "http://localhost:5000/api" // Local file:// dev only
    : "/api"; // Use nginx proxy (same origin, same port) for all HTTP(S)
const ACCESS_TOKEN_KEY = "hanyuAccessToken";

function getTokenStore() {
  return sessionStorage;
}

function loadAccessToken() {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

let _accessToken = loadAccessToken();

function getToken() {
  return _accessToken;
}

function setAccessToken(token) {
  _accessToken = token || null;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  } catch {
    // Ignore storage errors; memory token still works for the current page.
  }
}

function clearAccessToken() {
  _accessToken = null;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function getUser() {
  try {
    return JSON.parse(
      localStorage.getItem("hanyuUser") ||
        sessionStorage.getItem("hanyuUser") ||
        "{}",
    );
  } catch {
    return {};
  }
}

function getProgressKey() {
  const uid = getUser().id || "guest";
  return "hanyuProgress_" + uid;
}

function escapeHTML(str) {
  if (typeof str !== "string") return str;
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

function logout() {
  fetch(`${HANYU_API}/auth/logout`, { method: "POST", credentials: "include" })
    .catch(() => null)
    .finally(() => {
      clearAccessToken();
      localStorage.removeItem("hanyuUser");
      sessionStorage.removeItem("hanyuUser");
      sessionStorage.removeItem("hanyuHomeRestoredOnce");
      location.replace("login.html");
    });
}

/* ── Token refresh ── */
let _refreshPromise = null;
async function refreshAccessToken() {
  // Nếu đã có access token hợp lệ, thử dùng trước
  const currentToken = getToken();
  if (currentToken) {
    try {
      // Kiểm tra token hiện tại bằng cách gọi /me endpoint
      const testRes = await fetch(`${HANYU_API}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        credentials: "include",
      });
      if (testRes.ok) {
        // Token hiện tại vẫn còn hợp lệ, không cần refresh
        return;
      }
    } catch {
      // Token không hợp lệ hoặc hết hạn, tiếp tục refresh
    }
  }

  // Thực hiện refresh token
  if (!_refreshPromise) {
    _refreshPromise = fetch(`${HANYU_API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.token) throw new Error("refresh failed");
        setAccessToken(data.token);
      })
      .finally(() => {
        _refreshPromise = null;
      });
  }
  return _refreshPromise;
}

async function restoreAuthSession() {
  const cachedUser = getUser();
  if (cachedUser?.id) return cachedUser;

  try {
    const refreshRes = await fetch(`${HANYU_API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok || !refreshData.token) return null;

    const meRes = await fetch(`${HANYU_API}/auth/me`, {
      headers: { Authorization: `Bearer ${refreshData.token}` },
      credentials: "include",
    });
    if (!meRes.ok) return null;

    const { user } = await meRes.json();
    if (!user?.id) return null;

    const store = localStorage;
    store.setItem("hanyuUser", JSON.stringify(user));
    setAccessToken(refreshData.token);
    return user;
  } catch {
    return null;
  }
}

async function authFetch(url, options = {}, retried = false) {
  let token = getToken();
  if (!token && !retried) {
    try {
      await refreshAccessToken();
      token = getToken();
    } catch {}
  }
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  if (res.status === 401 && !retried) {
    try {
      await refreshAccessToken();
      return authFetch(url, options, true);
    } catch {
      clearAccessToken();
      return res;
    }
  }
  return res;
}

async function ensureAuthSession(redirectTo = "login.html") {
  try {
    if (getToken()) return true;
    const user = await restoreAuthSession();
    if (user) return true;
    await refreshAccessToken();
    return true;
  } catch {
    location.replace(redirectTo);
    return false;
  }
}

/* ── Sidebar init (for pages with sidebar) ── */
function initSidebar() {
  const me = getUser();
  const el = (id) => document.getElementById(id);
  if (el("uAva")) el("uAva").textContent = (me.name || "?")[0].toUpperCase();
  if (el("uName")) el("uName").textContent = me.name || "…";
  if (el("uXP")) el("uXP").textContent = me.xp || 0;
  if (el("uHSK")) el("uHSK").textContent = me.hsk_level || 1;
  if (el("uStreak")) el("uStreak").textContent = "🔥 " + (me.streak || 0);
  if (el("topXP")) el("topXP").textContent = me.xp || 0;
  if (el("topStreak")) el("topStreak").textContent = me.streak || 0;
  if (el("todayDate"))
    el("todayDate").textContent = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const pct = Math.min(100, ((me.xp || 0) % 500) / 5);
  if (el("uXPBar")) el("uXPBar").style.width = pct + "%";
}

/* ── Color helpers ── */
const COLORS = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];
function colorOf(name) {
  return COLORS[(name || "").charCodeAt(0) % COLORS.length];
}
function initial(name) {
  return (name || "?")[0].toUpperCase();
}

/* ── Backward compat: expose shared API base without colliding with older scripts ── */
window.API = HANYU_API;
window.API_BASE = HANYU_API;
// Expose token helpers for other modules (login, oauth, reset-password)
window.setAccessToken = setAccessToken;
window.getToken = getToken;
window.clearAccessToken = clearAccessToken;
window.restoreAuthSession = restoreAuthSession;
const IS_LOCAL_DEV =
  window.location.protocol === "file:" ||
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
