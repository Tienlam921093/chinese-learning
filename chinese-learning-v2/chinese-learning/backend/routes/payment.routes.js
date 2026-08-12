const router = require('express').Router();
const ctrl   = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Tao giao dich can user dang nhap de gan order voi tai khoan.
router.post('/vnpay/create',   authenticate, ctrl.vnpayCreate);
// Return/IPN la callback tu cong thanh toan nen khong dung middleware auth cua user.
router.get ('/vnpay/return',                 ctrl.vnpayReturn);
router.post('/momo/create',    authenticate, ctrl.momoCreate);
router.post('/momo/ipn',                     ctrl.momoIPN);
// Xem order can auth de controller chi tra order cua user hien tai.
router.get ('/order/:orderId', authenticate, ctrl.getOrder);

module.exports = router;
