/**
 * VNPAY SERVICE — Tạo URL thanh toán và xác thực callback
 */
const crypto = require("crypto");

// Xac dinh moi truong thanh toan hien tai: production hoac sandbox.
function getPaymentEnvironment() {
  return (
    process.env.PAYMENT_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "sandbox")
  );
}

// Kiem tra URL gateway co phai URL sandbox/test hay khong.
function isSandboxGateway(url) {
  return /sandbox|test/i.test(String(url || ""));
}

// Dam bao URL VNPay khop voi PAYMENT_ENVIRONMENT.
function gatewayEnvironmentOk(url) {
  const env = getPaymentEnvironment();
  const gatewayIsSandbox = isSandboxGateway(url);
  return env === "production" ? !gatewayIsSandbox : gatewayIsSandbox;
}

const VNPayService = {
  // Tao URL thanh toan VNPay de frontend redirect nguoi dung sang cong thanh toan.
  buildPayUrl({ orderId, amount, plan, ipAddr }) {
    // Lay cau hinh merchant, secret va gateway tu bien moi truong.
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const vnpayUrl = process.env.VNPAY_URL;
    // VNPay se redirect ve endpoint nay sau khi nguoi dung thanh toan.
    const returnUrl = `${process.env.BASE_URL}/api/payment/vnpay/return`;

    // Chan URL gateway sai moi truong de tranh nham sandbox/production.
    if (!gatewayEnvironmentOk(vnpayUrl)) {
      throw new Error("VNPAY_URL không khớp PAYMENT_ENVIRONMENT");
    }

    // pad giup format ngay gio luon du 2 chu so.
    const pad = (n) => String(n).padStart(2, "0");
    // VNPay can thoi gian theo gio Viet Nam, nen cong them UTC+7.
    const vn = new Date(Date.now() + 7 * 3600000);
    // Link thanh toan het han sau 30 phut.
    const exp = new Date(vn.getTime() + 30 * 60000);
    // Format ngay gio theo yyyyMMddHHmmss nhu VNPay yeu cau.
    const fmt = (d) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;

    // Tap tham so gui sang VNPay.
    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      // VNPay nhan so tien theo don vi x100.
      vnp_Amount: String(amount * 100),
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan goi ${plan} HanYu`,
      vnp_OrderType: "billpayment",
      vnp_Locale: "vn",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: fmt(vn),
      vnp_ExpireDate: fmt(exp),
    };

    // Sort params theo key alphabet vi chu ky VNPay phu thuoc dung thu tu tham so.
    const sorted = Object.fromEntries(
      Object.keys(params)
        .sort()
        .map((k) => [k, params[k]]),
    );
    // URLSearchParams tao query string dung chuan encode.
    const signData = new URLSearchParams(sorted).toString();
    // Ky query string bang HMAC SHA512 voi secret cua merchant.
    const hash = crypto
      .createHmac("sha512", hashSecret)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    // Tra ve URL hoan chinh de client redirect sang VNPay.
    return `${vnpayUrl}?${signData}&vnp_SecureHash=${hash}`;
  },

  // Xac thuc callback/return query tu VNPay voi chu ky, so tien, merchant va moi truong.
  verifyReturn(queryParams, order) {
    // Clone query de co the xoa hash ma khong lam doi object goc.
    const params = { ...queryParams };
    // Lay chu ky VNPay gui ve.
    const secureHash = params["vnp_SecureHash"];
    // Hai field hash khong duoc dua vao chuoi tu tinh lai chu ky.
    delete params["vnp_SecureHash"];
    delete params["vnp_SecureHashType"];

    // Sort lai params theo dung quy tac ky cua VNPay.
    const sorted = Object.fromEntries(
      Object.keys(params)
        .sort()
        .map((k) => [k, params[k]]),
    );
    // Tao lai chuoi du lieu da ky.
    const signData = new URLSearchParams(sorted).toString();
    // Tinh lai chu ky bang secret cua backend.
    const check = crypto
      .createHmac("sha512", process.env.VNPAY_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");
    // Chu ky hop le khi chu ky tu tinh bang chu ky VNPay gui ve.
    const signatureValid = check === secureHash;

    // VNPay tra so tien x100, nen chia 100 de so sanh voi order.amount.
    const callbackAmount = Number(params["vnp_Amount"]) / 100;
    const orderAmount = Number(order?.amount || 0);
    const amountValid =
      Number.isFinite(callbackAmount) && callbackAmount === orderAmount;
    // VNPay return có thể không gửi vnp_CurrCode, nên chỉ validate khi field này có mặt.
    // Neu co tien te thi chi chap nhan VND.
    const currency = params["vnp_CurrCode"];
    const currencyValid = !currency || currency === "VND";
    // Dam bao callback thuoc dung merchant.
    const merchantValid = params["vnp_TmnCode"] === process.env.VNPAY_TMN_CODE;
    // Dam bao callback duoc validate trong dung moi truong gateway.
    const envValid = gatewayEnvironmentOk(process.env.VNPAY_URL);

    // Tra ve ket qua tong va cac co chi tiet de controller biet ly do hop le/khong hop le.
    return {
      valid:
        signatureValid &&
        amountValid &&
        currencyValid &&
        merchantValid &&
        envValid,
      signatureValid,
      success: params["vnp_ResponseCode"] === "00",
      orderId: params["vnp_TxnRef"],
      amountValid,
      currencyValid,
      merchantValid,
      envValid,
    };
  },
};

module.exports = VNPayService;
