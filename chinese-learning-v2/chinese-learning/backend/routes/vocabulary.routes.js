/**
 * VOCABULARY ROUTES — DB-first với fallback, SM-2 Spaced Repetition
 *
 * FIX L2: Tách thành routes (thin) + model + sm2.utils
 * Trước: 294 dòng tất cả trong 1 file
 * Sau:   Routes (~100 dòng) + Model (~160 dòng) + SM2 utils (~60 dòng)
 */
const express = require('express');
const router  = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const VocabularyModel = require('../models/vocabulary.model');
const { calculateSM2 } = require('../utils/sm2.utils');

// ═══════════════════════════════════════════════════════
//  GET /api/vocabulary — Danh sách từ vựng (DB → fallback)
// ═══════════════════════════════════════════════════════
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { hsk_level, lesson_id, category, search } = req.query;
    const limit  = Math.min(Number(req.query.limit  || 999), 500);
    const offset = Math.max(Number(req.query.offset  || 0), 0);

    // Thử query DB trước
    const vocab = await VocabularyModel.getAll({ hsk_level, lesson_id, category, search, limit, offset });
    if (vocab) return res.json({ vocabulary: vocab.rows, total: vocab.total, source: 'db' });

    // Fallback: in-memory data
    const filtered = VocabularyModel.filterLocal({ hsk_level, lesson_id, category, search });
    res.json({
      vocabulary: filtered.slice(offset, offset + limit),
      total:      filtered.length,
      source:     'fallback',
    });
  } catch (err) {
    console.error('[VOCAB] getAll:', err.message);
    res.status(500).json({ message: 'Lỗi lấy từ vựng' });
  }
});

// ═══════════════════════════════════════════════════════
//  GET /api/vocabulary/flashcard — Lấy flashcard (DB → fallback)
// ═══════════════════════════════════════════════════════
router.get('/flashcard', optionalAuth, async (req, res) => {
  try {
    const count = Math.min(Number(req.query.count || 20), 100);
    const { hsk_level, lesson_id } = req.query;

    // Nếu đăng nhập → lấy từ cần ôn tập (SM-2 next_review)
    if (req.user) {
      const dueCards = await VocabularyModel.getDueFlashcards(req.user.id, hsk_level, lesson_id, count);
      if (dueCards && dueCards.length > 0) {
        return res.json({ flashcards: dueCards, total: dueCards.length, source: 'sm2' });
      }
    }

    // Fallback: lấy từ DB hoặc local data
    const vocab = await VocabularyModel.getAll({ hsk_level, lesson_id, limit: count, offset: 0 });
    if (vocab) return res.json({ flashcards: vocab.rows, total: vocab.total, source: 'db' });

    let pool = VocabularyModel.filterLocal({ hsk_level, lesson_id });
    if (!lesson_id && !hsk_level) pool = VocabularyModel.VOCABULARY.filter(v => v.hsk_level === 1);
    res.json({ flashcards: pool.slice(0, count), total: pool.length, source: 'fallback' });
  } catch (err) {
    console.error('[VOCAB] flashcard:', err.message);
    res.status(500).json({ message: 'Lỗi lấy flashcard' });
  }
});

// ═══════════════════════════════════════════════════════
//  POST /api/vocabulary/:id/review — SM-2 Spaced Repetition
//  quality: 0-5 (0=hoàn toàn quên, 5=nhớ tuyệt đối)
// ═══════════════════════════════════════════════════════
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const vocabId = parseInt(req.params.id);
    const quality = Math.max(0, Math.min(5, parseInt(req.body.quality) || 0));

    // Lấy record hiện tại (nếu có)
    const existing = await VocabularyModel.getReviewRecord(req.user.id, vocabId);

    // Tính SM-2
    const sm2 = calculateSM2({
      quality,
      repetitions:  existing?.repetitions  || 0,
      easeFactor:   existing?.ease_factor  || 2.5,
      intervalDays: existing?.interval_days || 1,
    });

    // Upsert vào VocabReviews
    await VocabularyModel.saveReview({
      userId:       req.user.id,
      vocabId,
      quality,
      easeFactor:   sm2.easeFactor,
      intervalDays: sm2.intervalDays,
      repetitions:  sm2.repetitions,
      nextReview:   sm2.nextReview,
    });

    res.json({
      message:          'Đã ghi nhận ôn tập',
      quality,
      ease_factor:      Math.round(sm2.easeFactor * 100) / 100,
      interval_days:    sm2.intervalDays,
      repetitions:      sm2.repetitions,
      next_review:      sm2.nextReview.toISOString(),
      next_review_days: sm2.intervalDays,
    });
  } catch (err) {
    console.error('[VOCAB] review:', err.message);
    // Fallback nếu DB không có bảng VocabReviews
    const quality  = Math.max(0, Math.min(5, parseInt(req.body.quality) || 0));
    const interval = quality >= 3 ? Math.round(1 + (quality - 3) * 2) : 1;
    res.json({ message: 'Đã ghi nhận ôn tập (fallback)', next_review_days: interval, quality });
  }
});

module.exports = router;
