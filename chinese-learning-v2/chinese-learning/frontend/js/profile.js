"use strict";
// Auth utilities (getToken, getUser, getProgressKey, API, authFetch, logout) provided by helpers.js
const saveUser = (u) => localStorage.setItem("hanyuUser", JSON.stringify(u));

const LEVELS = [
  { name: "Người Mới Bắt Đầu", min: 0, max: 500 },
  { name: "Học Viên", min: 500, max: 1200 },
  { name: "Luyện Sinh", min: 1200, max: 2500 },
  { name: "Chiến Binh", min: 2500, max: 5000 },
  { name: "Đại Học Sĩ", min: 5000, max: 9000 },
  { name: "Bậc Thầy", min: 9000, max: 15000 },
  { name: "Huyền Thoại", min: 15000, max: Infinity },
];

const ACHIEVEMENTS = [
  { icon: "🎉", name: "Chào Mừng", desc: "Tạo tài khoản", ok: (u) => true },
  { icon: "⚡", name: "100 XP", desc: "Đạt 100 XP", ok: (u) => u.xp >= 100 },
  { icon: "🔥", name: "500 XP", desc: "Đạt 500 XP", ok: (u) => u.xp >= 500 },
  { icon: "💎", name: "1000 XP", desc: "Đạt 1000 XP", ok: (u) => u.xp >= 1000 },
  {
    icon: "🔆",
    name: "3 Ngày",
    desc: "Streak 3 ngày",
    ok: (u) => u.streak >= 3,
  },
  {
    icon: "🌟",
    name: "1 Tuần",
    desc: "Streak 7 ngày",
    ok: (u) => u.streak >= 7,
  },
  {
    icon: "🏅",
    name: "1 Tháng",
    desc: "Streak 30 ngày",
    ok: (u) => u.streak >= 30,
  },
  { icon: "📗", name: "HSK 2", desc: "Đạt HSK 2", ok: (u) => u.hsk_level >= 2 },
  { icon: "📘", name: "HSK 3", desc: "Đạt HSK 3", ok: (u) => u.hsk_level >= 3 },
  { icon: "📙", name: "HSK 4", desc: "Đạt HSK 4", ok: (u) => u.hsk_level >= 4 },
  {
    icon: "⭐",
    name: "Thành Viên Pro",
    desc: "Nâng cấp gói",
    ok: (u) => u.plan && u.plan !== "free",
  },
  {
    icon: "📚",
    name: "5 Bài Học",
    desc: "Hoàn thành 5 bài",
    ok: (u) => (u.completedLessons || 0) >= 5,
  },
];

async function initProfile() {
  const ok = await ensureAuthSession("login.html");
  if (!ok) return;
  document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  let u = getUser();
  // Đếm bài đã học từ localStorage
  const prog = JSON.parse(
    localStorage.getItem("hanyuProgress_" + (u.id || "guest")) || "{}",
  );
  u.completedLessons = (prog.completedLessonIds || []).length;
  render(u);

  // Refresh từ API
  try {
    const r = await authFetch(`${API}/auth/me`);
    if (r.ok) {
      const { user } = await r.json();
      user.completedLessons = u.completedLessons;
      saveUser({ ...u, ...user });
      render(user);
    }
  } catch {}
}

function render(u) {
  const init = (u.name || "?")[0].toUpperCase();
  const canChangePassword = !u.oauth_provider;
  const passwordSection = document.getElementById("pwdSection");
  if (passwordSection) {
    passwordSection.style.display = canChangePassword ? "" : "none";
  }
  // Sidebar
  document.getElementById("uAva").textContent = init;
  document.getElementById("uName").textContent = u.name || "–";
  document.getElementById("uXP").textContent = u.xp || 0;
  document.getElementById("uHSK").textContent = u.hsk_level || 1;
  document.getElementById("uStreak").textContent = "🔥 " + (u.streak || 0);
  document.getElementById("topXP").textContent = u.xp || 0;
  document.getElementById("topStreak").textContent = u.streak || 0;
  document.getElementById("uXPBar").style.width =
    Math.min(100, ((u.xp || 0) % 500) / 5) + "%";
  // Hero
  document.getElementById("heroAva").textContent = init;
  document.getElementById("heroName").textContent = u.name || "–";
  document.getElementById("heroEmail").textContent = u.email || "–";
  if (u.created_at)
    document.getElementById("heroJoined").textContent =
      "Tham gia: " +
      new Date(u.created_at).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      });
  const plan = (u.plan || "free").toLowerCase();
  const planEl = document.getElementById("planTag");
  planEl.className = "plan-tag plan-" + plan;
  planEl.textContent =
    plan === "premium" ? "👑 Premium" : plan === "pro" ? "⭐ Pro" : "👤 Free";
  if (plan !== "free")
    document.getElementById("upgradeBtn").style.display = "none";
  // Stats
  document.getElementById("sXP").textContent = (u.xp || 0).toLocaleString(
    "vi-VN",
  );
  document.getElementById("sStreak").textContent = u.streak || 0;
  document.getElementById("sHSK").textContent = "HSK " + (u.hsk_level || 1);
  document.getElementById("sLessons").textContent = u.completedLessons || 0;
  // Level
  const xp = u.xp || 0;
  const li = LEVELS.findIndex((l) => xp < l.max);
  const L = LEVELS[li < 0 ? LEVELS.length - 1 : li];
  const pct =
    L.max === Infinity
      ? 100
      : Math.min(100, Math.round(((xp - L.min) / (L.max - L.min)) * 100));
  document.getElementById("lvBadge").textContent =
    li < 0 ? LEVELS.length : li + 1;
  document.getElementById("lvName").textContent = L.name;
  document.getElementById("lvSub").textContent =
    L.max === Infinity
      ? "Cấp tối đa!"
      : `${xp.toLocaleString("vi-VN")} / ${L.max.toLocaleString("vi-VN")} XP`;
  document.getElementById("lvFill").style.width = pct + "%";
  document.getElementById("lvPct").textContent = pct + "%";
  // Achievements
  document.getElementById("badgesGrid").innerHTML = ACHIEVEMENTS.map(
    (a) => `
    <div class="bdg ${a.ok(u) ? "" : "locked"}">
      <div class="bdg-icon">${a.icon}</div>
      <div class="bdg-name">${a.name}</div>
      <div class="bdg-desc">${a.desc}</div>
    </div>`,
  ).join("");
  // Form
  document.getElementById("editName").value = u.name || "";
  document.getElementById("editEmail").value = u.email || "";
}

async function saveProfile() {
  const name = document.getElementById("editName").value.trim();
  const btn = document.getElementById("btnSave");
  const msg = document.getElementById("saveMsg");
  if (!name) {
    showMsg(msg, "⚠️ Vui lòng nhập tên", false);
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i>Đang lưu...';
  try {
    const u = getUser();
    u.name = name;
    saveUser(u);
    render(u);
    showMsg(msg, "✅ Đã lưu!", true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-check me-1"></i>Lưu Thay Đổi';
  }
}

async function changePwd() {
  const u = getUser();
  if (u.oauth_provider) {
    showMsg(
      document.getElementById("pwdMsg"),
      "⚠️ Tài khoản đăng nhập qua Google/Facebook không hỗ trợ đổi mật khẩu tại đây.",
      false,
    );
    return;
  }
  const cur = document.getElementById("pwdOld").value;
  const nw = document.getElementById("pwdNew").value;
  const cf = document.getElementById("pwdConfirm").value;
  const btn = document.getElementById("btnPwd");
  const msg = document.getElementById("pwdMsg");
  if (!cur || !nw || !cf) {
    showMsg(msg, "⚠️ Điền đầy đủ các ô", false);
    return;
  }
  if (nw.length < 6) {
    showMsg(msg, "⚠️ Mật khẩu mới ít nhất 6 ký tự", false);
    return;
  }
  if (nw !== cf) {
    showMsg(msg, "⚠️ Xác nhận mật khẩu không khớp", false);
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i>Đang xử lý...';
  try {
    const r = await authFetch(`${API}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: cur, newPassword: nw }),
    });
    const d = await r.json();
    if (r.ok) {
      if (d.should_logout) {
        try {
          window.clearAccessToken?.();
        } catch {}
        localStorage.removeItem("hanyuUser");
        sessionStorage.removeItem("hanyuUser");
        sessionStorage.removeItem("hanyuAccessToken");
        showMsg(
          msg,
          "✅ Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
          true,
        );
        setTimeout(() => {
          window.location.href = "login.html";
        }, 900);
        return;
      }
      showMsg(msg, "✅ Đổi mật khẩu thành công!", true);
      ["pwdOld", "pwdNew", "pwdConfirm"].forEach(
        (id) => (document.getElementById(id).value = ""),
      );
    } else {
      showMsg(msg, "❌ " + (d.message || "Lỗi đổi mật khẩu"), false);
    }
  } catch {
    showMsg(msg, "❌ Không thể kết nối server", false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-key me-1"></i>Đổi Mật Khẩu';
  }
}

function showMsg(el, txt, ok) {
  el.innerHTML = `<span class="${ok ? "msg-ok" : "msg-err"}">${txt}</span>`;
  setTimeout(() => (el.innerHTML = ""), 4000);
}

function clearProgress() {
  if (
    !confirm(
      "Xóa toàn bộ tiến độ học cục bộ? Dữ liệu server không bị ảnh hưởng.",
    )
  )
    return;
  const uid = getUser().id || "guest";
  localStorage.removeItem("hanyuProgress_" + uid);
  alert("✅ Đã xóa!");
  location.reload();
}

// logout() provided by helpers.js

initProfile();
