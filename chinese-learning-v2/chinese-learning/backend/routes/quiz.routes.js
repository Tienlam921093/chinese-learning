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
router.post("/complete", authenticate, QuizController.complete);

// Get quiz stats
router.get("/stats", authenticate, QuizController.getStats);

module.exports = router;
