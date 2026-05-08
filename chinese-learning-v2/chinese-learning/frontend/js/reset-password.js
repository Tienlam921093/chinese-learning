"use strict";
// helpers.js được load trước — dùng window.API, window.setAccessToken từ helpers
const API_BASE =
  window.API ||
  (window.location.protocol === "file:" ? "http://localhost:5000/api" : "/api");

function saveSession(token, user) {
  const sessionUser = {
    ...user,
    plan: user?.plan || "free",
    plan_expiry: user?.plan_expiry || null,
  };
  localStorage.removeItem("hanyuUser");
  sessionStorage.removeItem("hanyuUser");
  sessionStorage.setItem("hanyuUser", JSON.stringify(sessionUser));
  if (typeof window.setAccessToken === "function") {
    window.setAccessToken(token);
  }
}

function getTokenFromUrl() {
  return new URLSearchParams(window.location.search).get("token") || "";
}

function showAlert(msg, type = "error") {
  const el = document.getElementById("alertBox");
  el.className = `alert-box show ${type}`;
  el.innerHTML = msg;
}

function setLoading(on) {
  const btn = document.getElementById("resetBtn");
  btn.disabled = on;
  btn.innerHTML = on
    ? '<div class="spinner"></div> Đang xử lý...'
    : '<i class="fa fa-key"></i> Đặt Lại Mật Khẩu';
}

async function handleReset() {
  const token = getTokenFromUrl();
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!token) {
    showAlert("⚠️ Thiếu mã reset trong đường dẫn email.");
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    showAlert("⚠️ Mật khẩu mới phải có ít nhất 6 ký tự.");
    return;
  }
  if (newPassword !== confirmPassword) {
    showAlert("⚠️ Xác nhận mật khẩu không khớp.");
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || "Không thể đặt lại mật khẩu");
    }

    if (data.token && data.user) {
      saveSession(data.token, data.user);
    }

    showAlert(
      "✅ Đặt lại mật khẩu thành công. Đang vào trang học...",
      "success",
    );
    setTimeout(() => {
      window.location.href = "lessons.html";
    }, 1200);
  } catch (err) {
    showAlert(`⚠️ ${err.message || "Không thể đặt lại mật khẩu"}`);
  } finally {
    setLoading(false);
  }
}
