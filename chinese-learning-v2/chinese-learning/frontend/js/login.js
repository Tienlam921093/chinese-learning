/**
 * LOGIN PAGE — JavaScript
 * FIX N26: Tách từ inline <script> ra file riêng
 */
"use strict";

const IS_LOCAL_DEV =
  window.location.protocol === "file:" ||
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
function resolveApiBase() {
  const configured =
    window.HANYU_API_BASE_URL || window.HANYU_API_BASE || window.API_BASE_URL;
  if (configured && String(configured).trim()) {
    const normalized = String(configured).trim().replace(/\/+$/, "");
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  }
  return window.location.protocol === "file:"
    ? "http://localhost:5000/api" // Only for file:// dev - no nginx proxy available
    : "/api"; // Use nginx proxy for all HTTP(S) including localhost:8080
}
const API_BASE = resolveApiBase();
const LOGIN_PARAMS = new URLSearchParams(window.location.search);
// decodeURIComponent để xử lý redirect có chứa query string (vd: payment.html?plan=pro)
const _rawRedirect = LOGIN_PARAMS.get("redirect");
const LOGIN_REDIRECT =
  (_rawRedirect ? decodeURIComponent(_rawRedirect) : null) ||
  localStorage.getItem("payAfterLogin") ||
  "lessons.html";

function showAlert(msg, type = "error") {
  const el = document.getElementById("alertBox");
  el.className = `alert-box show ${type}`;
  el.innerHTML = msg;
}
function hideAlert() {
  document.getElementById("alertBox").className = "alert-box";
}

function togglePwd() {
  const inp = document.getElementById("password");
  const icon = document.getElementById("eyeIcon");
  if (inp.type === "password") {
    inp.type = "text";
    icon.className = "fa fa-eye-slash";
  } else {
    inp.type = "password";
    icon.className = "fa fa-eye";
  }
}

function setLoading(on) {
  const btn = document.getElementById("loginBtn");
  btn.disabled = on;
  btn.innerHTML = on
    ? '<div class="spinner"></div> Đang đăng nhập...'
    : '<i class="fa fa-sign-in-alt"></i> Đăng Nhập';
}

/* ── Save session ── */
function saveSession(token, user) {
  const remember = document.getElementById("remember")?.checked;
  localStorage.removeItem("hanyuUser");
  sessionStorage.removeItem("hanyuUser");
  sessionStorage.removeItem("hanyuAccessToken");
  const sessionUser = {
    ...user,
    auth_source: user?.auth_source || "password",
  };
  if (remember) {
    localStorage.setItem("hanyuUser", JSON.stringify(sessionUser));
  } else {
    sessionStorage.setItem("hanyuUser", JSON.stringify(sessionUser));
  }
  if (typeof window.setAccessToken === "function") {
    window.setAccessToken(token);
  }
}

/* ── Social login ── */
function socialLogin(provider) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 800);
  const oauthRedirect =
    new URLSearchParams(window.location.search).get("redirect") ||
    localStorage.getItem("payAfterLogin") ||
    "lessons.html";
  localStorage.setItem("oauthRedirect", oauthRedirect);
  fetch(`${API_BASE}/health`, { signal: ctrl.signal })
    .then((r) => {
      clearTimeout(t);
      if (r.ok) {
        window.location.href = `${API_BASE}/auth/${provider}`;
      } else {
        showAlert("⚠️ Dịch vụ OAuth hiện không khả dụng");
      }
    })
    .catch(() => {
      showAlert("⚠️ Không thể kết nối server OAuth");
    });
}

/* ── Main login ── */
async function handleLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email) {
    showAlert("⚠️ Vui lòng nhập email");
    return;
  }
  if (!password) {
    showAlert("⚠️ Vui lòng nhập mật khẩu");
    return;
  }

  setLoading(true);
  hideAlert();

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json();

    if (res.status === 401) {
      showAlert("⚠️ Email hoặc mật khẩu không đúng");
      setLoading(false);
      return;
    }
    if (res.ok && data.token) {
      const userWithPlan = {
        ...data.user,
        plan: data.user?.plan || "free",
        plan_expiry: data.user?.plan_expiry || null,
      };
      saveSession(data.token, userWithPlan);
      localStorage.removeItem("payAfterLogin");
      showAlert("✅ Đăng nhập thành công!", "success");
      setTimeout(() => {
        window.location.href = LOGIN_REDIRECT;
      }, 800);
      return;
    }
    showAlert("⚠️ " + (data.message || "Đăng nhập thất bại"));
    setLoading(false);
  } catch (err) {
    const msg =
      err.name === "AbortError"
        ? "⚠️ Server không phản hồi (timeout). Kiểm tra Docker đang chạy không?"
        : "⚠️ Không thể kết nối server. Kiểm tra Docker đang chạy không?";
    showAlert(msg);
    setLoading(false);
  }
}

/* ── Forgot password ── */
function openForgot() {
  const email = document.getElementById("email").value.trim();
  if (email) document.getElementById("forgotEmail").value = email;
  document.getElementById("forgotMsg").style.display = "none";
  document.getElementById("forgotOverlay").classList.add("open");
}
function closeForgot() {
  document.getElementById("forgotOverlay").classList.remove("open");
}
function closeForgotOutside(e) {
  if (e.target === document.getElementById("forgotOverlay")) closeForgot();
}

async function sendReset() {
  const email = document.getElementById("forgotEmail").value.trim();
  const msg = document.getElementById("forgotMsg");
  const btn = document.querySelector("#forgotOverlay .btn-modal-send");
  if (!email || !email.includes("@")) {
    msg.style.cssText =
      "display:block;color:#991b1b;background:#fef2f2;padding:.5rem .75rem;border-radius:8px;border:1px solid #fecaca";
    msg.textContent = "⚠️ Vui lòng nhập email hợp lệ";
    return;
  }

  const prevBtnHtml = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Đang gửi...';
  }

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || "Không thể gửi email đặt lại mật khẩu");
    }

    msg.style.cssText =
      "display:block;color:#166534;background:#f0fdf4;padding:.5rem .75rem;border-radius:8px;border:1px solid #bbf7d0";
    msg.innerHTML = `✅ ${data.message || "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút."}`;
    if (data.devResetUrl) {
      msg.innerHTML += `<div style="margin-top:.5rem"><a href="${data.devResetUrl}" target="_blank" rel="noreferrer" style="color:#2563eb;font-weight:700">Mở link reset dev</a></div>`;
    }
    document.getElementById("forgotEmail").disabled = true;
  } catch (err) {
    msg.style.cssText =
      "display:block;color:#991b1b;background:#fef2f2;padding:.5rem .75rem;border-radius:8px;border:1px solid #fecaca";
    msg.textContent = `⚠️ ${err.message || "Không thể gửi yêu cầu. Vui lòng thử lại."}`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML =
        prevBtnHtml || '<i class="fa fa-paper-plane me-1"></i> Gửi Email';
    }
  }
}

/* Enter key */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
});
