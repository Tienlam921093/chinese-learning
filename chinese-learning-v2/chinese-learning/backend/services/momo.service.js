/**
 * MOMO SERVICE — Tạo payment request và xác thực IPN
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

const MoMoService = {
  async createPayment({ orderId, amount, plan }) {
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const apiUrl =
      process.env.MOMO_API_URL ||
      "https://test-payment.momo.vn/v2/gateway/api/create";
    const redirectUrl = `${process.env.FRONTEND_URL}/pages/payment.html`;
    const ipnUrl = `${process.env.PUBLIC_URL || process.env.BASE_URL}/api/payment/momo/ipn`;

    if (!gatewayEnvironmentOk(apiUrl)) {
      throw new Error("MOMO_API_URL không khớp PAYMENT_ENVIRONMENT");
    }

    const requestId = `${orderId}_${Date.now()}`;
    const orderInfo = `Thanh toan goi ${plan} HanYu`;
    const requestType = "payWithMethod";
    const extraData = "";

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join("&");

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const body = {
      partnerCode,
      accessKey,
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData,
      signature,
      lang: "vi",
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`MoMo API error: ${res.status}`);
    return res.json();
  },

  verifyIPN(body, order) {
    const { signature: receivedSig, ...rest } = body;
    const secretKey = process.env.MOMO_SECRET_KEY;

    const rawSignature = [
      `accessKey=${process.env.MOMO_ACCESS_KEY}`,
      `amount=${rest.amount}`,
      `extraData=${rest.extraData || ""}`,
      `message=${rest.message}`,
      `orderId=${rest.orderId}`,
      `orderInfo=${rest.orderInfo}`,
      `orderType=${rest.orderType}`,
      `partnerCode=${rest.partnerCode}`,
      `payType=${rest.payType}`,
      `requestId=${rest.requestId}`,
      `responseTime=${rest.responseTime}`,
      `resultCode=${rest.resultCode}`,
      `transId=${rest.transId}`,
    ].join("&");

    const expected = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");
    const callbackAmount = Number(rest.amount);
    const orderAmount = Number(order?.amount || 0);
    const amountValid =
      Number.isFinite(callbackAmount) && callbackAmount === orderAmount;
    const merchantValid = rest.partnerCode === process.env.MOMO_PARTNER_CODE;
    const envValid = gatewayEnvironmentOk(
      process.env.MOMO_API_URL ||
        "https://test-payment.momo.vn/v2/gateway/api/create",
    );
    return {
      valid:
        expected === receivedSig && amountValid && merchantValid && envValid,
      // FIX N16: MoMo có thể trả resultCode dạng string "0" hoặc number 0
      success: String(rest.resultCode) === "0",
      orderId: rest.orderId,
      amountValid,
      merchantValid,
      envValid,
    };
  },
};

module.exports = MoMoService;
