/**
 * PAYMENT PAGE — JavaScript
 * FIX N26: Tách từ inline <script> ra file riêng
 */
"use strict";
// Auth utilities (getToken, getUser, API, authFetch) provided by helpers.js

const PLANS = {
  pro: {
    name: "Pro",
    price: "199.000₫/tháng",
    badge: "badge-pro",
    features: [
      "Tất cả HSK 1–4",
      "Flashcard không giới hạn",
      "AI Chat không giới hạn",
      "Luyện phát âm AI",
      "Báo cáo tiến độ chi tiết",
    ],
  },
  premium: {
    name: "Premium",
    price: "399.000₫/tháng",
    badge: "badge-premium",
    features: [
      "Tất cả HSK 1–6",
      "Học 1-1 với gia sư thật",
      "Chứng chỉ hoàn thành",
      "Ưu tiên hỗ trợ 24/7",
      "Tài liệu luyện thi HSK",
      "Nhóm học tập private",
    ],
  },
};

const wrap = document.getElementById("mainWrap");
const params = new URLSearchParams(location.search);
const plan = params.get("plan") || "pro";
const status = params.get("status");
let selectedMethod = "vnpay";

(async function boot() {
  const loginRedirect = `login.html?redirect=${encodeURIComponent(`payment.html?plan=${plan}`)}`;

  // Luôn đảm bảo có access token hợp lệ trước khi render trang.
  // Dù user đã login, access token 15 phút có thể đã hết hạn —
  // cần refresh qua httpOnly cookie trước, không redirect vội.
  if (!getToken()) {
    try {
      await refreshAccessToken();
    } catch {
      // Refresh thất bại → chưa có phiên hợp lệ
      localStorage.setItem("payAfterLogin", `payment.html?plan=${plan}`);
      location.replace(loginRedirect);
      return;
    }
  }

  // Kiểm tra thêm: có user data không (tránh trường hợp token có nhưng storage bị xoá)
  const user = getUser();
  const hasCachedUser = Boolean(user.id || user._id || user.email);
  if (!hasCachedUser) {
    // Thử refresh một lần nữa — có thể token trong memory nhưng user chưa load
    try {
      await refreshAccessToken();
    } catch {
      localStorage.setItem("payAfterLogin", `payment.html?plan=${plan}`);
      location.replace(loginRedirect);
      return;
    }
  }

  if (status) renderStatus(status, params.get("order"));
  else renderPayPage();
})();

function renderPayPage() {
  const p = PLANS[plan] || PLANS.pro;
  wrap.innerHTML = `
    <h4 class="mb-4" style="font-weight:700">🛒 Xác nhận đăng ký</h4>
    <div class="plan-card">
      <span class="plan-badge ${p.badge}">${p.name}</span>
      <div class="plan-price">${p.price.split("/")[0]} <span>/ ${p.price.split("/")[1]}</span></div>
      <ul class="plan-features mt-3">${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>
    </div>
    <p class="method-title">Chọn phương thức thanh toán</p>
    <div class="methods">
      <div class="method-btn active" id="btnVnpay" onclick="selectMethod('vnpay')">
        <div style="height:32px;display:flex;align-items:center;justify-content:center">
          <svg width="80" height="28" viewBox="0 0 80 28" fill="none"><rect width="80" height="28" rx="5" fill="#005BAA"/><text x="40" y="19" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold" font-family="Arial,sans-serif">VNPay</text></svg>
        </div>
        <p>VNPay</p>
      </div>
      <div class="method-btn" id="btnMomo" onclick="selectMethod('momo')">
        <div style="height:32px;display:flex;align-items:center;justify-content:center">
          <svg width="80" height="28" viewBox="0 0 80 28" fill="none"><rect width="80" height="28" rx="5" fill="#A50064"/><text x="40" y="19" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold" font-family="Arial,sans-serif">MoMo</text></svg>
        </div>
        <p>MoMo</p>
      </div>
    </div>
    <button class="btn-pay" id="payBtn" onclick="startPayment()"><i class="fa fa-lock"></i> Thanh toán ngay</button>
    <p class="secure-note"><i class="fa fa-shield-halved"></i> Giao dịch được mã hoá SSL · Không lưu thông tin thẻ</p>`;
}

function selectMethod(m) {
  selectedMethod = m;
  document.getElementById("btnVnpay").classList.toggle("active", m === "vnpay");
  document.getElementById("btnMomo").classList.toggle("active", m === "momo");
}

async function startPayment() {
  const btn = document.getElementById("payBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Đang xử lý...';
  try {
    const res = await authFetch(
      `${HANYU_API}/payment/${selectedMethod}/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      },
    );

    // Check status BEFORE consuming response body
    if (res.status === 401) {
      localStorage.setItem("payAfterLogin", `payment.html?plan=${plan}`);
      location.replace(
        `login.html?redirect=${encodeURIComponent(`payment.html?plan=${plan}`)}`,
      );
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        res.status === 500
          ? "Cổng thanh toán chưa được cấu hình. Vui lòng liên hệ quản trị viên để thiết lập VNPAY/MoMo API keys trong file .env"
          : data.message || "Lỗi tạo đơn hàng",
      );
    }
    localStorage.setItem("pendingPlan", plan);
    localStorage.setItem("lastOrderId", data.orderId);
    window.location.href = data.payUrl;
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-lock"></i> Thanh toán ngay';
    let errDiv = document.getElementById("payErrMsg");
    if (!errDiv) {
      errDiv = document.createElement("div");
      errDiv.id = "payErrMsg";
      errDiv.style.cssText =
        "background:#7f1d1d;border:1px solid #dc2626;border-radius:10px;padding:12px 16px;margin-top:14px;font-size:.85rem;color:#fca5a5;line-height:1.5";
      btn.parentNode.insertBefore(errDiv, btn.nextSibling);
    }
    errDiv.innerHTML =
      '<i class="fa fa-exclamation-triangle" style="margin-right:8px"></i>' +
      err.message;
  }
}

function renderStatus(s, orderId) {
  const map = {
    success: {
      icon: "🎉",
      title: "Thanh toán thành công!",
      color: "#22c55e",
      msg: "Gói của bạn đã được kích hoạt. Chúc bạn học tốt!",
    },
    failed: {
      icon: "❌",
      title: "Thanh toán thất bại",
      color: "#ef4444",
      msg: "Giao dịch không thành công. Vui lòng thử lại.",
    },
    invalid: {
      icon: "⚠️",
      title: "Chữ ký không hợp lệ",
      color: "#f59e0b",
      msg: "Giao dịch bị từ chối vì lý do bảo mật.",
    },
    error: {
      icon: "🔧",
      title: "Lỗi hệ thống",
      color: "#94a3b8",
      msg: "Đã có lỗi xảy ra. Vui lòng liên hệ hỗ trợ.",
    },
  };
  const info = map[s] || map.error;
  wrap.innerHTML = `<div class="status-screen">
    <div class="status-icon">${info.icon}</div>
    <h2 style="color:${info.color}">${info.title}</h2>
    <p>${info.msg}</p>
    ${orderId ? `<p class="mb-3" style="font-size:.85rem;color:#64748b">Mã đơn hàng: <strong>${orderId}</strong></p>` : ""}
    <a href="${s === "success" ? "lessons.html" : "../index.html#pricing"}" class="btn-home">${s === "success" ? "📚 Bắt đầu học ngay" : "← Quay lại"}</a>
  </div>`;
  if (s === "success") {
    (async () => {
      const savedPlan = localStorage.getItem("pendingPlan") || plan;
      localStorage.removeItem("pendingPlan");
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      const expiryStr = expiry.toISOString();
      function applyPlan(store) {
        try {
          const raw = store.getItem("hanyuUser");
          if (!raw) return;
          const u = JSON.parse(raw);
          u.plan = savedPlan;
          u.plan_expiry = expiryStr;
          store.setItem("hanyuUser", JSON.stringify(u));
        } catch {}
      }
      applyPlan(localStorage);
      applyPlan(sessionStorage);
      if (orderId) {
        try {
          const orderRes = await authFetch(
            `${API}/payment/order/${orderId}`,
            {},
          );
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            const actualPlan = orderData.plan || savedPlan;
            [localStorage, sessionStorage].forEach((s) => {
              try {
                const raw = s.getItem("hanyuUser");
                if (!raw) return;
                const u = JSON.parse(raw);
                u.plan = actualPlan;
                s.setItem("hanyuUser", JSON.stringify(u));
              } catch {}
            });
          }
        } catch {}
      }
    })();
  }
}
