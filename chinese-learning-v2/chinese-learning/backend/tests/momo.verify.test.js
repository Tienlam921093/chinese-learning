const assert = require('assert');
const crypto = require('crypto');
const MoMoService = require('../services/momo.service');

function sign(payload, secretKey) {
  const rawSignature = [
    `accessKey=${process.env.MOMO_ACCESS_KEY}`,
    `amount=${payload.amount}`,
    `extraData=${payload.extraData || ''}`,
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
  ].join('&');

  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
}

function run() {
  process.env.MOMO_ACCESS_KEY = 'test-access-key';
  process.env.MOMO_SECRET_KEY = 'test-secret-key';

  const basePayload = {
    amount: '99000',
    extraData: '',
    message: 'Success',
    orderId: 'ORDER_123',
    orderInfo: 'Thanh toan',
    orderType: 'momo_wallet',
    partnerCode: 'MOMO',
    payType: 'web',
    requestId: 'REQ_123',
    responseTime: '1715000000000',
    transId: 'TRANS_123',
  };

  const successStringPayload = { ...basePayload, resultCode: '0' };
  const successString = {
    ...successStringPayload,
    signature: sign(successStringPayload, process.env.MOMO_SECRET_KEY),
  };
  const successStringResult = MoMoService.verifyIPN(successString);
  assert.strictEqual(successStringResult.valid, true);
  assert.strictEqual(successStringResult.success, true);

  const successNumberPayload = { ...basePayload, resultCode: 0 };
  const successNumber = {
    ...successNumberPayload,
    signature: sign(successNumberPayload, process.env.MOMO_SECRET_KEY),
  };
  const successNumberResult = MoMoService.verifyIPN(successNumber);
  assert.strictEqual(successNumberResult.valid, true);
  assert.strictEqual(successNumberResult.success, true);

  const failedPayload = { ...basePayload, resultCode: '1' };
  const failed = {
    ...failedPayload,
    signature: sign(failedPayload, process.env.MOMO_SECRET_KEY),
  };
  const failedResult = MoMoService.verifyIPN(failed);
  assert.strictEqual(failedResult.valid, true);
  assert.strictEqual(failedResult.success, false);

  console.log('MoMo verifyIPN basic tests passed.');
}

run();
