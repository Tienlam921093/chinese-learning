const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/refresh", ctrl.refresh); // Rotation
router.post("/logout", ctrl.logout);
router.post("/logout-all", authenticate, ctrl.logoutAll); // Kick tất cả thiết bị
router.get("/me", authenticate, ctrl.me);
router.post("/change-password", authenticate, ctrl.changePassword);
router.post("/forgot-password", ctrl.forgotPassword); // Gửi email reset
router.post("/reset-password", ctrl.resetPassword); // Dùng token từ email
router.get("/leaderboard", authenticate, ctrl.leaderboard);

module.exports = router;
