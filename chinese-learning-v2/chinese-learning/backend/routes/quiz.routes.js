/**
 * QUIZ ROUTES
 *
 * POST /api/quiz/complete - Submit quiz results
 * GET /api/quiz/stats - User quiz stats (optional)
 */
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const QuizController = require("../controllers/quiz.controller");

// Submit quiz completion
// Luu ket qua quiz va tinh XP cho user hien tai.
router.post("/complete", authenticate, QuizController.complete);

// Get quiz stats
// Doc thong ke quiz theo user da dang nhap.
router.get("/stats", authenticate, QuizController.getStats);

module.exports = router;
