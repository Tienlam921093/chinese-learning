const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Public endpoints: client chua dang nhap van co the goi cac route nay.
router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/refresh", ctrl.refresh); // Rotation refresh token.
router.post("/logout", ctrl.logout);

// Protected endpoints: `authenticate` verify token va gan thong tin user vao req.user.
router.post("/logout-all", authenticate, ctrl.logoutAll); // Dang xuat tat ca thiet bi.
router.get("/me", authenticate, ctrl.me);
router.put("/me", authenticate, ctrl.updateProfile);
router.post("/change-password", authenticate, ctrl.changePassword);

// Password reset flow: tao token qua email, sau do dung token de dat lai mat khau.
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);

// Leaderboard duoc bao ve de controller co user hien tai va session hop le.
router.get("/leaderboard", authenticate, ctrl.leaderboard);

module.exports = router;
