/**
 * SM-2 SPACED REPETITION ALGORITHM
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *
 * FIX L2: Tách từ vocabulary.routes.js thành module riêng
 */

/**
 * Tính toán SM-2 cho một lần ôn tập
 * @param {Object} params
 * @param {number} params.quality - Chất lượng trả lời (0-5)
 * @param {number} params.repetitions - Số lần ôn tập trước đó
 * @param {number} params.easeFactor - Hệ số dễ hiện tại
 * @param {number} params.intervalDays - Khoảng cách ngày hiện tại
 * @returns {{ easeFactor, intervalDays, repetitions, nextReview }}
 */
function calculateSM2({ quality, repetitions, easeFactor, intervalDays }) {
  let newEF   = easeFactor;
  let newReps = repetitions;
  let newInterval;

  if (quality >= 3) {
    // Trả lời đúng
    if (repetitions === 0) {
      newInterval = 1;        // Lần đầu: ôn lại sau 1 ngày
    } else if (repetitions === 1) {
      newInterval = 6;        // Lần 2: ôn lại sau 6 ngày
    } else {
      newInterval = Math.round(intervalDays * easeFactor);
    }
    newReps = repetitions + 1;
  } else {
    // Trả lời sai → reset về đầu
    newReps     = 0;
    newInterval = 1;
  }

  // Cập nhật ease factor
  // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // EF tối thiểu 1.3
  if (newEF < 1.3) newEF = 1.3;

  // Giới hạn interval tối đa 365 ngày
  if (newInterval > 365) newInterval = 365;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    easeFactor:   newEF,
    intervalDays: newInterval,
    repetitions:  newReps,
    nextReview,
  };
}

module.exports = { calculateSM2 };
