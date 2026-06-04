"use strict";

const dashboardState = {
  classes: [],
  filter: "upcoming",
};

function userRole() {
  return getUser()?.role || "student";
}

function canManageClasses() {
  const role = userRole();
  return role === "teacher" || role === "admin";
}

function escapeText(value) {
  return escapeHTML(String(value || ""));
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setDefaultTimes() {
  const startInput = document.querySelector('[name="starts_at"]');
  const endInput = document.querySelector('[name="ends_at"]');
  if (!startInput || !endInput) return;
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  startInput.value = start.toISOString().slice(0, 16);
  endInput.value = end.toISOString().slice(0, 16);
}

function classStatusLabel(item) {
  if (item.status === "cancelled") return "Da huy";
  const now = Date.now();
  const start = new Date(item.starts_at).getTime();
  const end = new Date(item.ends_at).getTime();
  if (now >= start && now <= end) return "Dang live";
  if (now < start) return "Sap toi";
  return "Da ket thuc";
}

function visibleClasses() {
  if (dashboardState.filter === "upcoming") {
    return dashboardState.classes.filter(
      (item) => item.status !== "cancelled" && new Date(item.ends_at) >= new Date(),
    );
  }
  return dashboardState.classes;
}

function renderClasses() {
  const grid = document.getElementById("classGrid");
  const list = visibleClasses();
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Chua co lop hoc phu hop.</div>`;
    return;
  }

  grid.innerHTML = list
    .map((item) => {
      const meetingUrl = escapeText(item.meeting_url);
      const canCancel = item.status === "scheduled";
      return `
        <article class="class-card">
          <div class="class-top">
            <div>
              <h3 class="class-title">${escapeText(item.title)}</h3>
              <div class="class-teacher"><i class="fa fa-chalkboard-user me-1"></i>${escapeText(item.teacher_name)}</div>
            </div>
            <span class="class-badge">HSK ${item.hsk_level}</span>
          </div>
          <div class="class-desc">${escapeText(item.description || "Lop hoc truc tuyen voi giao vien.")}</div>
          <div class="class-meta">
            <span><i class="fa fa-clock me-1"></i>${formatTime(item.starts_at)} - ${formatTime(item.ends_at)}</span>
            <span><i class="fa fa-users me-1"></i>${item.enrolled_count}/${item.capacity} hoc vien</span>
            <span><i class="fa fa-link me-1"></i>${escapeText(item.meeting_platform || "other")} · ${classStatusLabel(item)}</span>
          </div>
          <div class="class-actions">
            <button class="class-action danger" type="button" data-cancel-class="${item.id}" ${canCancel ? "" : "disabled"}>
              <i class="fa fa-calendar-xmark"></i> Huy lop
            </button>
            <a class="class-action primary" href="${meetingUrl}" target="_blank" rel="noreferrer">
              <i class="fa fa-video"></i> Vao lop
            </a>
          </div>
        </article>`;
    })
    .join("");
}

async function loadClasses() {
  const grid = document.getElementById("classGrid");
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Dang tai lich lop...</div>`;
  try {
    const res = await authFetch(`${API_BASE}/live-classes?include_past=1&mine=1`);
    if (res.status === 401) {
      location.replace("login.html?redirect=teacher-dashboard.html");
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Khong tai duoc lop hoc");
    dashboardState.classes = Array.isArray(data.classes) ? data.classes : [];
    renderClasses();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${escapeText(err.message || "Khong tai duoc lop hoc.")}</div>`;
  }
}

async function createClass(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("formMessage");
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.starts_at = new Date(payload.starts_at).toISOString();
  payload.ends_at = new Date(payload.ends_at).toISOString();
  payload.hsk_level = Number(payload.hsk_level);
  payload.capacity = Number(payload.capacity || 30);

  message.textContent = "Dang luu...";
  try {
    const res = await authFetch(`${API_BASE}/live-classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Khong tao duoc lop");
    message.textContent = "Da tao lop.";
    form.reset();
    setDefaultTimes();
    await loadClasses();
  } catch (err) {
    message.textContent = err.message || "Khong tao duoc lop.";
  }
}

async function cancelClass(classId) {
  if (!confirm("Huy lop hoc nay?")) return;
  const res = await authFetch(`${API_BASE}/live-classes/${classId}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) alert(data.message || "Khong huy duoc lop");
  await loadClasses();
}

async function initTeacherDashboard() {
  initSidebar();
  const user = await restoreAuthSession();
  const activeUser = user || getUser();
  if (!activeUser?.id && !getToken()) {
    location.replace("login.html?redirect=teacher-dashboard.html");
    return;
  }
  if (!canManageClasses()) {
    location.replace("lessons.html");
    return;
  }
  if (userRole() === "admin") {
    location.replace("admin-dashboard.html");
    return;
  }

  document.getElementById("roleLabel").textContent = userRole();
  document.getElementById("topRole").textContent = userRole() === "admin" ? "Admin" : "Teacher";
  setDefaultTimes();
  document.getElementById("classForm").addEventListener("submit", createClass);
  document.getElementById("refreshBtn").addEventListener("click", loadClasses);
  document.querySelector(".toolbar").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-filter]");
    if (!btn) return;
    dashboardState.filter = btn.dataset.filter;
    document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
    btn.classList.add("active");
    renderClasses();
  });
  document.getElementById("classGrid").addEventListener("click", (event) => {
    const cancelBtn = event.target.closest("[data-cancel-class]");
    if (cancelBtn) cancelClass(Number(cancelBtn.dataset.cancelClass));
  });

  loadClasses();
}

initTeacherDashboard();
