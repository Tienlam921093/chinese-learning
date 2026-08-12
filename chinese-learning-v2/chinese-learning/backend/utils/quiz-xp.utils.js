const crypto = require("crypto");

// Giới hạn tổng XP quiz mà một user có thể nhận trong một ngày.
const QUIZ_DAILY_XP_CAP = 300;

function calculateQuizXP({ correct, total, timeSpent }) {
  // Mỗi câu đúng được 10 XP cơ bản.
  const baseXP = correct * 10;
  // Tỉ lệ đúng: số câu đúng chia tổng số câu.
  const accuracy = correct / total;
  // Hệ số nhân XP dựa trên độ chính xác.
  const accuracyMultiplier =
    accuracy >= 0.9 ? 1.5 : accuracy >= 0.7 ? 1.2 : accuracy >= 0.5 ? 1.0 : 0.8;

  // Bonus theo thời gian mặc định là 0.
  let timeBonus = 0;
  // Nếu đúng toàn bộ và hoàn thành trong 30 giây thì nhận bonus lớn nhất.
  if (correct === total && timeSpent <= 30) {
    timeBonus = 50;
  } else if (timeSpent <= 120) {
    // Nếu hoàn thành trong 120 giây, bonus giảm dần theo mỗi 10 giây.
    timeBonus = Math.max(0, 30 - Math.floor(timeSpent / 10));
  }

  return {
    // XP cuối cùng = XP cơ bản * hệ số chính xác + bonus thời gian.
    xp: Math.round(baseXP * accuracyMultiplier + timeBonus),
    // Trả về các thành phần để nơi gọi có thể hiển thị hoặc ghi log chi tiết.
    baseXP,
    timeBonus,
    accuracy,
    accuracyMultiplier,
  };
}

function buildAttemptKey(userId, attemptId) {
  // Tạo key ổn định từ userId và attemptId, không lưu trực tiếp chuỗi gốc.
  return crypto
    // SHA-256 tạo hash đủ dài và khó đoán cho attempt key.
    .createHash("sha256")
    // Dùng dấu ":" để phân tách userId và attemptId trước khi hash.
    .update(`${userId}:${attemptId}`)
    // Xuất hash dưới dạng chuỗi hexadecimal.
    .digest("hex");
}

// Export giới hạn XP hằng ngày, hàm tính XP quiz và hàm tạo attempt key.
module.exports = { QUIZ_DAILY_XP_CAP, calculateQuizXP, buildAttemptKey };
