/**
 * OAUTH CALLBACK — JavaScript
 * FIX N26: Tách từ inline <script> ra file riêng
 */
(async function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");
  const provider = params.get("provider");

  function resolveApiBase() {
    const configured =
      window.HANYU_API_BASE_URL || window.HANYU_API_BASE || window.API_BASE_URL;
    if (configured && String(configured).trim()) {
      const normalized = String(configured).trim().replace(/\/+$/, "");
      return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
    }
    return window.location.port === "5500" || window.location.protocol === "file:"
      ? "http://localhost:5000/api"
      : "/api";
  }
  const API_BASE = resolveApiBase();

  function defaultPageForRole(user) {
    if (user?.role === "admin") return "admin-dashboard.html";
    if (user?.role === "teacher") return "teacher-dashboard.html";
    return "lessons.html";
  }

  function showError(msg) {
    document.getElementById("spinner").style.display = "none";
    document.getElementById("msg").textContent = "Đăng nhập thất bại";
    document.getElementById("sub").style.display = "none";
    const box = document.getElementById("errorBox");
    box.style.display = "block";
    document.getElementById("errorMsg").textContent = msg;
  }

  if (error) {
    const errorMessages = {
      oauth_failed: "Xác thực OAuth thất bại. Vui lòng thử lại.",
      google_failed: "Đăng nhập Google thất bại. Vui lòng thử lại.",
      fb_failed: "Đăng nhập Facebook thất bại. Vui lòng thử lại.",
      facebook_failed: "Đăng nhập Facebook thất bại. Vui lòng thử lại.",
      oauth_not_configured: `Đăng nhập ${provider || "OAuth"} chưa được cấu hình trên server.`,
    };
    showError(errorMessages[error] || "Đã xảy ra lỗi. Vui lòng thử lại.");
    return;
  }

  if (!code) {
    showError("Không nhận được mã xác thực từ server.");
    return;
  }

  window.history.replaceState({}, "", "oauth-callback.html");

  try {
    const res = await fetch(`${API_BASE}/auth/oauth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Lỗi xác thực");

    localStorage.removeItem("hanyuUser");
    sessionStorage.removeItem("hanyuUser");
    sessionStorage.setItem(
      "hanyuUser",
      JSON.stringify({
        ...data.user,
        auth_source: data.user?.auth_source || "oauth",
      }),
    );
    if (typeof window.setAccessToken === "function") {
      window.setAccessToken(data.token);
    } else if (data.token) {
      sessionStorage.setItem("hanyuAccessToken", data.token);
    }

    if (!localStorage.getItem("hanyuProgress")) {
      localStorage.setItem(
        "hanyuProgress",
        JSON.stringify({ xp: 0, streak: 0 }),
      );
    }

    const redirectTarget =
      localStorage.getItem("oauthRedirect") ||
      localStorage.getItem("payAfterLogin") ||
      defaultPageForRole(data.user);
    localStorage.removeItem("oauthRedirect");
    localStorage.removeItem("payAfterLogin");

    document.getElementById("msg").textContent =
      `Chào mừng, ${data.user.name}! 🎉`;
    document.getElementById("sub").textContent = "Đang chuyển trang...";
    setTimeout(() => {
      window.location.href = redirectTarget;
    }, 800);
  } catch (e) {
    showError(e.message || "Dữ liệu xác thực không hợp lệ. Vui lòng thử lại.");
  }
})();
