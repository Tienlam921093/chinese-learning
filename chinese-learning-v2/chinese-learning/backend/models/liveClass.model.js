"use strict";

const { sql, getPool, query } = require("../config/db");

function mapClass(row) {
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name || "Giao vien",
    title: row.title,
    description: row.description || "",
    hsk_level: row.hsk_level,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    meeting_url: row.meeting_url,
    meeting_platform: row.meeting_platform || "other",
    capacity: row.capacity,
    status: row.status,
    enrolled_count: row.enrolled_count || 0,
    is_enrolled: Boolean(row.is_enrolled),
  };
}

const LiveClassModel = {
  async list({ userId, includePast = false, teacherId = null }) {
    const nowFilter = includePast ? "" : "AND c.ends_at >= GETDATE()";
    const teacherFilter = teacherId ? "AND c.teacher_id = @teacherId" : "";
    const result = await query(
      `SELECT
         c.id, c.teacher_id, u.name AS teacher_name, c.title, c.description,
         c.hsk_level, c.starts_at, c.ends_at, c.meeting_url, c.meeting_platform,
         c.capacity, c.status,
         COALESCE(enrolled.enrolled_count, 0) AS enrolled_count,
         CASE WHEN mine.user_id IS NULL THEN 0 ELSE 1 END AS is_enrolled
       FROM LiveClasses c
       INNER JOIN Users u ON u.id = c.teacher_id
       OUTER APPLY (
         SELECT COUNT(*) AS enrolled_count
         FROM LiveClassEnrollments e
         WHERE e.class_id = c.id AND e.status = 'enrolled'
       ) enrolled
       OUTER APPLY (
         SELECT TOP 1 e.user_id
         FROM LiveClassEnrollments e
         WHERE e.class_id = c.id AND e.user_id = @userId AND e.status = 'enrolled'
       ) mine
       WHERE c.status = 'scheduled' ${nowFilter} ${teacherFilter}
       ORDER BY c.starts_at ASC`,
      {
        userId: { type: sql.Int, value: userId },
        teacherId: { type: sql.Int, value: teacherId },
      },
    );
    return result.recordset.map(mapClass);
  },

  async create({
    teacherId,
    title,
    description,
    hskLevel,
    startsAt,
    endsAt,
    meetingUrl,
    meetingPlatform,
    capacity,
  }) {
    const result = await query(
      `INSERT INTO LiveClasses
         (teacher_id, title, description, hsk_level, starts_at, ends_at,
          meeting_url, meeting_platform, capacity, status, created_at, updated_at)
       OUTPUT INSERTED.*
       VALUES
         (@teacherId, @title, @description, @hskLevel, @startsAt, @endsAt,
          @meetingUrl, @meetingPlatform, @capacity, 'scheduled', GETDATE(), GETDATE())`,
      {
        teacherId: { type: sql.Int, value: teacherId },
        title: { type: sql.NVarChar(160), value: title },
        description: { type: sql.NVarChar(1000), value: description },
        hskLevel: { type: sql.TinyInt, value: hskLevel },
        startsAt: { type: sql.DateTime, value: startsAt },
        endsAt: { type: sql.DateTime, value: endsAt },
        meetingUrl: { type: sql.NVarChar(500), value: meetingUrl },
        meetingPlatform: { type: sql.NVarChar(20), value: meetingPlatform },
        capacity: { type: sql.Int, value: capacity },
      },
    );
    return mapClass(result.recordset[0]);
  },

  async enroll({ classId, userId }) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    try {
      const classReq = new sql.Request(transaction);
      classReq.input("classId", sql.Int, classId);
      const classResult = await classReq.query(
        `SELECT id, capacity, status, starts_at
         FROM LiveClasses WITH (UPDLOCK, HOLDLOCK)
         WHERE id = @classId`,
      );
      const liveClass = classResult.recordset[0];
      if (!liveClass) {
        const err = new Error("Lop hoc khong ton tai");
        err.code = "CLASS_NOT_FOUND";
        throw err;
      }
      if (liveClass.status !== "scheduled") {
        const err = new Error("Lop hoc khong con mo dang ky");
        err.code = "CLASS_CLOSED";
        throw err;
      }

      const countReq = new sql.Request(transaction);
      countReq.input("classId", sql.Int, classId);
      const countResult = await countReq.query(
        `SELECT COUNT(*) AS total
         FROM LiveClassEnrollments
         WHERE class_id = @classId AND status = 'enrolled'`,
      );
      if (countResult.recordset[0].total >= liveClass.capacity) {
        const err = new Error("Lop hoc da du so luong");
        err.code = "CLASS_FULL";
        throw err;
      }

      const enrollReq = new sql.Request(transaction);
      enrollReq.input("classId", sql.Int, classId);
      enrollReq.input("userId", sql.Int, userId);
      await enrollReq.query(
        `MERGE LiveClassEnrollments AS target
         USING (SELECT @classId AS class_id, @userId AS user_id) AS source
         ON target.class_id = source.class_id AND target.user_id = source.user_id
         WHEN MATCHED THEN UPDATE SET status = 'enrolled', updated_at = GETDATE()
         WHEN NOT MATCHED THEN INSERT (class_id, user_id, status, created_at, updated_at)
           VALUES (@classId, @userId, 'enrolled', GETDATE(), GETDATE());`,
      );

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async cancelEnrollment({ classId, userId }) {
    await query(
      `UPDATE LiveClassEnrollments
       SET status = 'cancelled', updated_at = GETDATE()
       WHERE class_id = @classId AND user_id = @userId`,
      {
        classId: { type: sql.Int, value: classId },
        userId: { type: sql.Int, value: userId },
      },
    );
  },

  async cancelClass({ classId, actorId, actorRole }) {
    const teacherFilter = actorRole === "admin" ? "" : "AND teacher_id = @actorId";
    const result = await query(
      `UPDATE LiveClasses
       SET status = 'cancelled', updated_at = GETDATE()
       WHERE id = @classId AND status = 'scheduled' ${teacherFilter}`,
      {
        classId: { type: sql.Int, value: classId },
        actorId: { type: sql.Int, value: actorId },
      },
    );
    return result.rowsAffected?.[0] || 0;
  },
};

module.exports = LiveClassModel;
