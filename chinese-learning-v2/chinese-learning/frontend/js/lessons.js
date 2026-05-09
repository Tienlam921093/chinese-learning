"use strict";
// Auth utilities (getToken, getUser, API_BASE, authFetch) provided by helpers.js

// ── DEMO DATA: dùng đúng property names ──
// LƯU Ý: hsk, title, desc, words, duration, emoji, completed
// ── Plan access rules ──
const PLAN_ACCESS = {
  free: [1], // HSK 1 only
  pro: [1, 2, 3, 4], // HSK 1-4
  premium: [1, 2, 3, 4, 5, 6], // HSK 1-6
};

function getUserPlan() {
  const user = getUser();
  if (user.plan && user.plan !== "free") {
    // null expiry = vĩnh viễn; có expiry thì kiểm tra còn hạn không
    if (!user.plan_expiry) return user.plan;
    const expiry = new Date(user.plan_expiry);
    if (!isNaN(expiry.getTime()) && expiry > new Date()) return user.plan;
    if (isNaN(expiry.getTime())) return user.plan; // parse lỗi = coi như không hết hạn
  }
  return "free";
}

function isHskAllowed(hskLevel) {
  const plan = getUserPlan();
  const allowed = PLAN_ACCESS[plan] || PLAN_ACCESS.free;
  return allowed.includes(hskLevel);
}

let upgradeToastTimer = null;
function showUpgradeToast(hskLevel) {
  let toast = document.getElementById("upgradeToast");
  if (toast) toast.remove();
  clearTimeout(upgradeToastTimer);

  const plan = getUserPlan();
  let needed = hskLevel >= 5 ? "Premium" : "Pro";
  let price = hskLevel >= 5 ? "399K" : "199K";

  toast = document.createElement("div");
  toast.id = "upgradeToast";
  toast.className = "upgrade-toast";
  toast.innerHTML = `🔒 HSK ${hskLevel} yêu cầu gói <strong>${needed}</strong> (${price}/tháng).
    <a href="payment.html?plan=${needed.toLowerCase()}" style="color:#fbbf24;margin-left:4px">Nâng cấp →</a>
    <span onclick="document.getElementById('upgradeToast').remove()" style="margin-left:8px;cursor:pointer;opacity:.6">✕</span>`;
  document.body.appendChild(toast);
  upgradeToastTimer = setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 4000);
}

const DEMO_LESSONS = [
  // HSK 1
  {
    id: 1,
    hsk: 1,
    title: "Chào Hỏi Cơ Bản",
    desc: "你好 · 谢谢 · 对不起 · 再见",
    words: 12,
    duration: 15,
    completed: false,
    emoji: "👋",
  },
  {
    id: 2,
    hsk: 1,
    title: "Số Đếm 1-10",
    desc: "一 · 二 · 三 · 四 · 五 · 十",
    words: 10,
    duration: 10,
    completed: false,
    emoji: "🔢",
  },
  {
    id: 3,
    hsk: 1,
    title: "Màu Sắc",
    desc: "红色 · 蓝色 · 绿色 · 黄色",
    words: 8,
    duration: 12,
    completed: false,
    emoji: "🎨",
  },
  {
    id: 4,
    hsk: 1,
    title: "Gia Đình",
    desc: "爸爸 · 妈妈 · 哥哥 · 姐姐",
    words: 14,
    duration: 18,
    completed: false,
    emoji: "👨‍👩‍👧‍👦",
  },
  {
    id: 5,
    hsk: 1,
    title: "Thức Ăn & Đồ Uống",
    desc: "饭 · 水 · 茶 · 咖啡 · 面包",
    words: 16,
    duration: 20,
    completed: false,
    emoji: "🍜",
  },
  {
    id: 6,
    hsk: 1,
    title: "Thời Gian",
    desc: "今天 · 明天 · 昨天 · 几点",
    words: 12,
    duration: 15,
    completed: false,
    emoji: "🕐",
  },
  // HSK 2
  {
    id: 7,
    hsk: 2,
    title: "Mua Sắm",
    desc: "多少钱 · 便宜 · 贵 · 买 · 卖",
    words: 18,
    duration: 22,
    completed: false,
    emoji: "🛍️",
  },
  {
    id: 8,
    hsk: 2,
    title: "Giao Thông",
    desc: "公交车 · 地铁 · 出租车 · 骑车",
    words: 15,
    duration: 18,
    completed: false,
    emoji: "🚌",
  },
  {
    id: 9,
    hsk: 2,
    title: "Sức Khỏe",
    desc: "医院 · 医生 · 头疼 · 发烧",
    words: 20,
    duration: 25,
    completed: false,
    emoji: "🏥",
  },
  // HSK 3
  {
    id: 10,
    hsk: 3,
    title: "Thời Tiết",
    desc: "天气 · 下雨 · 晴天 · 刮风 · 温度",
    words: 22,
    duration: 28,
    completed: false,
    emoji: "⛅",
  },
  {
    id: 11,
    hsk: 3,
    title: "Du Lịch",
    desc: "旅游 · 护照 · 酒店 · 飞机 · 签证",
    words: 25,
    duration: 30,
    completed: false,
    emoji: "✈️",
  },
  // HSK 4
  {
    id: 12,
    hsk: 4,
    title: "Công Việc",
    desc: "工作 · 公司 · 上班 · 老板 · 薪水",
    words: 30,
    duration: 35,
    completed: false,
    emoji: "💼",
  },
  {
    id: 13,
    hsk: 4,
    title: "Cảm Xúc & Tính Cách",
    desc: "高兴 · 生气 · 难过 · 紧张 · 骄傲",
    words: 28,
    duration: 32,
    completed: false,
    emoji: "😊",
  },
  // HSK 5
  {
    id: 14,
    hsk: 5,
    title: "Kinh Tế & Tài Chính",
    desc: "经济 · 股票 · 投资 · 银行 · 利率",
    words: 40,
    duration: 45,
    completed: false,
    emoji: "📈",
  },
  {
    id: 15,
    hsk: 5,
    title: "Môi Trường",
    desc: "环境 · 污染 · 能源 · 保护 · 气候",
    words: 38,
    duration: 42,
    completed: false,
    emoji: "🌍",
  },
  // HSK 6
  {
    id: 16,
    hsk: 6,
    title: "Triết Học & Văn Hóa",
    desc: "哲学 · 文化 · 传统 · 思想 · 精神",
    words: 55,
    duration: 60,
    completed: false,
    emoji: "🏮",
  },
  {
    id: 17,
    hsk: 6,
    title: "Chính Trị & Xã Hội",
    desc: "政治 · 社会 · 制度 · 民主 · 改革",
    words: 60,
    duration: 65,
    completed: false,
    emoji: "⚖️",
  },
];

let currentLessonId = null;
let lessonModal = null;

// ── INIT ──
function init() {
  // User data
  const p = JSON.parse(localStorage.getItem(getProgressKey()) || "{}");
  const user = JSON.parse(
    sessionStorage.getItem("hanyuUser") ||
      localStorage.getItem("hanyuUser") ||
      "{}",
  );
  const name = user.name || "Học Viên";
  const xp = p.xp || 0;
  const str = p.streak || 0;

  document.getElementById("uAva").textContent = name[0].toUpperCase();
  document.getElementById("uName").textContent = name;
  document.getElementById("uXP").textContent = xp;
  document.getElementById("topXP").textContent = xp;
  document.getElementById("uStreak").textContent = `🔥 ${str}`;
  document.getElementById("topStreak").textContent = str;
  document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const xpPct = Math.min(((xp % 500) / 500) * 100, 100);
  document.getElementById("uXPBar").style.width = xpPct + "%";

  // Daily goal progress
  const done = p.todayLessons || 0;
  const pct = Math.round((done / 3) * 100);
  document.getElementById("goalBar").style.width = pct + "%";
  document.getElementById("goalText").textContent = `${done}/3 hoàn thành`;

  // Init modal
  lessonModal = new bootstrap.Modal(document.getElementById("lessonModal"));

  // Merge completed từ localStorage vào DEMO_LESSONS
  const _p = JSON.parse(localStorage.getItem(getProgressKey()) || "{}");
  const _done = new Set((_p.completedLessonIds || []).map(Number));
  DEMO_LESSONS.forEach((l) => {
    l.completed = _done.has(l.id);
  });

  // Render — đọc ?level= từ URL nếu có
  const _urlLevel =
    parseInt(new URLSearchParams(location.search).get("level")) || 0;
  if (_urlLevel >= 1 && _urlLevel <= 6) {
    const _tab = document.querySelector(
      `#filterTabs .ftab[onclick*="filterLevel(${_urlLevel},"]`,
    );
    if (_tab) {
      _tab.click();
    } else {
      renderLessons(DEMO_LESSONS.filter((l) => l.hsk === _urlLevel));
    }
  } else {
    renderLessons(DEMO_LESSONS);
  }

  // Try API — nếu có, normalize rồi dùng; nếu không có thì giữ demo data
  authFetch(`${API_BASE}/lessons`)
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((data) => {
      if (!Array.isArray(data.lessons) || data.lessons.length === 0) return;
      // Normalize API field names → local field names
      const normalized = data.lessons.map((l) => ({
        id: l.id,
        hsk: l.hsk_level || l.hsk,
        title: l.title,
        desc: l.description || l.desc || "",
        words: l.word_count || l.words || 0,
        duration: l.duration_minutes || l.duration || 0,
        emoji: l.emoji || "📚",
        completed: l.completed || false,
      }));
      // Không replace DEMO_LESSONS — chỉ map real DB id theo title để sync progress
      normalized.forEach((api) => {
        const demo = DEMO_LESSONS.find((d) => d.title === api.title);
        if (demo) {
          demo.dbId = api.id;
          demo.desc = api.desc || demo.desc;
        }
      });
      // Sync completed từ localStorage (dùng dbId nếu có, fallback id)
      const _pApi = JSON.parse(localStorage.getItem(getProgressKey()) || "{}");
      const _doneApi = new Set((_pApi.completedLessonIds || []).map(Number));
      DEMO_LESSONS.forEach((l) => {
        l.completed = _doneApi.has(l.id) || _doneApi.has(l.dbId);
      });
      // Re-render tab đang active
      const _activeTab = document.querySelector("#filterTabs .ftab.active");
      const _activeMatch = _activeTab
        ? (_activeTab.getAttribute("onclick") || "").match(/filterLevel\((\d+)/)
        : null;
      const _activeLevel = _activeMatch ? parseInt(_activeMatch[1]) : 0;
      const _list =
        _activeLevel > 0
          ? DEMO_LESSONS.filter((l) => l.hsk === _activeLevel)
          : [...DEMO_LESSONS];
      renderLessons(_list);
    })
    .catch(() => {
      /* giữ demo data, không làm gì */
    });
}

// ── RENDER ──
function renderLessons(list) {
  const grid = document.getElementById("lessonsGrid");
  if (!list || list.length === 0) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">📭</div><div>Chưa có bài học ở cấp độ này</div></div>`;
    return;
  }
  grid.innerHTML = list
    .map((l) => {
      const hskClass = `hsk${l.hsk}`;
      const allowed = isHskAllowed(l.hsk);
      const lockedClass = allowed ? "" : " locked lcard-clickable";
      const clickHandler = allowed
        ? `onclick="openLesson(${l.id})"`
        : `onclick="showUpgradeToast(${l.hsk})" style="pointer-events:auto;cursor:pointer"`;

      let planNeeded = "";
      if (!allowed) {
        const p = getUserPlan();
        planNeeded =
          l.hsk >= 5
            ? '<div class="lock-banner">🔒 Yêu cầu gói Premium (399K/tháng)</div>'
            : '<div class="lock-banner">🔒 Yêu cầu gói Pro (199K/tháng)</div>';
      }

      return `
      <div class="lcard${l.completed && allowed ? " completed" : ""}${lockedClass}" ${clickHandler}>
        <div class="lcard-top">
          <span style="font-size:2rem;line-height:1">${l.emoji || "📚"}${!allowed ? " 🔒" : ""}</span>
          <div class="lcard-badges">
            <span class="hbadge ${hskClass}">HSK ${l.hsk}</span>
            ${l.completed && allowed ? '<span class="done-badge">✓ Xong</span>' : ""}
          </div>
        </div>
        <div class="lcard-title">${l.title}</div>
        <div class="lcard-desc">${l.desc || "—"}</div>
        <div class="lcard-meta">
          <span><i class="fa fa-book me-1"></i>${l.words} từ</span>
          <span><i class="fa fa-clock me-1"></i>${l.duration} phút</span>
          <span style="margin-left:auto;color:#f59e0b;font-weight:700">+${l.words * 5} XP</span>
        </div>
        ${l.completed && allowed ? '<div class="lcard-prog"><div class="lcard-prog-fill" style="width:100%"></div></div>' : ""}
        ${l.completed && allowed ? '<div class="completed-note"><i class="fa fa-check-circle"></i>Đã học xong</div>' : ""}
        ${planNeeded}
      </div>`;
    })
    .join("");
}

// ── FILTER — dùng ID để tránh selector fragile ──
function filterLevel(level, btn) {
  // Reset tất cả tabs
  document.querySelectorAll("#filterTabs .ftab").forEach((b) => {
    const base = b.className.replace(/\s*active/g, "").trim();
    b.className = base;
  });
  // Active tab hiện tại
  btn.className = btn.className + " active";
  // Làm mờ nút "Tất Cả" khi đang lọc theo HSK cụ thể
  const allBtn = document.querySelector("#filterTabs .ftab.all");
  if (allBtn) {
    allBtn.style.opacity = level === 0 ? "1" : "0.4";
    allBtn.style.filter = level === 0 ? "none" : "grayscale(0.4)";
  }
  // Cập nhật URL param mà không reload trang
  const url = new URL(location.href);
  if (level > 0) url.searchParams.set("level", level);
  else url.searchParams.delete("level");
  history.replaceState(null, "", url.toString());
  // Lọc data
  const list =
    level === 0 ? DEMO_LESSONS : DEMO_LESSONS.filter((l) => l.hsk === level);
  renderLessons(list);
}

// ── OPEN LESSON MODAL ──
function openLesson(id) {
  const l = DEMO_LESSONS.find((x) => x.id === id);
  if (!l) return;
  currentLessonId = id;

  document.getElementById("modalBadge").textContent = `HSK ${l.hsk}`;
  document.getElementById("modalTitle").textContent = `${l.emoji} ${l.title}`;
  document.getElementById("mWords").textContent = l.words;
  document.getElementById("mTime").textContent = `${l.duration}'`;
  document.getElementById("mXP").textContent = `+${l.words * 5} XP`;
  document.getElementById("mDesc").textContent = l.desc;
  document.getElementById("mVocabLink").href =
    `vocabulary.html?lesson=${id}&mode=list`;

  const colors = {
    1: "#16a34a",
    2: "#2563eb",
    3: "#d97706",
    4: "#7c3aed",
    5: "#dc2626",
    6: "#475569",
  };
  document.getElementById("modalHeader").style.background =
    colors[l.hsk] || "#0f172a";

  // Ẩn/hiện nút Trước/Tiếp theo vị trí trong danh sách
  const idx = DEMO_LESSONS.findIndex((x) => x.id === id);
  document.getElementById("mPrevBtn").disabled = idx === 0;
  document.getElementById("mNextBtn").disabled =
    idx === DEMO_LESSONS.length - 1;

  lessonModal.show();
}

// ── ĐIỀU HƯỚNG GIỮA CÁC BÀI ──
function goAdjacentLesson(direction) {
  const idx = DEMO_LESSONS.findIndex((x) => x.id === currentLessonId);
  const next = DEMO_LESSONS[idx + direction];
  if (next) openLesson(next.id);
}

// ── START LESSON ──
function startLesson() {
  if (!currentLessonId) return;
  lessonModal.hide();
  window.location.href = `study.html?lesson=${currentLessonId}`;
}

// ── MARK LESSON COMPLETE (gọi từ vocabulary.html sau khi học xong) ──
function markLessonComplete(lessonId) {
  lessonId = Number(lessonId);
  const p = JSON.parse(localStorage.getItem(getProgressKey()) || "{}");
  const ids = new Set((p.completedLessonIds || []).map(Number));
  const isNew = !ids.has(lessonId);
  ids.add(lessonId);
  p.completedLessonIds = [...ids];
  if (isNew) {
    // Cộng XP và mục tiêu ngày chỉ khi lần đầu hoàn thành
    const lesson = DEMO_LESSONS.find((l) => l.id === lessonId);
    p.xp = (p.xp || 0) + (lesson ? lesson.words * 5 : 50);
    p.todayLessons = (p.todayLessons || 0) + 1;
  }
  localStorage.setItem(getProgressKey(), JSON.stringify(p));
}

// ── KIỂM TRA HOÀN THÀNH TỪ VOCABULARY PAGE ──
(function checkReturnFromVocab() {
  const params = new URLSearchParams(location.search);
  const doneId = parseInt(params.get("completed"));
  if (doneId) {
    markLessonComplete(doneId);
    const url = new URL(location.href);
    url.searchParams.delete("completed");
    history.replaceState(null, "", url.toString());
  }
})();

// logout() provided by helpers.js

init();
