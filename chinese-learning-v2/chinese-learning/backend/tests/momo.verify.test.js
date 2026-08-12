// Import assert de kiem tra ket qua verify.
const assert = require("assert");
// Import crypto de tao chu ky HMAC giong MoMo.
const crypto = require("crypto");
// Import service that can duoc test.
const MoMoService = require("../services/momo.service");

// Helper tao signature hop le cho payload IPN cua MoMo.
function sign(payload, secretKey) {
  // MoMo yeu cau raw signature ghep cac field theo dung thu tu nay.
  const rawSignature = [
    `accessKey=${process.env.MOMO_ACCESS_KEY}`,
    `amount=${payload.amount}`,
    `extraData=${payload.extraData || ""}`,
    `message=${payload.message}`,
    `orderId=${payload.orderId}`,
    `orderInfo=${payload.orderInfo}`,
    `orderType=${payload.orderType}`,
    `partnerCode=${payload.partnerCode}`,
    `payType=${payload.payType}`,
    `requestId=${payload.requestId}`,
    `responseTime=${payload.responseTime}`,
    `resultCode=${payload.resultCode}`,
    `transId=${payload.transId}`,
  ].join("&");

  // Ky rawSignature bang HMAC-SHA256 va tra ve chuoi hex.
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

// Ham chay cac case verifyIPN co ban.
function run() {
  // Gan env test de service co key, merchant va environment dung khi verify.
  process.env.PAYMENT_ENVIRONMENT = "sandbox";
  process.env.MOMO_PARTNER_CODE = "MOMO";
  process.env.MOMO_ACCESS_KEY = "test-access-key";
  process.env.MOMO_SECRET_KEY = "test-secret-key";
  process.env.MOMO_API_URL = "https://test-payment.momo.vn/v2/gateway/api/create";

  // Order trong he thong co amount khop voi callback MoMo.
  const order = { amount: 99000 };

  // Payload nen chua cac field chung cua IPN MoMo.
  const basePayload = {
    amount: "99000",
    extraData: "",
    message: "Success",
    orderId: "ORDER_123",
    orderInfo: "Thanh toan",
    orderType: "momo_wallet",
    partnerCode: "MOMO",
    payType: "web",
    requestId: "REQ_123",
    responseTime: "1715000000000",
    transId: "TRANS_123",
  };

  // Case thanh cong voi resultCode la string "0".
  const successStringPayload = { ...basePayload, resultCode: "0" };
  // Them signature dung vao payload.
  const successString = {
    ...successStringPayload,
    signature: sign(successStringPayload, process.env.MOMO_SECRET_KEY),
  };
  // Goi service verify IPN.
  const successStringResult = MoMoService.verifyIPN(successString, order);
  // Chu ky va payload phai hop le.
  assert.strictEqual(successStringResult.valid, true);
  // resultCode "0" phai duoc xem la giao dich thanh cong.
  assert.strictEqual(successStringResult.success, true);

  // Case thanh cong voi resultCode la number 0.
  const successNumberPayload = { ...basePayload, resultCode: 0 };
  // Tao payload co signature dung cho number 0.
  const successNumber = {
    ...successNumberPayload,
    signature: sign(successNumberPayload, process.env.MOMO_SECRET_KEY),
  };
  // Verify de dam bao service chap nhan ca string va number.
  const successNumberResult = MoMoService.verifyIPN(successNumber, order);
  assert.strictEqual(successNumberResult.valid, true);
  assert.strictEqual(successNumberResult.success, true);

  // Case giao dich that bai nhung signature van dung.
  const failedPayload = { ...basePayload, resultCode: "1" };
  // Ky lai payload that bai.
  const failed = {
    ...failedPayload,
    signature: sign(failedPayload, process.env.MOMO_SECRET_KEY),
  };
  // Verify IPN that bai.
  const failedResult = MoMoService.verifyIPN(failed, order);
  // Payload van valid vi signature dung.
  assert.strictEqual(failedResult.valid, true);
  // Nhung success phai false vi resultCode khac 0.
  assert.strictEqual(failedResult.success, false);

  // Neu tat ca case qua, in thong bao pass.
  console.log("MoMo verifyIPN basic tests passed.");
}

// Chay test.
run();
