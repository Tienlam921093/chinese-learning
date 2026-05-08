/**
 * XP UTILITIES — Tập trung logic tính XP
 * Tránh duplicate ở nhiều nơi (controller, model, routes)
 */

const XP_CONFIG = {
  BASE_XP:       50,   // XP tối thiểu khi hoàn thành
  SCORE_FACTOR:  0.5,  // Nhân với score
  MIN_XP:        1,
  MAX_XP:        500,
};

/**
 * Tính XP nhận được khi hoàn thành bài học
 * @param {number} score - Điểm bài học (0-100)
 * @returns {number} XP
 */
function calculateLessonXP(score = 100) {
  return Math.round(XP_CONFIG.BASE_XP + score * XP_CONFIG.SCORE_FACTOR);
}

/**
 * Validate và clamp XP amount (chống hack)
 * @param {*} amount - Giá trị XP từ request body
 * @param {number} defaultVal - Giá trị mặc định
 * @returns {number}
 */
function clampXP(amount, defaultVal = 10) {
  const val = parseInt(amount) || defaultVal;
  return Math.max(XP_CONFIG.MIN_XP, Math.min(XP_CONFIG.MAX_XP, val));
}

module.exports = { calculateLessonXP, clampXP, XP_CONFIG };
