const router = require("express").Router();
const ctrl = require("../controllers/admin-data.controller");
const { authenticate, requireRole } = require("../middleware/auth.middleware");

router.use(authenticate, requireRole("admin"));

router.get("/dashboard", ctrl.dashboard);
router.get("/users", ctrl.listUsers);
router.patch("/users/:id/role", ctrl.updateUserRole);
router.patch("/users/:id/status", ctrl.updateUserStatus);
router.get("/classes", ctrl.listClasses);
router.get("/payments", ctrl.listPayments);
router.get("/reports", ctrl.reports);

router.get("/lessons", ctrl.listLessons);
router.post("/lessons", ctrl.createLesson);
router.put("/lessons/:id", ctrl.updateLesson);

router.get("/vocabulary", ctrl.listVocabulary);
router.post("/vocabulary", ctrl.createVocabulary);
router.put("/vocabulary/:id", ctrl.updateVocabulary);
router.post("/vocabulary/import", ctrl.importVocabulary);

module.exports = router;
