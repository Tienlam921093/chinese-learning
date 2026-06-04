"use strict";

const state = {
  classes: [],
  filter: "upcoming",
};

function currentUser() {
  return getUser() || {};
}

function isTeacher() {
  const role = currentUser().role;
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

function classStatusLabel(item) {
  const now = Date.now();
  const start = new Date(item.starts_at).getTime();
  const end = new Date(item.ends_at).getTime();
  if (now >= start && now <= end) return "Dang live";
  if (now < start) return "Sap toi";
  return "Da ket thuc";
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

function filteredClasses() {
  if (state.filter === "mine") {
    return state.classes.filter((item) => item.is_enrolled);
  }
  if (state.filter === "upcoming") {
    return state.classes.filter((item) => new Date(item.ends_at) >= new Date());
  }
  return state.classes;
}

function renderClasses() {
  const grid = document.getElementById("classGrid");
  const list = filteredClasses();
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Chua co lop hoc phu hop.</div>`;
    return;
  }

  grid.innerHTML = list
    .map((item) => {
      const full = item.enrolled_count >= item.capacity;
      const liveLabel = classStatusLabel(item);
      const enrolled = item.is_enrolled;
      const meetingUrl = escapeText(item.meeting_url);
      const teacherView = isTeacher();
      const enrollButton = teacherView
        ? `<button class="class-action danger" type="button" data-cancel-class="${item.id}"><i class="fa fa-calendar-xmark"></i> Huy lop</button>`
        : enrolled
          ? `<button class="class-action" type="button" data-cancel="${item.id}"><i class="fa fa-user-minus"></i> Huy dang ky</button>`
          : `<button class="class-action primary" type="button" data-enroll="${item.id}" ${full ? "disabled" : ""}><i class="fa fa-user-plus"></i> ${full ? "Da day" : "Dang ky"}</button>`;
      const joinButton = teacherView || enrolled
        ? `<a class="class-action primary" href="${meetingUrl}" target="_blank" rel="noreferrer"><i class="fa fa-video"></i> Vao lop</a>`
        : `<button class="class-action" type="button" disabled><i class="fa fa-lock"></i> Can dang ky</button>`;

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
            <span><i class="fa fa-link me-1"></i>${escapeText(item.meeting_platform || "other")} · ${liveLabel}</span>
          </div>
          <div class="class-actions">
            ${enrollButton}
            ${joinButton}
          </div>
        </article>`;
    })
    .join("");
}

async function loadClasses() {
  const grid = document.getElementById("classGrid");
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Dang tai lich lop...</div>`;
  try {
    const res = await authFetch(`${API_BASE}/live-classes?include_past=1`);
    if (res.status === 401) {
      location.replace("login.html?redirect=live-classes.html");
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Khong tai duoc lop hoc");
    state.classes = Array.isArray(data.classes) ? data.classes : [];
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

async function enroll(classId) {
  const res = await authFetch(`${API_BASE}/live-classes/${classId}/enroll`, {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) alert(data.message || "Khong dang ky duoc lop");
  await loadClasses();
}

async function cancelEnrollment(classId) {
  const res = await authFetch(`${API_BASE}/live-classes/${classId}/enroll`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) alert(data.message || "Khong huy duoc dang ky");
  await loadClasses();
}

async function cancelClass(classId) {
  if (!confirm("Huy lop hoc nay? Hoc vien se khong con thay lop trong lich sap toi.")) {
    return;
  }
  const res = await authFetch(`${API_BASE}/live-classes/${classId}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) alert(data.message || "Khong huy duoc lop");
  await loadClasses();
}

function initLiveClasses() {
  initSidebar();
  if (getUser()?.role === "admin") {
    location.replace("admin-dashboard.html");
    return;
  }
  if (getUser()?.role === "teacher") {
    location.replace("teacher-dashboard.html");
    return;
  }
  if (!getToken()) {
    restoreAuthSession().then((user) => {
      if (!user && !getToken()) location.replace("login.html?redirect=live-classes.html");
    });
  }

  const teacherPanel = document.getElementById("teacherPanel");
  const newClassBtn = document.getElementById("newClassBtn");
  if (!isTeacher()) {
    newClassBtn.hidden = true;
  }

  setDefaultTimes();
  document.getElementById("classForm").addEventListener("submit", createClass);
  newClassBtn.addEventListener("click", () => {
    teacherPanel.hidden = false;
  });
  document.getElementById("closeFormBtn").addEventListener("click", () => {
    teacherPanel.hidden = true;
  });
  document.getElementById("refreshBtn").addEventListener("click", loadClasses);
  document.querySelector(".toolbar").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-filter]");
    if (!btn) return;
    state.filter = btn.dataset.filter;
    document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
    btn.classList.add("active");
    renderClasses();
  });
  document.getElementById("classGrid").addEventListener("click", (event) => {
    const enrollBtn = event.target.closest("[data-enroll]");
    const cancelBtn = event.target.closest("[data-cancel]");
    const cancelClassBtn = event.target.closest("[data-cancel-class]");
    if (enrollBtn) enroll(Number(enrollBtn.dataset.enroll));
    if (cancelBtn) cancelEnrollment(Number(cancelBtn.dataset.cancel));
    if (cancelClassBtn) cancelClass(Number(cancelClassBtn.dataset.cancelClass));
  });

  loadClasses();
}

initLiveClasses();
