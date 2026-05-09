/**
 * LEADERBOARD PAGE — JavaScript
 * FIX N26: Tách từ inline <script> ra file riêng
 * Depends on: helpers.js (getToken, getUser, authFetch, initSidebar, colorOf, initial, logout)
 */
"use strict";

let allData = [];
let curTab = "all";
let me = getUser();
const USER_UPDATED_KEY = "hanyuUserUpdatedAt";
let isRefreshing = false;

function getMeId() {
  return me?.id ?? null;
}

function normalizeLeaderboardData(data) {
  const seenIds = new Set();
  const seenKeys = new Set();
  return data.filter((u) => {
    if (u?.id != null) {
      if (seenIds.has(u.id)) return false;
      seenIds.add(u.id);
      return true;
    }

    const key = `${(u?.name || "").toLowerCase()}|${u?.xp || 0}|${u?.hsk_level || 1}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

async function load() {
  if (isRefreshing) return;
  isRefreshing = true;
  const ok = await ensureAuthSession("login.html");
  if (!ok) {
    isRefreshing = false;
    return;
  }
  me = getUser();
  initSidebar();
  try {
    const r = await authFetch(`${API}/auth/leaderboard`);
    if (r.ok) {
      const d = await r.json();
      allData = normalizeLeaderboardData(d.users || []);
    } else throw new Error();
  } catch (err) {
    console.warn("Leaderboard: failed to fetch leaderboard data", err);
    allData = [];
  }
  render();
  isRefreshing = false;
}

function patchMyNameFromCache() {
  const myId = getMeId();
  const myName = (me?.name || "").trim();
  if (myId == null || !myName || !allData.length) return;

  let changed = false;
  allData = allData.map((u) => {
    if (u.id === myId && u.name !== myName) {
      changed = true;
      return { ...u, name: myName };
    }
    return u;
  });

  if (changed) render();
}

function refreshAfterProfileUpdate() {
  me = getUser();
  initSidebar();
  patchMyNameFromCache();
  load();
}

function switchTab(tab) {
  curTab = tab;
  document.getElementById("tabAll").classList.toggle("active", tab === "all");
  document.getElementById("tabWeek").classList.toggle("active", tab === "week");
  render();
}

function render() {
  let data = [...allData];
  if (curTab === "week") {
    data = data
      .map((u) => ({
        ...u,
        xp:
          u.weekly_xp !== undefined
            ? u.weekly_xp
            : Math.round(u.xp * 0.12 + Math.random() * 30),
      }))
      .sort((a, b) => b.xp - a.xp);
  }
  renderPodium(data.slice(0, 3));
  renderList(data);
  renderMyRank(data);
}

function renderPodium(top) {
  if (!top.length) {
    document.getElementById("podium").innerHTML = "";
    return;
  }
  const order =
    top.length >= 2 ? [top[1], top[0], top[2]].filter(Boolean) : [top[0]];
  const rankOf = (t) => (top.length >= 2 ? [2, 1, 3][order.indexOf(t)] : 1);
  const crowns = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const blocks = { 1: "b1", 2: "b2", 3: "b3" };
  const avas = { 1: "r1", 2: "r2", 3: "r3" };
  document.getElementById("podium").innerHTML = order
    .map((u) => {
      const r = rankOf(u);
      return `<div class="podium-item">
      <div style="font-size:1.2rem">${crowns[r]}</div>
      <div class="p-ava ${avas[r]}" style="background:${colorOf(u.name)}">${initial(u.name)}</div>
      <div class="p-name">${u.name}</div>
      <div class="p-xp">${(u.xp || 0).toLocaleString("vi-VN")} XP</div>
      <div class="p-block ${blocks[r]}">#${r}</div>
    </div>`;
    })
    .join("");
}

function renderList(data) {
  if (!data.length) {
    document.getElementById("lbList").innerHTML =
      '<div class="empty-state"><div style="font-size:2.5rem;margin-bottom:.75rem">🏆</div><p>Chưa có dữ liệu</p></div>';
    return;
  }
  const myId = getMeId();
  document.getElementById("lbList").innerHTML = data
    .map((u, i) => {
      const rank = i + 1;
      const isMe = u.isMe || (myId != null && u.id === myId);
      const medal =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
      const planTag =
        u.plan === "premium"
          ? '<span style="font-size:.62rem;background:#7c3aed;color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px">PREMIUM</span>'
          : u.plan === "pro"
            ? '<span style="font-size:.62rem;background:#2563eb;color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px">PRO</span>'
            : "";
      return `<div class="lb-row${isMe ? " is-me" : ""}">
      <div class="lb-rank">${medal}</div>
      <div class="lb-ava" style="background:${colorOf(u.name)}">${initial(u.name)}</div>
      <div class="lb-info">
        <div class="lb-name">${u.name}${isMe ? ' <span style="font-size:.68rem;color:var(--red);font-weight:700">(Bạn)</span>' : ""}${planTag}</div>
        <div class="lb-meta">HSK ${u.hsk_level || 1} · 🔥 ${u.streak || 0} ngày</div>
      </div>
      <div class="lb-xp">${(u.xp || 0).toLocaleString("vi-VN")} <span>XP</span></div>
    </div>`;
    })
    .join("");
}

function renderMyRank(data) {
  const myId = getMeId();
  if (myId == null) return;
  const idx = data.findIndex((u) => u.isMe || u.id === myId);
  if (idx < 0) return;
  const u = data[idx];
  document.getElementById("myBanner").style.display = "flex";
  document.getElementById("myRankNum").textContent = "#" + (idx + 1);
  document.getElementById("myRankName").textContent = u.name;
  document.getElementById("myRankXP").textContent =
    (u.xp || 0).toLocaleString("vi-VN") + " XP";
  document.getElementById("myRankHSK").textContent =
    "HSK " + (u.hsk_level || 1);
}

window.addEventListener("storage", (event) => {
  if (event.key === "hanyuUser" || event.key === USER_UPDATED_KEY) {
    refreshAfterProfileUpdate();
  }
});

window.addEventListener("focus", refreshAfterProfileUpdate);

window.addEventListener("pageshow", (event) => {
  if (event.persisted) refreshAfterProfileUpdate();
});

load();
