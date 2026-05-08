/**
 * QUIZ CONTROLLER
 *
 * Xử lý kết quả quiz từ frontend:
 * - Validate score, correct count
 * - Calculate XP dựa trên performance
 * - Persist progress vào DB
 * - Update user XP leaderboard
 */
const UserModel = require("../models/user.model");
const ProgressModel = require("../models/progress.model");
const { calculateLessonXP } = require("../utils/xp.utils");

const QuizController = {
  /**
   * POST /api/quiz/complete
   * Body: { correct, total, score, time_spent, type }
   *   - correct: số câu đúng
   *   - total: tổng số câu
   *   - score: tổng điểm (0-100)
   *   - time_spent: thời gian (giây)
   *   - type: 'meaning' | 'hanzi' | 'pinyin'
   */
  async complete(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Yêu cầu đăng nhập" });
      }

      // Validate input
      const total = Math.max(1, parseInt(req.body.total) || 15);
      const correct = Math.max(
        0,
        Math.min(total, parseInt(req.body.correct) || 0),
      );
      const score = Math.max(0, Math.min(100, parseInt(req.body.score) || 0));
      const timeSpent = Math.max(
        0,
        Math.min(7200, parseInt(req.body.time_spent) || 0),
      );
      const type = req.body.type || "mixed";

      // Calculate XP:
      // - Base: 10 XP per correct answer
      // - Bonus: time bonus (max +100 if all correct in <30 sec)
      // - Multiplier: accuracy multiplier (100% = 1.5x, 50% = 1.0x, <50% = 0.8x)
      const baseXP = correct * 10;
      const accuracy = correct / total;
      const accuracyMultiplier =
        accuracy >= 0.9
          ? 1.5
          : accuracy >= 0.7
            ? 1.2
            : accuracy >= 0.5
              ? 1.0
              : 0.8;

      let timeBonus = 0;
      if (correct === total && timeSpent <= 30) {
        timeBonus = 50;
      } else if (timeSpent <= 120) {
        timeBonus = Math.max(0, 30 - Math.floor(timeSpent / 10));
      }

      const xpGain = Math.round(baseXP * accuracyMultiplier + timeBonus);

      // Add XP to user
      await UserModel.addXP(userId, xpGain);

      // Save quiz progress to DB (optional, if you want to track history)
      if (ProgressModel.saveQuizProgress) {
        await ProgressModel.saveQuizProgress({
          userId,
          type,
          correct,
          total,
          score,
          timeSpent,
          xpGain,
        });
      }

      res.json({
        message: "Hoàn thành quiz!",
        xp_gained: xpGain,
        correct,
        total,
        accuracy: Math.round(accuracy * 100),
        baseXP,
        timeBonus,
        multiplier: Math.round(accuracyMultiplier * 100) / 100,
      });
    } catch (err) {
      console.error("[QUIZ] complete:", err.message);
      res.status(500).json({ message: "Lỗi cập nhật kết quả quiz" });
    }
  },

  /**
   * GET /api/quiz/stats (optional)
   * Lấy thống kê quiz của user
   */
  async getStats(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Yêu cầu đăng nhập" });
      }

      // Placeholder: trả về stats cơ bản
      // Có thể mở rộng khi add VocabReviews hoặc QuizHistory table
      res.json({
        message: "Quiz stats feature coming soon",
        user_id: userId,
      });
    } catch (err) {
      res.status(500).json({ message: "Lỗi lấy thống kê quiz" });
    }
  },
};

module.exports = QuizController;
