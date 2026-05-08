/**
 * LESSON CONTROLLER
 *
 * FIX M3: Plan check query từ DB thay vì JWT (JWT không chứa plan)
 * FIX M4: Validate score range 0-100, time_spent hợp lý
 */
const LessonModel = require('../models/lesson.model');
const UserModel   = require('../models/user.model');
const { calculateLessonXP } = require('../utils/xp.utils');

const PLAN_ACCESS = { free: 1, pro: 4, premium: 6 };

/**
 * FIX M3: Lấy plan từ DB vì JWT không chứa plan
 * req.user?.plan luôn undefined → luôn fallback 'free' → user trả phí bị lock
 */
async function getUserPlan(userId) {
  if (!userId) return 'free';
  try {
    const user = await UserModel.findById(userId);
    return user?.plan || 'free';
  } catch {
    return 'free';
  }
}

const LessonController = {

  async getAll(req, res) {
    try {
      const { hsk_level, limit, offset } = req.query;
      const { lessons, fromDB } = await LessonModel.getAll({ hsk_level, limit, offset });

      // FIX M3: Lấy plan từ DB
      const userPlan = await getUserPlan(req.user?.id);
      const maxHSK   = PLAN_ACCESS[userPlan] || 1;

      const withLock = lessons.map(l => ({
        ...l,
        locked:       l.hsk_level > maxHSK,
        required_plan: l.hsk_level > 4 ? 'premium' : l.hsk_level > 1 ? 'pro' : null,
      }));

      res.json({ lessons: withLock, total: withLock.length, source: fromDB ? 'db' : 'demo' });
    } catch (err) {
      console.error('[LESSON] getAll:', err.message);
      res.status(500).json({ message: 'Lỗi lấy danh sách bài học' });
    }
  },

  async getById(req, res) {
    try {
      const lesson = await LessonModel.findById(req.params.id);
      if (!lesson) return res.status(404).json({ message: 'Bài học không tồn tại' });

      // FIX M3: Lấy plan từ DB
      const userPlan = await getUserPlan(req.user?.id);
      const maxHSK   = PLAN_ACCESS[userPlan] || 1;
      if (lesson.hsk_level > maxHSK)
        return res.status(403).json({ message: 'Bạn cần nâng cấp gói để truy cập bài học này' });

      res.json({ lesson });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi lấy bài học' });
    }
  },

  async complete(req, res) {
    try {
      // FIX M4: Validate score 0-100, time_spent hợp lý
      const score     = Math.max(0, Math.min(100, parseInt(req.body.score) || 100));
      const time_spent = Math.max(0, Math.min(7200, parseInt(req.body.time_spent) || 0));
      const lessonId  = parseInt(req.params.id);

      if (!lessonId || isNaN(lessonId))
        return res.status(400).json({ message: 'Lesson ID không hợp lệ' });

      const { alreadyCompleted } = await LessonModel.saveProgress({
        userId: req.user.id,
        lessonId,
        score,
        timeSpent: time_spent
      });

      // Chỉ cộng XP ở lần hoàn thành đầu tiên để tránh farm XP.
      let xpGain = 0;
      if (!alreadyCompleted) {
        xpGain = calculateLessonXP(score);
        await UserModel.addXP(req.user.id, xpGain);
      }

      res.json({
        message: alreadyCompleted ? 'Đã cập nhật kết quả bài học' : 'Hoàn thành bài học!',
        xp_gained: xpGain,
        score
      });
    } catch (err) {
      console.error('[LESSON] complete:', err.message);
      res.status(500).json({ message: 'Lỗi cập nhật tiến độ' });
    }
  },
};

module.exports = LessonController;

