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
  // newEF là ease factor mới, ban đầu lấy theo ease factor hiện tại.
  let newEF   = easeFactor;
  // newReps là số lần ôn đúng mới, ban đầu lấy theo số lần hiện tại.
  let newReps = repetitions;
  // newInterval sẽ được tính dựa trên kết quả trả lời đúng/sai.
  let newInterval;

  // quality từ 3 trở lên được xem là trả lời đạt.
  if (quality >= 3) {
    // Trả lời đúng
    if (repetitions === 0) {
      newInterval = 1;        // Lần đầu: ôn lại sau 1 ngày
    } else if (repetitions === 1) {
      newInterval = 6;        // Lần 2: ôn lại sau 6 ngày
    } else {
      // Từ lần thứ 3 trở đi, interval tăng theo ease factor hiện tại.
      newInterval = Math.round(intervalDays * easeFactor);
    }
    // Trả lời đạt thì tăng số lần ôn đúng liên tiếp.
    newReps = repetitions + 1;
  } else {
    // Trả lời sai → reset về đầu
    newReps     = 0;
    newInterval = 1;
  }

  // Cập nhật ease factor
  // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  // quality càng thấp thì ease factor càng bị giảm nhiều.
  newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // EF tối thiểu 1.3
  if (newEF < 1.3) newEF = 1.3;

  // Giới hạn interval tối đa 365 ngày
  if (newInterval > 365) newInterval = 365;

  // Tạo ngày ôn tiếp theo từ ngày hiện tại.
  const nextReview = new Date();
  // Cộng thêm số ngày interval mới vào ngày hiện tại.
  nextReview.setDate(nextReview.getDate() + newInterval);

  // Trả về toàn bộ trạng thái mới sau một lần ôn.
  return {
    easeFactor:   newEF,
    intervalDays: newInterval,
    repetitions:  newReps,
    nextReview,
  };
}

// Export hàm tính SM-2 để route/controller khác sử dụng.
module.exports = { calculateSM2 };
