const { sql, query } = require("../config/db");

const AdminDataModel = {
  async dashboard() {
    const r = await query(
      `SELECT
         (SELECT COUNT(*) FROM Lessons) AS lessons,
         (SELECT COUNT(*) FROM Lessons WHERE is_published = 1) AS published_lessons,
         (SELECT COUNT(*) FROM Vocabulary) AS vocabulary,
         (SELECT COUNT(*) FROM Users WHERE is_active = 1) AS active_users,
         (SELECT COUNT(*) FROM Users WHERE role = 'teacher' AND is_active = 1) AS teachers,
         (SELECT COUNT(*) FROM Users WHERE role = 'student' AND is_active = 1) AS students,
         (SELECT COUNT(*) FROM QuizResults) AS quiz_results,
         (SELECT COUNT(*) FROM LiveClasses WHERE status = 'scheduled') AS scheduled_classes,
         (SELECT COUNT(*) FROM Orders WHERE status = 'paid') AS paid_orders,
         (SELECT COALESCE(SUM(amount), 0) FROM Orders WHERE status = 'paid') AS revenue`,
      {},
    );
    return r.recordset[0];
  },

  async listUsers({ role, search, limit, offset }) {
    const conditions = ["1=1"];
    const params = {
      limit: { type: sql.Int, value: limit },
      offset: { type: sql.Int, value: offset },
    };
    if (role) {
      conditions.push("role = @role");
      params.role = { type: sql.NVarChar(20), value: role };
    }
    if (search) {
      conditions.push("(name LIKE @search OR email LIKE @search)");
      params.search = { type: sql.NVarChar(220), value: `%${search}%` };
    }
    const where = conditions.join(" AND ");
    const rows = await query(
      `SELECT id, name, email, role, hsk_level, xp, streak, is_active,
              ISNULL([plan], 'free') AS [plan], plan_expiry, created_at, last_login
       FROM Users
       WHERE ${where}
       ORDER BY created_at DESC, id DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params,
    );
    const count = await query(`SELECT COUNT(*) AS total FROM Users WHERE ${where}`, params);
    return { rows: rows.recordset, total: count.recordset[0]?.total || 0 };
  },

  async updateUserRole({ userId, role }) {
    const result = await query(
      `UPDATE Users
       SET role = @role, updated_at = GETDATE()
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.is_active
       WHERE id = @id`,
      {
        id: { type: sql.Int, value: userId },
        role: { type: sql.NVarChar(20), value: role },
      },
    );
    return result.recordset[0] || null;
  },

  async updateUserStatus({ userId, isActive }) {
    const result = await query(
      `UPDATE Users
       SET is_active = @active, updated_at = GETDATE()
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.is_active
       WHERE id = @id`,
      {
        id: { type: sql.Int, value: userId },
        active: { type: sql.Bit, value: isActive },
      },
    );
    return result.recordset[0] || null;
  },

  async listClasses({ limit, offset }) {
    const rows = await query(
      `SELECT c.id, c.title, c.hsk_level, c.starts_at, c.ends_at, c.status,
              c.capacity, c.meeting_platform, u.name AS teacher_name,
              COALESCE(e.enrolled_count, 0) AS enrolled_count
       FROM LiveClasses c
       INNER JOIN Users u ON u.id = c.teacher_id
       OUTER APPLY (
         SELECT COUNT(*) AS enrolled_count
         FROM LiveClassEnrollments le
         WHERE le.class_id = c.id AND le.status = 'enrolled'
       ) e
       ORDER BY c.starts_at DESC, c.id DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      {
        limit: { type: sql.Int, value: limit },
        offset: { type: sql.Int, value: offset },
      },
    );
    const count = await query(`SELECT COUNT(*) AS total FROM LiveClasses`, {});
    return { rows: rows.recordset, total: count.recordset[0]?.total || 0 };
  },

  async listPayments({ limit, offset }) {
    const rows = await query(
      `SELECT o.id, o.order_id, o.user_id, u.name AS user_name, u.email,
              o.[plan], o.amount, o.status, o.payment_method, o.paid_at, o.created_at
       FROM Orders o
       INNER JOIN Users u ON u.id = o.user_id
       ORDER BY o.created_at DESC, o.id DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      {
        limit: { type: sql.Int, value: limit },
        offset: { type: sql.Int, value: offset },
      },
    );
    const count = await query(`SELECT COUNT(*) AS total FROM Orders`, {});
    return { rows: rows.recordset, total: count.recordset[0]?.total || 0 };
  },

  async reports() {
    const result = await query(
      `SELECT
         (SELECT COUNT(*) FROM Users WHERE created_at >= DATEADD(day, -7, GETDATE())) AS new_users_7d,
         (SELECT COUNT(*) FROM LiveClasses WHERE starts_at >= GETDATE() AND status = 'scheduled') AS upcoming_classes,
         (SELECT COUNT(*) FROM LiveClassEnrollments WHERE status = 'enrolled') AS live_enrollments,
         (SELECT COUNT(*) FROM QuizResults WHERE created_at >= DATEADD(day, -7, GETDATE())) AS quiz_attempts_7d,
         (SELECT COALESCE(SUM(amount), 0) FROM Orders WHERE status = 'paid' AND paid_at >= DATEADD(day, -30, GETDATE())) AS revenue_30d`,
      {},
    );
    return result.recordset[0];
  },

  async listLessons({ hsk_level, limit, offset }) {
    const conditions = ["1=1"];
    const params = {
      limit: { type: sql.Int, value: limit },
      offset: { type: sql.Int, value: offset },
    };
    if (hsk_level) {
      conditions.push("hsk_level = @hsk");
      params.hsk = { type: sql.TinyInt, value: hsk_level };
    }

    const where = conditions.join(" AND ");
    const rows = await query(
      `SELECT id, hsk_level, title, description, content, emoji, word_count,
              duration_minutes, order_index, is_published, created_at, updated_at
       FROM Lessons
       WHERE ${where}
       ORDER BY hsk_level, order_index, id
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params,
    );
    const count = await query(`SELECT COUNT(*) AS total FROM Lessons WHERE ${where}`, params);
    return { rows: rows.recordset, total: count.recordset[0]?.total || 0 };
  },

  async upsertLesson(id, lesson) {
    const params = {
      id: { type: sql.Int, value: id || null },
      hsk: { type: sql.TinyInt, value: lesson.hsk_level },
      title: { type: sql.NVarChar(200), value: lesson.title },
      description: { type: sql.NVarChar(500), value: lesson.description },
      content: { type: sql.NVarChar(sql.MAX), value: lesson.content },
      emoji: { type: sql.NVarChar(50), value: lesson.emoji },
      wordCount: { type: sql.Int, value: lesson.word_count },
      duration: { type: sql.Int, value: lesson.duration_minutes },
      orderIndex: { type: sql.Int, value: lesson.order_index },
      published: { type: sql.Bit, value: lesson.is_published },
    };

    const statement = id
      ? `UPDATE Lessons
         SET hsk_level=@hsk, title=@title, description=@description, content=@content,
             emoji=@emoji, word_count=@wordCount, duration_minutes=@duration,
             order_index=@orderIndex, is_published=@published, updated_at=GETDATE()
         OUTPUT INSERTED.*
         WHERE id=@id`
      : `INSERT INTO Lessons
           (hsk_level, title, description, content, emoji, word_count,
            duration_minutes, order_index, is_published, created_at, updated_at)
         OUTPUT INSERTED.*
         VALUES
           (@hsk, @title, @description, @content, @emoji, @wordCount,
            @duration, @orderIndex, @published, GETDATE(), GETDATE())`;

    const r = await query(statement, params);
    return r.recordset[0] || null;
  },

  async listVocabulary({ hsk_level, lesson_id, category, search, limit, offset }) {
    const conditions = ["1=1"];
    const params = {
      limit: { type: sql.Int, value: limit },
      offset: { type: sql.Int, value: offset },
    };
    if (hsk_level) {
      conditions.push("hsk_level = @hsk");
      params.hsk = { type: sql.TinyInt, value: hsk_level };
    }
    if (lesson_id) {
      conditions.push("lesson_id = @lessonId");
      params.lessonId = { type: sql.Int, value: lesson_id };
    }
    if (category) {
      conditions.push("category = @category");
      params.category = { type: sql.NVarChar(50), value: category };
    }
    if (search) {
      conditions.push("(hanzi LIKE @search OR pinyin LIKE @search OR meaning LIKE @search)");
      params.search = { type: sql.NVarChar(100), value: `%${search}%` };
    }

    const where = conditions.join(" AND ");
    const rows = await query(
      `SELECT id, lesson_id, hsk_level, hanzi, pinyin, meaning, meaning_en,
              example, example_pinyin, example_meaning, audio_url, tone, category,
              created_at, updated_at
       FROM Vocabulary
       WHERE ${where}
       ORDER BY hsk_level, lesson_id, id
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params,
    );
    const count = await query(`SELECT COUNT(*) AS total FROM Vocabulary WHERE ${where}`, params);
    return { rows: rows.recordset, total: count.recordset[0]?.total || 0 };
  },

  async upsertVocabulary(id, vocab) {
    const params = vocabularyParams(id, vocab);
    const statement = id
      ? `UPDATE Vocabulary
         SET lesson_id=@lessonId, hsk_level=@hsk, hanzi=@hanzi, pinyin=@pinyin,
             meaning=@meaning, meaning_en=@meaningEn, example=@example,
             example_pinyin=@examplePinyin, example_meaning=@exampleMeaning,
             audio_url=@audioUrl, tone=@tone, category=@category, updated_at=GETDATE()
         OUTPUT INSERTED.*
         WHERE id=@id`
      : `INSERT INTO Vocabulary
           (lesson_id, hsk_level, hanzi, pinyin, meaning, meaning_en, example,
            example_pinyin, example_meaning, audio_url, tone, category, created_at, updated_at)
         OUTPUT INSERTED.*
         VALUES
           (@lessonId, @hsk, @hanzi, @pinyin, @meaning, @meaningEn, @example,
            @examplePinyin, @exampleMeaning, @audioUrl, @tone, @category, GETDATE(), GETDATE())`;

    const r = await query(statement, params);
    return r.recordset[0] || null;
  },

  async importVocabulary({ source, rows, actorId }) {
    const inserted = [];
    for (const row of rows) {
      inserted.push(await this.upsertVocabulary(null, row));
    }

    await query(
      `INSERT INTO ContentImports (import_type, source, row_count, created_by, created_at)
       VALUES (@type, @source, @rowCount, @createdBy, GETDATE())`,
      {
        type: { type: sql.NVarChar(30), value: "vocabulary" },
        source: { type: sql.NVarChar(100), value: source },
        rowCount: { type: sql.Int, value: inserted.length },
        createdBy: { type: sql.Int, value: actorId || null },
      },
    );

    return inserted;
  },
};

function vocabularyParams(id, vocab) {
  return {
    id: { type: sql.Int, value: id || null },
    lessonId: { type: sql.Int, value: vocab.lesson_id || null },
    hsk: { type: sql.TinyInt, value: vocab.hsk_level },
    hanzi: { type: sql.NVarChar(50), value: vocab.hanzi },
    pinyin: { type: sql.NVarChar(100), value: vocab.pinyin },
    meaning: { type: sql.NVarChar(300), value: vocab.meaning },
    meaningEn: { type: sql.NVarChar(300), value: vocab.meaning_en },
    example: { type: sql.NVarChar(500), value: vocab.example },
    examplePinyin: { type: sql.NVarChar(500), value: vocab.example_pinyin },
    exampleMeaning: { type: sql.NVarChar(500), value: vocab.example_meaning },
    audioUrl: { type: sql.NVarChar(500), value: vocab.audio_url },
    tone: { type: sql.TinyInt, value: vocab.tone },
    category: { type: sql.NVarChar(50), value: vocab.category },
  };
}

module.exports = AdminDataModel;
