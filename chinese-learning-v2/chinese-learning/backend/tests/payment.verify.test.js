/**
 * PAYMENT VERIFY TESTS - HanYu Backend
 *
 * File nay kiem tra viec verify payment co so khop cac yeu to quan trong:
 * - signature
 * - amount
 * - merchant id
 * - environment
 */

// Import assert de viet cac ky vong trong test.
const assert = require("assert");
// Import crypto de tao chu ky HMAC cho VNPay va MoMo.
const crypto = require("crypto");

// Dat moi truong test la development.
process.env.NODE_ENV = "development";
// Payment environment dung sandbox.
process.env.PAYMENT_ENVIRONMENT = "sandbox";
// Ma merchant VNPay dung trong test.
process.env.VNPAY_TMN_CODE = "VNPAYTEST";
// Secret de ky/verify VNPay trong test.
process.env.VNPAY_HASH_SECRET = "vnp-secret";
// URL sandbox VNPay de service nhan dien environment.
process.env.VNPAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
// Partner code MoMo dung trong test.
process.env.MOMO_PARTNER_CODE = "MOMOTEST";
// Access key MoMo dung trong test.
process.env.MOMO_ACCESS_KEY = "momo-access";
// Secret key MoMo dung trong test.
process.env.MOMO_SECRET_KEY = "momo-secret";
// URL sandbox MoMo de service nhan dien environment.
process.env.MOMO_API_URL = "https://test-payment.momo.vn/v2/gateway/api/create";

// Import service sau khi da set env, de service doc duoc config test.
const VNPayService = require("../services/vnpay.service");
const MoMoService = require("../services/momo.service");

// Helper tao secure hash VNPay cho query return.
function signVnp(query) {
  // Copy query de khong sua object goc.
  const params = { ...query };
  // Khi ky, VNPay khong dua chinh secure hash vao chuoi can ky.
  delete params.vnp_SecureHash;
  // Hash type cung khong nam trong du lieu can ky.
  delete params.vnp_SecureHashType;
  // Sap xep key alphabet de tao signData dung format VNPay.
  const sorted = Object.fromEntries(
    Object.keys(params)
      .sort()
      .map((k) => [k, params[k]]),
  );
  // Encode params thanh query string.
  const signData = new URLSearchParams(sorted).toString();
  // Ky bang HMAC-SHA512 voi secret VNPay.
  return crypto
    .createHmac("sha512", process.env.VNPAY_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");
}

// Helper tao signature MoMo cho payload IPN.
function signMomo(payload) {
  // MoMo yeu cau raw signature gom field theo dung thu tu nay.
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
  // Ky rawSignature bang HMAC-SHA256 voi secret MoMo.
  return crypto
    .createHmac("sha256", process.env.MOMO_SECRET_KEY)
    .update(rawSignature)
    .digest("hex");
}

// Ham run chay toan bo payment verify test.
function run() {
  // Order that trong he thong co amount 99,000 VND.
  const order = { amount: 99000 };

  // Tao VNPay return hop le. VNPay gui amount nhan 100 nen 99,000 thanh 9,900,000.
  const vnpGood = {
    vnp_Amount: "9900000",
    vnp_CurrCode: "VND",
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_TxnRef: "ORDER_1",
    vnp_ResponseCode: "00",
    vnp_SecureHashType: "SHA512",
  };
  // Gan secure hash hop le cho payload VNPay.
  vnpGood.vnp_SecureHash = signVnp(vnpGood);
  // Goi service verify return VNPay.
  const vnpGoodResult = VNPayService.verifyReturn(vnpGood, order);
  // Ket qua tong the phai valid.
  assert.strictEqual(vnpGoodResult.valid, true);
  // Amount tu VNPay phai khop order.
  assert.strictEqual(vnpGoodResult.amountValid, true);
  // Tien te phai la VND.
  assert.strictEqual(vnpGoodResult.currencyValid, true);
  // Merchant code phai khop env.
  assert.strictEqual(vnpGoodResult.merchantValid, true);
  // Environment phai dung sandbox.
  assert.strictEqual(vnpGoodResult.envValid, true);

  // Tao VNPay payload sai amount nhung signature van duoc ky dung cho payload do.
  const vnpBadAmount = { ...vnpGood, vnp_Amount: "1000000" };
  vnpBadAmount.vnp_SecureHash = signVnp(vnpBadAmount);
  // Verify phai fail vi amount khong khop order, du signature hop le.
  assert.strictEqual(
    VNPayService.verifyReturn(vnpBadAmount, order).valid,
    false,
  );

  // Tao MoMo IPN hop le cho order 99,000 VND.
  const momoGood = {
    amount: "99000",
    extraData: "",
    message: "Success",
    orderId: "ORDER_2",
    orderInfo: "Thanh toan",
    orderType: "momo_wallet",
    partnerCode: process.env.MOMO_PARTNER_CODE,
    payType: "web",
    requestId: "REQ_2",
    responseTime: "1715000000000",
    resultCode: "0",
    transId: "TRANS_2",
  };
  // Gan signature hop le cho MoMo IPN.
  momoGood.signature = signMomo(momoGood);
  // Goi service verify IPN MoMo.
  const momoGoodResult = MoMoService.verifyIPN(momoGood, order);
  // Ket qua tong the phai valid.
  assert.strictEqual(momoGoodResult.valid, true);
  // Amount tu MoMo phai khop order.
  assert.strictEqual(momoGoodResult.amountValid, true);
  // Partner code phai khop env.
  assert.strictEqual(momoGoodResult.merchantValid, true);
  // Environment phai dung sandbox.
  assert.strictEqual(momoGoodResult.envValid, true);

  // Tao MoMo IPN sai merchant nhung signature duoc ky lai theo payload sai.
  const momoBadMerchant = { ...momoGood, partnerCode: "WRONG" };
  momoBadMerchant.signature = signMomo(momoBadMerchant);
  // Verify phai fail vi partnerCode khong khop config.
  assert.strictEqual(
    MoMoService.verifyIPN(momoBadMerchant, order).valid,
    false,
  );

  // Neu tat ca assert qua, in thong bao pass.
  console.log("Payment verify tests passed.");
}

// Chay test.
run();
