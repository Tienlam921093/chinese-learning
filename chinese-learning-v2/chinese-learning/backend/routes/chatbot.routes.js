const router = require('express').Router();
const ctrl   = require('../controllers/chatbot.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

router.post  ('/chat',    optionalAuth, ctrl.chat);
router.get   ('/history', authenticate, ctrl.history);
router.delete('/clear',   authenticate, ctrl.clear);

module.exports = router;
