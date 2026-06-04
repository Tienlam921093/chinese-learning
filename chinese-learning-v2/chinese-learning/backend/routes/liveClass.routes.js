"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/liveClass.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.get("/", authenticate, ctrl.list);
router.post("/", authenticate, ctrl.create);
router.post("/:id/enroll", authenticate, ctrl.enroll);
router.delete("/:id/enroll", authenticate, ctrl.cancelEnrollment);
router.delete("/:id", authenticate, ctrl.cancelClass);

module.exports = router;
