/**
 * PROGRESS MODEL
 *
 * FIX N13: Xóa duplicate addXP — dùng UserModel.addXP thay thế
 */
const { sql, query } = require('../config/db');
const { calculateLessonXP } = require('../utils/xp.utils');
const UserModel = require('./user.model');

const ProgressModel = {

  // Lay cac chi so tong quan cua user: XP, streak, HSK level va lan login gan nhat.
  async getByUser(userId) {
    const r = await query(
      `SELECT xp, streak, hsk_level, last_login FROM Users WHERE id=@uid`,
      { uid: { type: sql.Int, value: userId } }
    );
    return r.recordset[0] || null;
  },

  // Tra ve danh sach lesson_id da hoan thanh de frontend danh dau bai hoc.
  async getCompletedLessons(userId) {
    const r = await query(
      `SELECT lesson_id FROM UserProgress WHERE user_id=@uid AND completed=1`,
      { uid: { type: sql.Int, value: userId } }
    );
    return r.recordset.map(row => row.lesson_id);
  },

  // FIX N13: Đã xóa addXP duplicate — dùng UserModel.addXP

  // Ghi nhan mot bai hoc da hoan thanh va cong XP tuong ung voi diem.
  async completeLesson(userId, lessonId, score = 100, timeSpent = 0) {
    await query(
      `INSERT INTO UserProgress (user_id, lesson_id, completed, score, time_spent, created_at, updated_at)
       VALUES (@uid, @lid, TRUE, @score, @time, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET
         completed=TRUE, score=EXCLUDED.score, time_spent=EXCLUDED.time_spent,
         updated_at=CURRENT_TIMESTAMP`,
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
