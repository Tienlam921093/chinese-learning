const assert = require("assert");

const {
  QUIZ_DAILY_XP_CAP,
  calculateQuizXP,
  buildAttemptKey,
} = require("../utils/quiz-xp.utils");

function run() {
  const fastPerfect = calculateQuizXP({
    correct: 15,
    total: 15,
    timeSpent: 30,
  });
  assert.strictEqual(fastPerfect.xp, 275);
  assert.strictEqual(fastPerfect.timeBonus, 50);

  const attemptA = buildAttemptKey(7, "attempt_1234567890abcdef");
  const attemptB = buildAttemptKey(7, "attempt_1234567890abcdef");
  const attemptOtherUser = buildAttemptKey(8, "attempt_1234567890abcdef");

  assert.strictEqual(attemptA, attemptB);
  assert.notStrictEqual(attemptA, attemptOtherUser);
  assert.strictEqual(attemptA.length, 64);
  assert.strictEqual(QUIZ_DAILY_XP_CAP, 300);

  console.log("Quiz anti-farm helper tests passed.");
}

run();
