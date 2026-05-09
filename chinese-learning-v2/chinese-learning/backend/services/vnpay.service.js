/**
 * VNPAY SERVICE — Tạo URL thanh toán và xác thực callback
 */
const crypto = require("crypto");

function getPaymentEnvironment() {
  return (
    process.env.PAYMENT_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "sandbox")
  );
}

function isSandboxGateway(url) {
  return /sandbox|test/i.test(String(url || ""));
}

function gatewayEnvironmentOk(url) {
  const env = getPaymentEnvironment();
  const gatewayIsSandbox = isSandboxGateway(url);
  return env === "production" ? !gatewayIsSandbox : gatewayIsSandbox;
}

const VNPayService = {
  buildPayUrl({ orderId, amount, plan, ipAddr }) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const vnpayUrl = process.env.VNPAY_URL;
    const returnUrl = `${process.env.BASE_URL}/api/payment/vnpay/return`;

    if (!gatewayEnvironmentOk(vnpayUrl)) {
      throw new Error("VNPAY_URL không khớp PAYMENT_ENVIRONMENT");
    }

    const pad = (n) => String(n).padStart(2, "0");
    const vn = new Date(Date.now() + 7 * 3600000);
    const exp = new Date(vn.getTime() + 30 * 60000);
    const fmt = (d) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;

    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
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

    const sorted = Object.fromEntries(
      Object.keys(params)
        .sort()
        .map((k) => [k, params[k]]),
    );
    const signData = new URLSearchParams(sorted).toString();
    const hash = crypto
      .createHmac("sha512", hashSecret)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    return `${vnpayUrl}?${signData}&vnp_SecureHash=${hash}`;
  },

  verifyReturn(queryParams, order) {
    const params = { ...queryParams };
    const secureHash = params["vnp_SecureHash"];
    delete params["vnp_SecureHash"];
    delete params["vnp_SecureHashType"];

    const sorted = Object.fromEntries(
      Object.keys(params)
        .sort()
        .map((k) => [k, params[k]]),
    );
    const signData = new URLSearchParams(sorted).toString();
    const check = crypto
      .createHmac("sha512", process.env.VNPAY_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");
    const signatureValid = check === secureHash;

    const callbackAmount = Number(params["vnp_Amount"]) / 100;
    const orderAmount = Number(order?.amount || 0);
    const amountValid =
      Number.isFinite(callbackAmount) && callbackAmount === orderAmount;
    // VNPay return có thể không gửi vnp_CurrCode, nên chỉ validate khi field này có mặt.
    const currency = params["vnp_CurrCode"];
    const currencyValid = !currency || currency === "VND";
    const merchantValid = params["vnp_TmnCode"] === process.env.VNPAY_TMN_CODE;
    const envValid = gatewayEnvironmentOk(process.env.VNPAY_URL);

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
