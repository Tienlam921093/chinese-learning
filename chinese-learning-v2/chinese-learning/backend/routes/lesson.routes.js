const router = require('express').Router();
const ctrl   = require('../controllers/lesson.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

// Optional auth giup guest xem bai hoc, con user dang nhap co the nhan them trang thai tien do.
router.get ('/',             optionalAuth,  ctrl.getAll);
router.get ('/:id',          optionalAuth,  ctrl.getById);
// Hoan thanh bai hoc lam thay doi progress/XP nen can token bat buoc.
router.post('/:id/complete', authenticate,  ctrl.complete);

module.exports = router;
