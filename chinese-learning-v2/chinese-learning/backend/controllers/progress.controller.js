/**
 * PROGRESS CONTROLLER
 *
 * FIX H4: Xóa endpoint addXP tùy ý → chỉ cộng XP qua complete lesson
 * FIX H5: Validate score/time_spent, tránh cộng XP trùng lặp
 */
const ProgressModel = require('../models/progress.model');

const ProgressController = {

  async get(req, res) {
    try {
      const user = await ProgressModel.getByUser(req.user.id);
      if (!user) return res.status(404).json({ message: 'User không tồn tại' });

      let completedLessonIds = [];
      try { completedLessonIds = await ProgressModel.getCompletedLessons(req.user.id); } catch {}

      res.json({
        xp:                  user.xp || 0,
        streak:              user.streak || 0,
        hsk_level:           user.hsk_level || 1,
        completed_lessons:   completedLessonIds.length,
        completedLessonIds,
        last_active:         user.last_login,
      });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi lấy tiến độ' });
    }
  },

  // FIX H4: Endpoint này giờ chỉ trả về thông báo từ chối
  // XP chỉ được cộng server-side qua completeLesson
  async addXP(req, res) {
    return res.status(403).json({
      message: 'XP chỉ được cộng khi hoàn thành bài học. Sử dụng endpoint /lessons/:id/complete.',
    });
  },

  async completeLesson(req, res) {
    try {
      const lessonId = Number(req.params.lessonId || req.body.lesson_id);
      if (!lessonId) return res.status(400).json({ message: 'Thiếu lesson_id' });

      // FIX H5 + M4: Validate score và time_spent
      const score     = Math.max(0, Math.min(100, parseInt(req.body.score) || 100));
      const timeSpent = Math.max(0, Math.min(7200, parseInt(req.body.time_spent) || 0));

      try {
        await ProgressModel.completeLesson(req.user.id, lessonId, score, timeSpent);
      } catch (dbErr) {
        return res.json({
          message: 'Đã ghi nhận hoàn thành bài học ở chế độ fallback',
          lesson_id: lessonId,
          db_saved: false,
        });
      }

      res.json({
        message: 'Đã hoàn thành bài học',
        lesson_id: lessonId,
        score,
        db_saved: true,
      });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi ghi nhận hoàn thành bài học' });
    }
  },
};

module.exports = ProgressController;

