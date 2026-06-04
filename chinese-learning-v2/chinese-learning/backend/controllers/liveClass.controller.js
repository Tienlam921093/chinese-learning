"use strict";

const LiveClassModel = require("../models/liveClass.model");
const { validateLiveClassInput } = require("../utils/live-class.utils");

function canTeach(user) {
  return user?.role === "teacher" || user?.role === "admin";
}

const LiveClassController = {
  async list(req, res) {
    try {
      const includePast = req.query.include_past === "1";
      const mineOnly = req.query.mine === "1" && canTeach(req.user);
      const classes = await LiveClassModel.list({
        userId: req.user.id,
        includePast,
        teacherId: mineOnly ? req.user.id : null,
      });
      res.json({ classes });
    } catch (err) {
      console.error("[LIVE_CLASS] list:", err.message);
      res.status(500).json({ message: "Loi lay danh sach lop hoc truc tuyen" });
    }
  },

  async create(req, res) {
    try {
      if (!canTeach(req.user)) {
        return res
          .status(403)
          .json({ message: "Chi giao vien hoac admin moi duoc tao lop" });
      }

      const { value, error } = validateLiveClassInput(req.body);
      if (error) return res.status(400).json({ message: error });

      const liveClass = await LiveClassModel.create({
        teacherId: req.user.id,
        ...value,
      });
      res.status(201).json({ class: liveClass });
    } catch (err) {
      console.error("[LIVE_CLASS] create:", err.message);
      res.status(500).json({ message: "Loi tao lop hoc truc tuyen" });
    }
  },

  async enroll(req, res) {
    try {
      const classId = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(classId) || classId <= 0) {
        return res.status(400).json({ message: "ID lop hoc khong hop le" });
      }
      await LiveClassModel.enroll({ classId, userId: req.user.id });
      res.json({ message: "Da dang ky lop hoc" });
    } catch (err) {
      if (err.code === "CLASS_NOT_FOUND") {
        return res.status(404).json({ message: err.message });
      }
      if (err.code === "CLASS_FULL" || err.code === "CLASS_CLOSED") {
        return res.status(409).json({ message: err.message });
      }
      console.error("[LIVE_CLASS] enroll:", err.message);
      res.status(500).json({ message: "Loi dang ky lop hoc" });
    }
  },

  async cancelEnrollment(req, res) {
    try {
      if (canTeach(req.user)) {
        return res
          .status(403)
          .json({ message: "Giao vien/admin dung chuc nang huy lop" });
      }
      const classId = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(classId) || classId <= 0) {
        return res.status(400).json({ message: "ID lop hoc khong hop le" });
      }
      await LiveClassModel.cancelEnrollment({ classId, userId: req.user.id });
      res.json({ message: "Da huy dang ky lop hoc" });
    } catch (err) {
      console.error("[LIVE_CLASS] cancel:", err.message);
      res.status(500).json({ message: "Loi huy dang ky lop hoc" });
    }
  },

  async cancelClass(req, res) {
    try {
      if (!canTeach(req.user)) {
        return res
          .status(403)
          .json({ message: "Chi giao vien hoac admin moi duoc huy lop" });
      }
      const classId = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(classId) || classId <= 0) {
        return res.status(400).json({ message: "ID lop hoc khong hop le" });
      }

      const rows = await LiveClassModel.cancelClass({
        classId,
        actorId: req.user.id,
        actorRole: req.user.role,
      });
      if (!rows) {
        return res
          .status(404)
          .json({ message: "Khong tim thay lop co the huy" });
      }
      res.json({ message: "Da huy lop hoc" });
    } catch (err) {
      console.error("[LIVE_CLASS] cancel class:", err.message);
      res.status(500).json({ message: "Loi huy lop hoc" });
    }
  },
};

module.exports = LiveClassController;
