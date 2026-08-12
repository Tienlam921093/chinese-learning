// Import assert de viet cac ky vong trong test.
const assert = require("assert");

// Import constant va helper lien quan den XP quiz.
const {
  QUIZ_DAILY_XP_CAP,
  calculateQuizXP,
  buildAttemptKey,
} = require("../utils/quiz-xp.utils");

// Ham run gom cac test chong farm XP cho quiz.
function run() {
  // Tinh XP cho mot bai lam hoan hao: 15/15 cau dung trong 30 giay.
  const fastPerfect = calculateQuizXP({
    correct: 15,
    total: 15,
    timeSpent: 30,
  });
  // Tong XP mong doi cho case nay la 275.
  assert.strictEqual(fastPerfect.xp, 275);
  // Trong tong XP do, bonus thoi gian mong doi la 50.
  assert.strictEqual(fastPerfect.timeBonus, 50);

  // Tao attempt key cho cung user va cung attempt id.
  const attemptA = buildAttemptKey(7, "attempt_1234567890abcdef");
  // Tao lai attempt key voi input y het de kiem tra tinh on dinh.
  const attemptB = buildAttemptKey(7, "attempt_1234567890abcdef");
  // Tao attempt key cho user khac nhung cung attempt id.
  const attemptOtherUser = buildAttemptKey(8, "attempt_1234567890abcdef");

  // Cung user + cung attempt id phai tao ra cung mot key.
  assert.strictEqual(attemptA, attemptB);
  // Khac user phai tao key khac de khong dung chung attempt giua cac user.
  assert.notStrictEqual(attemptA, attemptOtherUser);
  // Key dai 64 ky tu, phu hop voi SHA-256 hex.
  assert.strictEqual(attemptA.length, 64);
  // Gioi han XP quiz moi ngay phai la 300.
  assert.strictEqual(QUIZ_DAILY_XP_CAP, 300);

  // Neu tat ca assert qua, in thong bao pass.
  console.log("Quiz anti-farm helper tests passed.");
}

// Chay test.
run();
