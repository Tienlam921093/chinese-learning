/**
 * PROGRESS MODEL
 *
 * FIX N13: Xóa duplicate addXP — dùng UserModel.addXP thay thế
 */
const { sql, query } = require('../config/db');
const { calculateLessonXP } = require('../utils/xp.utils');
const UserModel = require('./user.model');

const ProgressModel = {

  async getByUser(userId) {
    const r = await query(
      `SELECT xp, streak, hsk_level, last_login FROM Users WHERE id=@uid`,
      { uid: { type: sql.Int, value: userId } }
    );
    return r.recordset[0] || null;
  },

  async getCompletedLessons(userId) {
    const r = await query(
      `SELECT lesson_id FROM UserProgress WHERE user_id=@uid AND completed=1`,
      { uid: { type: sql.Int, value: userId } }
    );
    return r.recordset.map(row => row.lesson_id);
  },

  // FIX N13: Đã xóa addXP duplicate — dùng UserModel.addXP

  async completeLesson(userId, lessonId, score = 100, timeSpent = 0) {
    await query(
      `MERGE UserProgress AS target
       USING (VALUES (@uid, @lid)) AS source(user_id, lesson_id)
       ON target.user_id = source.user_id AND target.lesson_id = source.lesson_id
       WHEN MATCHED THEN UPDATE SET completed=1, score=@score, time_spent=@time, updated_at=GETDATE()
       WHEN NOT MATCHED THEN INSERT (user_id, lesson_id, completed, score, time_spent, created_at)
         VALUES (@uid, @lid, 1, @score, @time, GETDATE());`,
      {
        uid: { type: sql.Int, value: userId },
        lid: { type: sql.Int, value: lessonId },
        score: { type: sql.Int, value: score },
        time: { type: sql.Int, value: timeSpent },
      }
    );

    // FIX N13: Dùng UserModel.addXP (single source of truth)
    await UserModel.addXP(userId, calculateLessonXP(score));
  },
};

module.exports = ProgressModel;

