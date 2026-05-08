const router = require('express').Router();
const ctrl   = require('../controllers/progress.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get ('/',   authenticate, ctrl.get);
router.post('/xp', authenticate, ctrl.addXP);

// FIX N12: Đã xóa POST /lessons/:lessonId/complete — duplicate với /api/lessons/:id/complete
// Frontend dùng endpoint chính: POST /api/lessons/:id/complete (lesson.controller.js)
// Giữ route này để trả 301 redirect cho client cũ (backward compat)
router.post('/lessons/:lessonId/complete', authenticate, (req, res) => {
  res.status(301).json({
    message: 'Endpoint đã chuyển sang POST /api/lessons/:lessonId/complete',
    redirect: `/api/lessons/${req.params.lessonId}/complete`,
  });
});

module.exports = router;
