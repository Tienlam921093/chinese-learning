/**
 * REGISTER PAGE — JavaScript
 * FIX N26: Tách từ inline <script> ra file riêng
 */
"use strict";

const IS_LOCAL_DEV =
  window.location.protocol === "file:" ||
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = IS_LOCAL_DEV ? "http://localhost:5000/api" : "/api";

/* ── Alert ── */
function showAlert(msg, type = "error") {
  const el = document.getElementById("alertBox");
  el.className = `alert-box show ${type}`;
  el.innerHTML = msg;
}
function hideAlert() {
  document.getElementById("alertBox").className = "alert-box";
}

/* ── Button loading state ── */
function setLoading(on) {
  const btn = document.getElementById("regBtn");
  btn.disabled = on;
  btn.innerHTML = on
    ? '<div class="spinner"></div> Đang tạo tài khoản...'
    : '<i class="fa fa-user-plus"></i> Tạo Tài Khoản';
}

/* ── Save session & go to lessons ── */
function saveAndGo(token, user) {
  localStorage.removeItem("hanyuUser");
  sessionStorage.removeItem("hanyuUser");
  sessionStorage.setItem("hanyuUser", JSON.stringify(user));
  if (typeof window.setAccessToken === "function") {
    window.setAccessToken(token);
  }
  showAlert("🎉 Đăng ký thành công! Đang vào trang học...", "success");
  setTimeout(() => {
    const _pay = localStorage.getItem("payAfterLogin");
    if (_pay) {
      localStorage.removeItem("payAfterLogin");
      window.location.href = _pay;
    } else {
      window.location.href = "lessons.html";
    }
  }, 900);
}

/* ── Dev fallback (security hardening) ──
 * Không tạo token giả khi backend không chạy.
 * Demo local không còn được hỗ trợ để tránh bypass auth.
 */
function devBackendRequired() {
  showAlert(
    "⚠️ Cần chạy backend (Docker/Server) để đăng ký và nhận token đăng nhập.",
    "error",
  );
}

/* ── Social login ── */
function socialLogin(provider) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 800);
  fetch(`${API_BASE}/health`, { signal: ctrl.signal })
    .then((r) => {
      clearTimeout(t);
      if (r.ok) {
        window.location.href = `${API_BASE}/auth/${provider}`;
      } else if (IS_LOCAL_DEV) {
        fallbackSocial(provider);
      } else {
        showAlert("⚠️ Dịch vụ OAuth hiện không khả dụng");
      }
    })
    .catch(() => {
      if (IS_LOCAL_DEV) fallbackSocial(provider);
      else showAlert("⚠️ Không thể kết nối server OAuth");
    });
}
function fallbackSocial(provider) {
  devBackendRequired();
}

/* ── Terms modal ── */
function openTerms(e) {
  e.preventDefault();
  document.getElementById("termsOverlay").classList.add("open");
}
function closeTerms() {
  document.getElementById("termsOverlay").classList.remove("open");
}
function closeTermsOutside(e) {
  if (e.target === document.getElementById("termsOverlay")) closeTerms();
}
function acceptTerms() {
  document.getElementById("terms").checked = true;
  closeTerms();
}

/* ── Main register flow ── */
async function handleRegister() {
  const name = document.getElementById("fullname").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const terms = document.getElementById("terms").checked;

  if (!name) {
    showAlert("⚠️ Vui lòng nhập họ và tên");
    return;
  }
  if (!email || !email.includes("@")) {
    showAlert("⚠️ Vui lòng nhập email hợp lệ");
    return;
  }
  if (password.length < 6) {
    showAlert("⚠️ Mật khẩu phải có ít nhất 6 ký tự");
    return;
  }
  if (!terms) {
    showAlert("⚠️ Vui lòng đồng ý với điều khoản sử dụng");
    return;
  }

  setLoading(true);
  hideAlert();

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 800);
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json();

    if (res.status === 409) {
      showAlert(
        '⚠️ Email này đã được đăng ký. <a href="login.html" style="color:var(--red);font-weight:700">Đăng nhập?</a>',
      );
      setLoading(false);
      return;
    }
    if (res.ok && data.token) {
      saveAndGo(data.token, data.user);
      return;
    }
    if (IS_LOCAL_DEV) {
      devBackendRequired();
      setLoading(false);
    } else {
      showAlert("⚠️ " + (data.message || "Đăng ký thất bại"));
      setLoading(false);
    }
  } catch {
    if (IS_LOCAL_DEV) {
      devBackendRequired();
    } else {
      showAlert("⚠️ Không thể kết nối server");
    }
    setLoading(false);
  }
}

/* Enter key */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement.tagName !== "SELECT")
    handleRegister();
});
