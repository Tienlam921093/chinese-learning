/**
 * NGÔN NGỮ : JavaScript ES6+ (Vanilla JS)
 * THƯ VIỆN : AOS, Bootstrap 5 (via CDN)
 * MỤC ĐÍCH : Logic chung cho toàn bộ website — navbar scroll, utils, toast, auth check
 */

"use strict";

// ==================== NAVBAR SCROLL ====================
const nav = document.getElementById("mainNav");
if (nav) {
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 50);
  });
}

// ==================== API HELPER ====================
// Auto-detect: dùng relative URL qua nginx proxy, fallback localhost cho dev
const API_BASE =
  window.location.port === "5500" || window.location.protocol === "file:"
    ? "http://localhost:5000/api"
    : "/api";
const ACCESS_TOKEN_KEY = "hanyuAccessToken";

function loadAccessToken() {
  try {
    return (
      sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
}

function storeAccessToken(token) {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  } catch {
    // Ignore storage failures; in-memory token is still available for this page.
  }
}

let _accessToken = loadAccessToken();

const api = {
  getToken: () => _accessToken,
  setToken: (t) => {
    _accessToken = t || null;
    storeAccessToken(t || null);
  },
  removeToken: () => {
    _accessToken = null;
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // Ignore storage failures.
    }
  },

  _refreshPromise: null,

  refreshAccessToken: async () => {
    if (!api._refreshPromise) {
      api._refreshPromise = (async () => {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.token)
          throw new Error(data.message || "Refresh token failed");
        api.setToken(data.token);
        return data.token;
      })().finally(() => {
        api._refreshPromise = null;
      });
    }
    return api._refreshPromise;
  },

  request: async (method, endpoint, body = null, hasRetried = false) => {
    const token = api.getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const options = { method, headers, credentials: "include" };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await res.json();
      if (!res.ok) {
        const shouldTryRefresh =
          res.status === 401 &&
          !hasRetried &&
          endpoint !== "/auth/login" &&
          endpoint !== "/auth/register" &&
          endpoint !== "/auth/refresh";

        if (shouldTryRefresh) {
          try {
            await api.refreshAccessToken();
            return api.request(method, endpoint, body, true);
          } catch {
            api.removeToken();
            throw new Error(
              "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            );
          }
        }
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`[API] ${method} ${endpoint}:`, err.message);
      throw err;
    }
  },

  get: (ep) => api.request("GET", ep),
  post: (ep, b) => api.request("POST", ep, b),
  put: (ep, b) => api.request("PUT", ep, b),
  delete: (ep) => api.request("DELETE", ep),
};

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = "success") {
  const colors = {
    success: "#4CAF50",
    error: "#e63946",
    info: "#2196F3",
    warning: "#FF9800",
  };
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };

  const toast = document.createElement("div");
  toast.className = "toast-custom";
  const alert = document.createElement("div");
  alert.className =
    "alert alert-light border shadow-sm d-flex align-items-center gap-2 mb-2";
  alert.style.borderLeft = `4px solid ${colors[type] || colors.info}`;

  const iconEl = document.createElement("span");
  iconEl.textContent = icons[type] || icons.info;

  const msgEl = document.createElement("span");
  msgEl.className = "flex-grow-1";
  msgEl.textContent = String(message ?? "");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-close ms-auto";
  closeBtn.addEventListener("click", () => toast.remove());

  alert.appendChild(iconEl);
  alert.appendChild(msgEl);
  alert.appendChild(closeBtn);
  toast.appendChild(alert);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ==================== AUTH UTILS ====================
function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("hanyuUser") ||
        sessionStorage.getItem("hanyuUser") ||
        "null",
    );
  } catch {
    return null;
  }
}

function requireAuth(redirectTo = "../pages/login.html") {
  if (!getCurrentUser()) {
    showToast("Vui lòng đăng nhập để tiếp tục", "warning");
    setTimeout(() => (window.location.href = redirectTo), 1200);
    return false;
  }
  return true;
}

function logout() {
  fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" })
    .catch(() => null)
    .finally(() => {
      api.removeToken();
      localStorage.removeItem("hanyuUser");
      sessionStorage.removeItem("hanyuUser");
      showToast("Đã đăng xuất thành công", "info");
      setTimeout(() => (window.location.href = "../index.html"), 1200);
    });
}

// ==================== USER PROGRESS (LocalStorage fallback) ====================
const userProgress = {
  get: () => JSON.parse(localStorage.getItem("hanyuProgress") || "{}"),
  set: (key, val) => {
    const p = userProgress.get();
    p[key] = val;
    localStorage.setItem("hanyuProgress", JSON.stringify(p));
  },
  incrementXP: (amount) => {
    const p = userProgress.get();
    p.xp = (p.xp || 0) + amount;
    p.streak = p.streak || 0;
    const today = new Date().toDateString();
    if (p.lastStudy !== today) {
      p.streak++;
      p.lastStudy = today;
    }
    localStorage.setItem("hanyuProgress", JSON.stringify(p));
    return p;
  },
};

// ==================== CHINESE UTILITIES ====================
const toneColors = {
  1: "#4CAF50",
  2: "#2196F3",
  3: "#FF9800",
  4: "#e63946",
  0: "#9E9E9E",
};
const toneNames = {
  1: "Thanh 1 (–)",
  2: "Thanh 2 (↗)",
  3: "Thanh 3 (↘↗)",
  4: "Thanh 4 (↘)",
  0: "Thanh nhẹ (·)",
};

function getToneNumber(pinyinSyllable) {
  const toneMap = {
    ā: 1,
    á: 2,
    ǎ: 3,
    à: 4,
    ē: 1,
    é: 2,
    ě: 3,
    è: 4,
    ī: 1,
    í: 2,
    ǐ: 3,
    ì: 4,
    ō: 1,
    ó: 2,
    ǒ: 3,
    ò: 4,
    ū: 1,
    ú: 2,
    ǔ: 3,
    ù: 4,
    ǖ: 1,
    ǘ: 2,
    ǚ: 3,
    ǜ: 4,
  };
  for (const [char, tone] of Object.entries(toneMap)) {
    if (pinyinSyllable.includes(char)) return tone;
  }
  return 0;
}

function renderHanzi(char, pinyin, meaning) {
  const tone = getToneNumber(pinyin);
  const color = toneColors[tone] || toneColors[0];
  return `
    <div class="vocab-card">
      <div class="hanzi">${char}</div>
      <div class="pinyin">${pinyin}</div>
      <span class="tone-mark" style="background:${color}">${toneNames[tone]}</span>
      <div class="meaning mt-2">${meaning}</div>
    </div>`;
}

// ==================== SMOOTH SCROLL ====================
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ==================== EXPOSE GLOBALS ====================
window.api = api;
window.showToast = showToast;
window.getCurrentUser = getCurrentUser;
window.requireAuth = requireAuth;
window.logout = logout;
window.userProgress = userProgress;
window.renderHanzi = renderHanzi;
window.getToneNumber = getToneNumber;
window.toneColors = toneColors;
