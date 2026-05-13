const crypto = require("crypto");

const QUIZ_DAILY_XP_CAP = 300;

function calculateQuizXP({ correct, total, timeSpent }) {
  const baseXP = correct * 10;
  const accuracy = correct / total;
  const accuracyMultiplier =
    accuracy >= 0.9 ? 1.5 : accuracy >= 0.7 ? 1.2 : accuracy >= 0.5 ? 1.0 : 0.8;

  let timeBonus = 0;
  if (correct === total && timeSpent <= 30) {
    timeBonus = 50;
  } else if (timeSpent <= 120) {
    timeBonus = Math.max(0, 30 - Math.floor(timeSpent / 10));
  }

  return {
    xp: Math.round(baseXP * accuracyMultiplier + timeBonus),
    baseXP,
    timeBonus,
    accuracy,
    accuracyMultiplier,
  };
}

function buildAttemptKey(userId, attemptId) {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${attemptId}`)
    .digest("hex");
}

module.exports = { QUIZ_DAILY_XP_CAP, calculateQuizXP, buildAttemptKey };
