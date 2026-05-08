/**
 * PAYMENT VERIFY TESTS — HánYǔ Backend
 *
 * Kiểm tra verify payment phải so khớp:
 * - signature
 * - amount
 * - merchant id
 * - environment
 */
const assert = require("assert");
const crypto = require("crypto");

process.env.NODE_ENV = "development";
process.env.PAYMENT_ENVIRONMENT = "sandbox";
process.env.VNPAY_TMN_CODE = "VNPAYTEST";
process.env.VNPAY_HASH_SECRET = "vnp-secret";
process.env.VNPAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
process.env.MOMO_PARTNER_CODE = "MOMOTEST";
process.env.MOMO_ACCESS_KEY = "momo-access";
process.env.MOMO_SECRET_KEY = "momo-secret";
process.env.MOMO_API_URL = "https://test-payment.momo.vn/v2/gateway/api/create";

const VNPayService = require("../services/vnpay.service");
const MoMoService = require("../services/momo.service");

function signVnp(query) {
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  const sorted = Object.fromEntries(
    Object.keys(params)
      .sort()
      .map((k) => [k, params[k]]),
  );
  const signData = new URLSearchParams(sorted).toString();
  return crypto
    .createHmac("sha512", process.env.VNPAY_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");
}

function signMomo(payload) {
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
  return crypto
    .createHmac("sha256", process.env.MOMO_SECRET_KEY)
    .update(rawSignature)
    .digest("hex");
}

function run() {
  const order = { amount: 99000 };

  const vnpGood = {
    vnp_Amount: "9900000",
    vnp_CurrCode: "VND",
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_TxnRef: "ORDER_1",
    vnp_ResponseCode: "00",
    vnp_SecureHashType: "SHA512",
  };
  vnpGood.vnp_SecureHash = signVnp(vnpGood);
  const vnpGoodResult = VNPayService.verifyReturn(vnpGood, order);
  assert.strictEqual(vnpGoodResult.valid, true);
  assert.strictEqual(vnpGoodResult.amountValid, true);
  assert.strictEqual(vnpGoodResult.currencyValid, true);
  assert.strictEqual(vnpGoodResult.merchantValid, true);
  assert.strictEqual(vnpGoodResult.envValid, true);

  const vnpBadAmount = { ...vnpGood, vnp_Amount: "1000000" };
  vnpBadAmount.vnp_SecureHash = signVnp(vnpBadAmount);
  assert.strictEqual(
    VNPayService.verifyReturn(vnpBadAmount, order).valid,
    false,
  );

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
  momoGood.signature = signMomo(momoGood);
  const momoGoodResult = MoMoService.verifyIPN(momoGood, order);
  assert.strictEqual(momoGoodResult.valid, true);
  assert.strictEqual(momoGoodResult.amountValid, true);
  assert.strictEqual(momoGoodResult.merchantValid, true);
  assert.strictEqual(momoGoodResult.envValid, true);

  const momoBadMerchant = { ...momoGood, partnerCode: "WRONG" };
  momoBadMerchant.signature = signMomo(momoBadMerchant);
  assert.strictEqual(
    MoMoService.verifyIPN(momoBadMerchant, order).valid,
    false,
  );

  console.log("Payment verify tests passed.");
}

run();
