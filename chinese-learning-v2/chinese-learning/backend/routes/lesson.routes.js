const router = require('express').Router();
const ctrl   = require('../controllers/lesson.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

router.get ('/',             optionalAuth,  ctrl.getAll);
router.get ('/:id',          optionalAuth,  ctrl.getById);
router.post('/:id/complete', authenticate,  ctrl.complete);

module.exports = router;
