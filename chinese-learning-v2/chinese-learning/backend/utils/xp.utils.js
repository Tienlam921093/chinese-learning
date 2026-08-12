/**
 * XP UTILITIES — Tập trung logic tính XP
 * Tránh duplicate ở nhiều nơi (controller, model, routes)
 */

const XP_CONFIG = {
  // Lượng XP nền luôn cộng cho một bài học hoàn thành.
  BASE_XP:       50,   // XP tối thiểu khi hoàn thành
  // Hệ số dùng để đổi điểm bài học thành XP bổ sung.
  SCORE_FACTOR:  0.5,  // Nhân với score
  // Giới hạn XP thấp nhất được chấp nhận khi nhận XP từ request.
  MIN_XP:        1,
  // Giới hạn XP cao nhất được chấp nhận để tránh client gửi số quá lớn.
  MAX_XP:        500,
};

/**
 * Tính XP nhận được khi hoàn thành bài học
 * @param {number} score - Điểm bài học (0-100)
 * @returns {number} XP
 */
function calculateLessonXP(score = 100) {
  // Công thức: XP nền + điểm bài học * hệ số điểm, sau đó làm tròn.
  return Math.round(XP_CONFIG.BASE_XP + score * XP_CONFIG.SCORE_FACTOR);
}

/**
 * Validate và clamp XP amount (chống hack)
 * @param {*} amount - Giá trị XP từ request body
 * @param {number} defaultVal - Giá trị mặc định
 * @returns {number}
 */
function clampXP(amount, defaultVal = 10) {
  // Chuyển amount sang số nguyên; nếu không hợp lệ thì dùng giá trị mặc định.
  const val = parseInt(amount) || defaultVal;
  // Ép val nằm trong khoảng MIN_XP -> MAX_XP.
  return Math.max(XP_CONFIG.MIN_XP, Math.min(XP_CONFIG.MAX_XP, val));
}

// Cho phép các file khác import hàm tính XP, hàm giới hạn XP và cấu hình XP.
module.exports = { calculateLessonXP, clampXP, XP_CONFIG };
