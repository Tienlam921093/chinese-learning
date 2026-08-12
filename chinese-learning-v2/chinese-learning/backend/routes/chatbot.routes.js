const router = require('express').Router();
const ctrl   = require('../controllers/chatbot.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

// Chat co the chay cho guest; neu co token hop le thi controller nhan them req.user.
router.post  ('/chat',    optionalAuth, ctrl.chat);
// History va clear la du lieu rieng cua user nen bat buoc dang nhap.
router.get   ('/history', authenticate, ctrl.history);
router.delete('/clear',   authenticate, ctrl.clear);

module.exports = router;
