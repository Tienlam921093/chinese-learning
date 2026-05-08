/**
 * VOCABULARY MODEL — DB queries + fallback data
 *
 * FIX L2: Tách từ vocabulary.routes.js (294 dòng) thành model riêng
 */
const { sql, query } = require('../config/db');
const { VOCABULARY } = require('../data/learningData');

const VocabularyModel = {

  /** Query từ vựng từ DB, trả null nếu DB fail */
  async getAll({ hsk_level, lesson_id, category, search, limit = 50, offset = 0 }) {
    try {
      const conditions = ['1=1'];
      const params = {
        limit:  { type: sql.Int, value: limit  },
        offset: { type: sql.Int, value: offset },
      };

      if (hsk_level) {
        conditions.push('v.hsk_level = @hsk');
        params.hsk = { type: sql.Int, value: parseInt(hsk_level) };
      }
      if (lesson_id) {
        conditions.push('v.lesson_id = @lid');
        params.lid = { type: sql.Int, value: parseInt(lesson_id) };
      }
      if (category) {
        conditions.push('v.category = @cat');
        params.cat = { type: sql.NVarChar(50), value: category };
      }
      if (search) {
        conditions.push('(v.hanzi LIKE @search OR v.pinyin LIKE @search OR v.meaning LIKE @search)');
        params.search = { type: sql.NVarChar(100), value: `%${search}%` };
      }

      const where = conditions.join(' AND ');
      const r = await query(
        `SELECT v.id, v.hsk_level, v.lesson_id, v.hanzi, v.pinyin, v.meaning,
                v.example, v.example_pinyin, v.example_meaning, v.tone, v.category
         FROM Vocabulary v
         WHERE ${where}
         ORDER BY v.hsk_level, v.lesson_id, v.id
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        params
      );

      // Đếm tổng
      const countR = await query(
        `SELECT COUNT(*) AS total FROM Vocabulary v WHERE ${where}`,
        params
      );

      return { rows: r.recordset, total: countR.recordset[0]?.total || 0 };
    } catch {
      return null; // DB fail → fallback
    }
  },

  /** Lấy review record hiện tại của user+vocab */
  async getReviewRecord(userId, vocabId) {
    const r = await query(
      `SELECT ease_factor, interval_days, repetitions, next_review
       FROM VocabReviews WHERE user_id=@uid AND vocab_id=@vid`,
      {
        uid: { type: sql.Int, value: userId  },
        vid: { type: sql.Int, value: vocabId },
      }
    );
    return r.recordset[0] || null;
  },

  /** Upsert review record */
  async saveReview({ userId, vocabId, quality, easeFactor, intervalDays, repetitions, nextReview }) {
    await query(
      `MERGE VocabReviews AS t
       USING (VALUES (@uid, @vid)) AS s(user_id, vocab_id)
       ON t.user_id = s.user_id AND t.vocab_id = s.vocab_id
       WHEN MATCHED THEN UPDATE SET
         quality       = @q,
         ease_factor   = @ef,
         interval_days = @intv,
         repetitions   = @rep,
         next_review   = @next,
         reviewed_at   = GETDATE()
       WHEN NOT MATCHED THEN INSERT
         (user_id, vocab_id, quality, ease_factor, interval_days, repetitions, next_review, reviewed_at)
         VALUES (@uid, @vid, @q, @ef, @intv, @rep, @next, GETDATE());`,
      {
        uid:  { type: sql.Int,      value: userId       },
        vid:  { type: sql.Int,      value: vocabId      },
        q:    { type: sql.TinyInt,  value: quality      },
        ef:   { type: sql.Float,    value: easeFactor   },
        intv: { type: sql.Int,      value: intervalDays },
        rep:  { type: sql.Int,      value: repetitions  },
        next: { type: sql.DateTime, value: nextReview   },
      }
    );
  },

  /** Lấy flashcards cần ôn tập (SM-2: next_review <= now) */
  async getDueFlashcards(userId, hskLevel, lessonId, count) {
    try {
      const conditions = ['vr.user_id = @uid', 'vr.next_review <= GETDATE()'];
      const params = {
        uid:   { type: sql.Int, value: userId },
        count: { type: sql.Int, value: count  },
      };

      if (hskLevel) {
        conditions.push('v.hsk_level = @hsk');
        params.hsk = { type: sql.Int, value: parseInt(hskLevel) };
      }
      if (lessonId) {
        conditions.push('v.lesson_id = @lid');
        params.lid = { type: sql.Int, value: parseInt(lessonId) };
      }

      const r = await query(
        `SELECT v.id, v.hsk_level, v.lesson_id, v.hanzi, v.pinyin, v.meaning,
                v.example, v.example_meaning, v.tone, v.category,
                vr.ease_factor, vr.interval_days, vr.repetitions, vr.next_review
         FROM VocabReviews vr
         JOIN Vocabulary v ON v.id = vr.vocab_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY vr.next_review ASC
         OFFSET 0 ROWS FETCH NEXT @count ROWS ONLY`,
        params
      );
      return r.recordset;
    } catch {
      return null;
    }
  },

  /** Filter từ in-memory fallback data */
  filterLocal({ hsk_level, lesson_id, category, search }) {
    let vocab = [...VOCABULARY];
    if (hsk_level) vocab = vocab.filter(v => v.hsk_level === Number(hsk_level));
    if (lesson_id) vocab = vocab.filter(v => v.lesson_id === Number(lesson_id));
    if (category)  vocab = vocab.filter(v => v.category === category);
    if (search) {
      const s = String(search).toLowerCase();
      vocab = vocab.filter(v =>
        v.hanzi.includes(search) ||
        v.pinyin.toLowerCase().includes(s) ||
        v.meaning.toLowerCase().includes(s)
      );
    }
    return vocab;
  },

  /** Lấy fallback data */
  get VOCABULARY() { return VOCABULARY; },
};

module.exports = VocabularyModel;
