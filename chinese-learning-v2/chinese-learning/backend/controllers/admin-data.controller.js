const AdminDataModel = require("../models/admin-data.model");
const {
  normalizePaging,
  parseHskLevel,
  validateLessonPayload,
  validateVocabularyImport,
  validateVocabularyPayload,
} = require("../utils/admin-data.utils");

const AdminDataController = {
  async dashboard(_req, res) {
    try {
      res.json({ stats: await AdminDataModel.dashboard() });
    } catch (err) {
      console.error("[ADMIN] dashboard:", err.message);
      res.status(500).json({ message: "Loi lay thong ke admin" });
    }
  },

  async listUsers(req, res) {
    try {
      const paging = normalizePaging(req.query);
      const role = ["student", "teacher", "admin"].includes(req.query.role)
        ? req.query.role
        : null;
      const search = req.query.search ? String(req.query.search).trim() : null;
      const result = await AdminDataModel.listUsers({ ...paging, role, search });
      res.json({ users: result.rows, total: result.total, ...paging });
    } catch (err) {
      console.error("[ADMIN] listUsers:", err.message);
      res.status(500).json({ message: "Loi lay danh sach nguoi dung" });
    }
  },

  async updateUserRole(req, res) {
    try {
      const userId = Number.parseInt(req.params.id, 10);
      const role = String(req.body.role || "").trim();
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "User id khong hop le" });
      }
      if (!["student", "teacher", "admin"].includes(role)) {
        return res.status(400).json({ message: "Role khong hop le" });
      }
      if (Number(req.user?.id) === userId) {
        return res.status(400).json({ message: "Khong the doi role cua tai khoan dang dang nhap" });
      }
      const user = await AdminDataModel.updateUserRole({ userId, role });
      if (!user) return res.status(404).json({ message: "Nguoi dung khong ton tai" });
      res.json({ user });
    } catch (err) {
      console.error("[ADMIN] updateUserRole:", err.message);
      res.status(500).json({ message: "Loi cap nhat role" });
    }
  },

  async updateUserStatus(req, res) {
    try {
      const userId = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "User id khong hop le" });
      }
      if (Number(req.user?.id) === userId && req.body.is_active === false) {
        return res.status(400).json({ message: "Khong the khoa tai khoan dang dang nhap" });
      }
      const user = await AdminDataModel.updateUserStatus({
        userId,
        isActive: Boolean(req.body.is_active),
      });
      if (!user) return res.status(404).json({ message: "Nguoi dung khong ton tai" });
      res.json({ user });
    } catch (err) {
      console.error("[ADMIN] updateUserStatus:", err.message);
      res.status(500).json({ message: "Loi cap nhat trang thai user" });
    }
  },

  async listClasses(req, res) {
    try {
      const paging = normalizePaging(req.query);
      const result = await AdminDataModel.listClasses(paging);
      res.json({ classes: result.rows, total: result.total, ...paging });
    } catch (err) {
      console.error("[ADMIN] listClasses:", err.message);
      res.status(500).json({ message: "Loi lay danh sach lop" });
    }
  },

  async listPayments(req, res) {
    try {
      const paging = normalizePaging(req.query);
      const result = await AdminDataModel.listPayments(paging);
      res.json({ payments: result.rows, total: result.total, ...paging });
    } catch (err) {
      console.error("[ADMIN] listPayments:", err.message);
      res.status(500).json({ message: "Loi lay danh sach thanh toan" });
    }
  },

  async reports(_req, res) {
    try {
      res.json({ reports: await AdminDataModel.reports() });
    } catch (err) {
      console.error("[ADMIN] reports:", err.message);
      res.status(500).json({ message: "Loi lay bao cao" });
    }
  },

  async listLessons(req, res) {
    try {
      const paging = normalizePaging(req.query);
      const hsk_level = parseHskLevel(req.query.hsk_level);
      const result = await AdminDataModel.listLessons({ ...paging, hsk_level });
      res.json({ lessons: result.rows, total: result.total, ...paging });
    } catch (err) {
      console.error("[ADMIN] listLessons:", err.message);
      res.status(500).json({ message: "Loi lay danh sach bai hoc admin" });
    }
  },

  async createLesson(req, res) {
    await saveLesson(req, res, null);
  },

  async updateLesson(req, res) {
    await saveLesson(req, res, Number.parseInt(req.params.id, 10));
  },

  async listVocabulary(req, res) {
    try {
      const paging = normalizePaging(req.query);
      const result = await AdminDataModel.listVocabulary({
        ...paging,
        hsk_level: parseHskLevel(req.query.hsk_level),
        lesson_id: Number.parseInt(req.query.lesson_id, 10) || null,
        category: req.query.category ? String(req.query.category).trim() : null,
        search: req.query.search ? String(req.query.search).trim() : null,
      });
      res.json({ vocabulary: result.rows, total: result.total, ...paging });
    } catch (err) {
      console.error("[ADMIN] listVocabulary:", err.message);
      res.status(500).json({ message: "Loi lay danh sach tu vung admin" });
    }
  },

  async createVocabulary(req, res) {
    await saveVocabulary(req, res, null);
  },

  async updateVocabulary(req, res) {
    await saveVocabulary(req, res, Number.parseInt(req.params.id, 10));
  },

  async importVocabulary(req, res) {
    try {
      const result = validateVocabularyImport(req.body);
      if (!result.valid) {
        return res.status(400).json({ message: "Du lieu import khong hop le", errors: result.errors });
      }

      if (result.value.dry_run) {
        return res.json({
          message: "Import dry run hop le",
          dry_run: true,
          row_count: result.value.rows.length,
        });
      }

      const rows = await AdminDataModel.importVocabulary({
        source: result.value.source,
        rows: result.value.rows,
        actorId: req.user?.id,
      });
      res.status(201).json({ message: "Da import tu vung", row_count: rows.length, vocabulary: rows });
    } catch (err) {
      console.error("[ADMIN] importVocabulary:", err.message);
      res.status(500).json({ message: "Loi import tu vung" });
    }
  },
};

async function saveLesson(req, res, id) {
  if (id !== null && (!Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ message: "Lesson id khong hop le" });
  }

  const result = validateLessonPayload(req.body);
  if (!result.valid) {
    return res.status(400).json({ message: "Du lieu bai hoc khong hop le", errors: result.errors });
  }

  try {
    const lesson = await AdminDataModel.upsertLesson(id, result.value);
    if (!lesson) return res.status(404).json({ message: "Bai hoc khong ton tai" });
    res.status(id ? 200 : 201).json({ lesson });
  } catch (err) {
    console.error("[ADMIN] saveLesson:", err.message);
    res.status(500).json({ message: "Loi luu bai hoc" });
  }
}

async function saveVocabulary(req, res, id) {
  if (id !== null && (!Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ message: "Vocabulary id khong hop le" });
  }

  const result = validateVocabularyPayload(req.body);
  if (!result.valid) {
    return res.status(400).json({ message: "Du lieu tu vung khong hop le", errors: result.errors });
  }

  try {
    const vocabulary = await AdminDataModel.upsertVocabulary(id, result.value);
    if (!vocabulary) return res.status(404).json({ message: "Tu vung khong ton tai" });
    res.status(id ? 200 : 201).json({ vocabulary });
  } catch (err) {
    console.error("[ADMIN] saveVocabulary:", err.message);
    res.status(500).json({ message: "Loi luu tu vung" });
  }
}

module.exports = AdminDataController;
