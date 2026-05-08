const router = require('express').Router();
const ctrl   = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/vnpay/create',   authenticate, ctrl.vnpayCreate);
router.get ('/vnpay/return',                 ctrl.vnpayReturn);
router.post('/momo/create',    authenticate, ctrl.momoCreate);
router.post('/momo/ipn',                     ctrl.momoIPN);
router.get ('/order/:orderId', authenticate, ctrl.getOrder);

module.exports = router;
