/**
 * MOMO SERVICE — Tạo payment request và xác thực IPN
 */
const crypto = require("crypto");

// Xac dinh moi truong thanh toan hien tai: production hoac sandbox.
function getPaymentEnvironment() {
  return (
    process.env.PAYMENT_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "sandbox")
  );
}

// Kiem tra URL gateway co phai moi truong test/sandbox hay khong.
function isSandboxGateway(url) {
  return /sandbox|test/i.test(String(url || ""));
}

// Dam bao URL gateway khop voi PAYMENT_ENVIRONMENT de tranh gui tien that nham moi truong test hoac nguoc lai.
function gatewayEnvironmentOk(url) {
  const env = getPaymentEnvironment();
  const gatewayIsSandbox = isSandboxGateway(url);
  return env === "production" ? !gatewayIsSandbox : gatewayIsSandbox;
}

const MoMoService = {
  // Tao payment request va gui len MoMo de lay thong tin thanh toan.
  async createPayment({ orderId, amount, plan }) {
    // Lay thong tin merchant va secret tu bien moi truong.
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    // Neu khong cau hinh MOMO_API_URL thi mac dinh dung gateway test cua MoMo.
    const apiUrl =
      process.env.MOMO_API_URL ||
      "https://test-payment.momo.vn/v2/gateway/api/create";
    // Sau khi thanh toan, nguoi dung duoc dieu huong ve trang payment cua frontend.
    const redirectUrl = `${process.env.FRONTEND_URL}/pages/payment.html`;
    // IPN la callback server-to-server de MoMo bao ket qua thanh toan cho backend.
    const ipnUrl = `${process.env.PUBLIC_URL || process.env.BASE_URL}/api/payment/momo/ipn`;

    // Chan cau hinh gateway sai moi truong truoc khi tao giao dich.
    if (!gatewayEnvironmentOk(apiUrl)) {
      throw new Error("MOMO_API_URL không khớp PAYMENT_ENVIRONMENT");
    }

    // requestId can duy nhat cho moi lan tao yeu cau thanh toan.
    const requestId = `${orderId}_${Date.now()}`;
    // orderInfo la noi dung hien thi ben MoMo.
    const orderInfo = `Thanh toan goi ${plan} HanYu`;
    // payWithMethod cho phep MoMo hien thi cac phuong thuc thanh toan ho tro.
    const requestType = "payWithMethod";
    // extraData de trong vi hien tai khong can gui them metadata.
    const extraData = "";

    // Chuoi ky phai dung dung thu tu field theo tai lieu MoMo.
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

    // Tao chu ky HMAC SHA256 de MoMo xac thuc request den tu merchant hop le.
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    // Body JSON gui len API tao thanh toan cua MoMo.
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

    // Gui request tao giao dich toi MoMo.
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Neu MoMo tra HTTP error thi nem loi cho controller xu ly.
    if (!res.ok) throw new Error(`MoMo API error: ${res.status}`);
    // Tra response JSON, thuong chua payUrl/deeplink/qrCode tuy MoMo tra ve.
    return res.json();
  },

  // Xac thuc IPN callback cua MoMo voi chu ky, so tien, merchant va moi truong.
  verifyIPN(body, order) {
    // Tach chu ky MoMo gui sang de so sanh voi chu ky backend tu tinh.
    const { signature: receivedSig, ...rest } = body;
    const secretKey = process.env.MOMO_SECRET_KEY;

    // Tao lai chuoi ky tu cac field callback theo dung thu tu MoMo yeu cau.
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

    // Tinh chu ky ky vong tu callback.
    const expected = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");
    // So sanh so tien callback voi order trong database.
    const callbackAmount = Number(rest.amount);
    const orderAmount = Number(order?.amount || 0);
    const amountValid =
      Number.isFinite(callbackAmount) && callbackAmount === orderAmount;
    // Dam bao callback thuoc dung merchant.
    const merchantValid = rest.partnerCode === process.env.MOMO_PARTNER_CODE;
    // Dam bao callback dang duoc validate theo dung moi truong gateway.
    const envValid = gatewayEnvironmentOk(
      process.env.MOMO_API_URL ||
        "https://test-payment.momo.vn/v2/gateway/api/create",
    );
    // Tra ve ca ket qua tong va cac co chi tiet de controller/log de debug.
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
