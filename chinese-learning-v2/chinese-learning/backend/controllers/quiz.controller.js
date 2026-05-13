/**
 * QUIZ CONTROLLER
 *
 * Server-side XP award is intentionally conservative:
 * - client result values are validated for consistency and plausible duration
 * - repeated attempt IDs are idempotent and award 0 XP
 * - daily quiz XP is capped to limit scripted farming
 */
const { sql, getPool } = require("../config/db");
const {
  QUIZ_DAILY_XP_CAP,
  calculateQuizXP,
  buildAttemptKey,
} = require("../utils/quiz-xp.utils");

const ALLOWED_QUIZ_TYPES = new Set(["meaning", "hanzi", "pinyin", "mixed"]);

const QuizController = {
  /**
   * POST /api/quiz/complete
   * Body: { attempt_id, correct, total, score, time_spent, type }
   */
  async complete(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Yeu cau dang nhap" });
      }

      const total = Math.max(1, Math.min(50, parseInt(req.body.total) || 15));
      const correct = Math.max(
        0,
        Math.min(total, parseInt(req.body.correct) || 0),
      );
      const score = Math.max(0, Math.min(100, parseInt(req.body.score) || 0));
      const timeSpent = Math.max(
        0,
        Math.min(7200, parseInt(req.body.time_spent) || 0),
      );
      const type = ALLOWED_QUIZ_TYPES.has(req.body.type)
        ? req.body.type
        : "mixed";
      const attemptId = String(req.body.attempt_id || "").trim();
      const expectedScore = Math.round((correct / total) * 100);
      const minimumTime = Math.max(10, total * 2);

      if (!/^[a-zA-Z0-9_-]{16,80}$/.test(attemptId)) {
        return res.status(400).json({ message: "Quiz attempt khong hop le" });
      }
      if (Math.abs(score - expectedScore) > 1) {
        return res.status(400).json({ message: "Diem quiz khong khop ket qua" });
      }
      if (timeSpent < minimumTime) {
        return res.status(400).json({
          message: "Thoi gian lam quiz khong hop le",
          minimum_time: minimumTime,
        });
      }

      const { xp, baseXP, timeBonus, accuracy, accuracyMultiplier } =
        calculateQuizXP({ correct, total, timeSpent });
      const attemptKey = buildAttemptKey(userId, attemptId);
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      let xpGain = 0;
      let duplicate = false;
      let dailyRemaining = 0;

      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const existingReq = new sql.Request(transaction);
        existingReq.input("attemptKey", sql.VarChar(128), attemptKey);
        const existing = await existingReq.query(
          `SELECT id FROM QuizResults WITH (UPDLOCK, HOLDLOCK)
           WHERE attempt_key=@attemptKey`,
        );
        duplicate = existing.recordset.length > 0;

        const capReq = new sql.Request(transaction);
        capReq.input("uid", sql.Int, userId);
        const cap = await capReq.query(
          `SELECT ISNULL(SUM(xp_awarded), 0) AS used
           FROM QuizResults WITH (UPDLOCK, HOLDLOCK)
           WHERE user_id=@uid AND created_at >= CONVERT(date, GETDATE())`,
        );
        const usedToday = Number(cap.recordset[0]?.used || 0);
        dailyRemaining = Math.max(0, QUIZ_DAILY_XP_CAP - usedToday);
        xpGain = duplicate ? 0 : Math.min(xp, dailyRemaining);

        if (!duplicate) {
          const saveReq = new sql.Request(transaction);
          saveReq.input("uid", sql.Int, userId);
          saveReq.input("total", sql.Int, total);
          saveReq.input("correct", sql.Int, correct);
          saveReq.input("time", sql.Int, timeSpent);
          saveReq.input("type", sql.NVarChar(20), type);
          saveReq.input("xp", sql.Int, xpGain);
          saveReq.input("attemptKey", sql.VarChar(128), attemptKey);
          await saveReq.query(
            `INSERT INTO QuizResults
               (user_id, total_questions, correct_answers, time_taken, quiz_type, xp_awarded, attempt_key, created_at)
             VALUES
               (@uid, @total, @correct, @time, @type, @xp, @attemptKey, GETDATE())`,
          );

          if (xpGain > 0) {
            const xpReq = new sql.Request(transaction);
            xpReq.input("uid", sql.Int, userId);
            xpReq.input("xp", sql.Int, xpGain);
            await xpReq.query(`UPDATE Users SET xp=xp+@xp WHERE id=@uid`);
          }
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      res.json({
        message: "Hoan thanh quiz!",
        xp_gained: xpGain,
        duplicate,
        daily_xp_cap: QUIZ_DAILY_XP_CAP,
        daily_xp_remaining: Math.max(0, dailyRemaining - xpGain),
        correct,
        total,
        accuracy: Math.round(accuracy * 100),
        baseXP,
        timeBonus,
        multiplier: Math.round(accuracyMultiplier * 100) / 100,
      });
    } catch (err) {
      console.error("[QUIZ] complete:", err.message);
      res.status(500).json({ message: "Loi cap nhat ket qua quiz" });
    }
  },

  async getStats(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Yeu cau dang nhap" });
      }

      res.json({
        message: "Quiz stats feature coming soon",
        user_id: userId,
      });
    } catch (_err) {
      res.status(500).json({ message: "Loi lay thong ke quiz" });
    }
  },
};

module.exports = QuizController;
