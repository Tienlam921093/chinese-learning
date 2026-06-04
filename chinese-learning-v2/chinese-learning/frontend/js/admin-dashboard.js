"use strict";

const adminState = {
  activeTab: "overview",
  users: [],
  classes: [],
  payments: [],
};

function requireAdmin() {
  const user = getUser();
  if (!user?.id && !getToken()) {
    location.replace("login.html?redirect=admin-dashboard.html");
    return false;
  }
  if (user?.role !== "admin") {
    location.replace(user?.role === "teacher" ? "teacher-dashboard.html" : "lessons.html");
    return false;
  }
  return true;
}

function text(value) {
  return escapeHTML(String(value ?? ""));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatCurrency(value) {
  return `${formatNumber(value)} VND`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function apiGet(path) {
  const res = await authFetch(`${API_BASE}${path}`);
  if (res.status === 401) {
    location.replace("login.html?redirect=admin-dashboard.html");
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Admin API error");
  return data;
}

async function apiJson(path, options) {
  const res = await authFetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Admin API error");
  return data;
}

function metric(label, value) {
  return `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${formatNumber(value)}</div>
    </div>`;
}

function report(label, value) {
  return `
    <div class="report-card">
      <div class="report-label">${label}</div>
      <div class="report-value">${typeof value === "number" ? formatNumber(value) : text(value)}</div>
    </div>`;
}

async function loadOverview() {
  const [dashboard, reports] = await Promise.all([
    apiGet("/admin/dashboard"),
    apiGet("/admin/reports"),
  ]);
  if (!dashboard || !reports) return;
  const stats = dashboard.stats || {};
  document.getElementById("metricGrid").innerHTML = [
    metric("Active users", stats.active_users),
    metric("Students", stats.students),
    metric("Teachers", stats.teachers),
    metric("Scheduled classes", stats.scheduled_classes),
    metric("Paid orders", stats.paid_orders),
    metric("Revenue", stats.revenue),
    metric("Lessons", stats.lessons),
    metric("Vocabulary", stats.vocabulary),
  ].join("");

  const r = reports.reports || {};
  document.getElementById("reportGrid").innerHTML = [
    report("New users 7d", r.new_users_7d),
    report("Upcoming classes", r.upcoming_classes),
    report("Live enrollments", r.live_enrollments),
    report("Quiz attempts 7d", r.quiz_attempts_7d),
    report("Revenue 30d", formatCurrency(r.revenue_30d)),
  ].join("");
}

async function loadUsers() {
  const role = document.getElementById("roleFilter").value;
  const search = document.getElementById("userSearch").value.trim();
  const qs = new URLSearchParams({ limit: "100" });
  if (role) qs.set("role", role);
  if (search) qs.set("search", search);
  const data = await apiGet(`/admin/users?${qs}`);
  if (!data) return;
  adminState.users = data.users || [];
  renderUsers();
}

function renderUsers() {
  const body = document.getElementById("usersBody");
  const currentUserId = Number(getUser()?.id);
  if (!adminState.users.length) {
    body.innerHTML = `<tr><td colspan="6">Khong co nguoi dung.</td></tr>`;
    return;
  }
  body.innerHTML = adminState.users
    .map((user) => {
      const isCurrentUser = Number(user.id) === currentUserId;
      return `
      <tr>
        <td>
          <div class="admin-user-main">${text(user.name)}</div>
          <div class="admin-user-sub">${text(user.email)}${isCurrentUser ? " · Tai khoan hien tai" : ""}</div>
        </td>
        <td>
          <select class="role-select" data-role-user="${user.id}" ${isCurrentUser ? "disabled" : ""}>
            ${["student", "teacher", "admin"].map((role) => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}
          </select>
        </td>
        <td>${text(user.plan || "free")}</td>
        <td>${formatNumber(user.xp)}</td>
        <td><span class="status-pill ${user.is_active ? "ok" : "warn"}">${user.is_active ? "active" : "locked"}</span></td>
        <td>
          ${isCurrentUser
            ? `<span class="admin-user-sub">Khong the tu khoa</span>`
            : `<button class="status-btn" data-status-user="${user.id}" data-active="${user.is_active ? "0" : "1"}">
                ${user.is_active ? "Khoa" : "Mo khoa"}
              </button>`}
        </td>
      </tr>`;
    })
    .join("");
}

async function loadClasses() {
  const data = await apiGet("/admin/classes?limit=100");
  if (!data) return;
  adminState.classes = data.classes || [];
  const body = document.getElementById("classesBody");
  if (!adminState.classes.length) {
    body.innerHTML = `<tr><td colspan="5">Chua co lop hoc.</td></tr>`;
    return;
  }
  body.innerHTML = adminState.classes
    .map((item) => `
      <tr>
        <td><strong>${text(item.title)}</strong><div class="admin-user-sub">HSK ${item.hsk_level} · ${text(item.meeting_platform)}</div></td>
        <td>${text(item.teacher_name)}</td>
        <td>${formatDate(item.starts_at)}<div class="admin-user-sub">${formatDate(item.ends_at)}</div></td>
        <td>${formatNumber(item.enrolled_count)}/${formatNumber(item.capacity)}</td>
        <td><span class="status-pill ${item.status === "scheduled" ? "ok" : "warn"}">${text(item.status)}</span></td>
      </tr>`)
    .join("");
}

async function loadPayments() {
  const data = await apiGet("/admin/payments?limit=100");
  if (!data) return;
  adminState.payments = data.payments || [];
  const body = document.getElementById("paymentsBody");
  if (!adminState.payments.length) {
    body.innerHTML = `<tr><td colspan="6">Chua co thanh toan.</td></tr>`;
    return;
  }
  body.innerHTML = adminState.payments
    .map((item) => `
      <tr>
        <td><strong>${text(item.order_id)}</strong><div class="admin-user-sub">#${item.id}</div></td>
        <td>${text(item.user_name)}<div class="admin-user-sub">${text(item.email)}</div></td>
        <td>${text(item.plan)}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td><span class="status-pill ${item.status === "paid" ? "ok" : "warn"}">${text(item.status)}</span></td>
        <td>${formatDate(item.created_at)}</td>
      </tr>`)
    .join("");
}

async function loadActiveTab() {
  try {
    if (adminState.activeTab === "overview") await loadOverview();
    if (adminState.activeTab === "users") await loadUsers();
    if (adminState.activeTab === "classes") await loadClasses();
    if (adminState.activeTab === "payments") await loadPayments();
  } catch (err) {
    alert(err.message || "Khong tai duoc du lieu admin");
  }
}

function setTab(tab) {
  adminState.activeTab = tab;
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminTab === tab);
  });
  document.querySelectorAll(".admin-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tab}`);
  });
  loadActiveTab();
}

async function initAdminDashboard() {
  initSidebar();
  const restored = await restoreAuthSession();
  if (restored) {
    sessionStorage.setItem("hanyuUser", JSON.stringify(restored));
  }
  if (!requireAdmin()) return;

  document.querySelectorAll("[data-admin-tab]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      setTab(item.dataset.adminTab);
    });
  });
  document.getElementById("refreshBtn").addEventListener("click", loadActiveTab);
  document.getElementById("userSearchBtn").addEventListener("click", loadUsers);
  document.getElementById("roleFilter").addEventListener("change", loadUsers);
  document.getElementById("usersBody").addEventListener("change", async (event) => {
    const select = event.target.closest("[data-role-user]");
    if (!select) return;
    await apiJson(`/admin/users/${select.dataset.roleUser}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: select.value }),
    });
    await loadUsers();
  });
  document.getElementById("usersBody").addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-status-user]");
    if (!btn) return;
    await apiJson(`/admin/users/${btn.dataset.statusUser}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: btn.dataset.active === "1" }),
    });
    await loadUsers();
  });

  loadOverview();
}

initAdminDashboard();
