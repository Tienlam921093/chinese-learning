/**
 * USER MODEL — Tất cả DB queries liên quan đến Users
 */
const { sql, query } = require("../config/db");

const UserModel = {
  async findByEmail(email) {
    const r = await query(
      `SELECT id, name, email, password_hash, role, token_version, oauth_provider, hsk_level, xp, streak,
              ISNULL([plan],'free') AS [plan], plan_expiry
       FROM Users WHERE email = @email`,
      { email: { type: sql.NVarChar(200), value: email } },
    );
    return r.recordset[0] || null;
  },

  async findById(id) {
    const r = await query(
      `SELECT id, name, email, role, token_version, oauth_provider, hsk_level, xp, streak,
              ISNULL([plan],'free') AS [plan], plan_expiry,
              last_login, created_at
       FROM Users WHERE id = @id`,
      { id: { type: sql.Int, value: id } },
    );
    return r.recordset[0] || null;
  },

  async emailExists(email) {
    const r = await query(`SELECT id FROM Users WHERE email = @email`, {
      email: { type: sql.NVarChar(200), value: email },
    });
    return r.recordset.length > 0;
  },

  async create({ name, email, passwordHash }) {
    const r = await query(
      `INSERT INTO Users (name, email, password_hash, role, hsk_level, xp, streak, created_at)
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role
       VALUES (@name, @email, @hash, 'student', 1, 0, 0, GETDATE())`,
      {
        name: { type: sql.NVarChar(100), value: name },
        email: { type: sql.NVarChar(200), value: email },
        hash: { type: sql.NVarChar(255), value: passwordHash },
      },
    );
    return r.recordset[0];
  },

  async updateLastLogin(id) {
    await query(`UPDATE Users SET last_login = GETDATE() WHERE id = @id`, {
      id: { type: sql.Int, value: id },
    });
  },

  async updatePlan(userId, plan, expiry) {
    await query(
      `UPDATE Users SET [plan]=@plan, plan_expiry=@exp, updated_at=GETDATE() WHERE id=@id`,
      {
        plan: { type: sql.NVarChar(20), value: plan },
        exp: { type: sql.DateTime, value: expiry },
        id: { type: sql.Int, value: userId },
      },
    );
  },

  async updatePassword(id, newHash) {
    await query(
      `UPDATE Users SET password_hash=@hash, updated_at=GETDATE() WHERE id=@id`,
      {
        hash: { type: sql.NVarChar(255), value: newHash },
        id: { type: sql.Int, value: id },
      },
    );
  },

  async getPasswordHash(id) {
    const r = await query(`SELECT password_hash FROM Users WHERE id=@id`, {
      id: { type: sql.Int, value: id },
    });
    return r.recordset[0]?.password_hash || null;
  },

  async addXP(userId, xp) {
    await query(`UPDATE Users SET xp=xp+@xp WHERE id=@uid`, {
      xp: { type: sql.Int, value: xp },
      uid: { type: sql.Int, value: userId },
    });
  },

  async getLeaderboard(limit = 50) {
    const r = await query(
      `SELECT TOP (@lim) id, name, hsk_level, xp, streak, ISNULL([plan],'free') AS [plan]
       FROM Users WHERE is_active=1 ORDER BY xp DESC`,
      { lim: { type: sql.Int, value: limit } },
    );
    return r.recordset;
  },

  async findOrCreateOAuth({ name, email, provider, providerId, avatarUrl }) {
    // Tìm user theo oauth_provider_id
    let r = await query(
      `SELECT id, name, email, role, token_version, oauth_provider, hsk_level, xp, streak,
              ISNULL([plan],'free') AS [plan], plan_expiry
       FROM Users WHERE oauth_provider=@prov AND oauth_provider_id=@pid`,
      {
        prov: { type: sql.NVarChar(20), value: provider },
        pid: { type: sql.NVarChar(100), value: providerId },
      },
    );
    if (r.recordset.length > 0) return r.recordset[0];

    // Tìm theo email
    r = await query(
      `SELECT id, name, email, role, oauth_provider, hsk_level, xp, streak,
              password_hash, oauth_provider,
              ISNULL([plan],'free') AS [plan], plan_expiry
       FROM Users WHERE email=@email`,
      { email: { type: sql.NVarChar(200), value: email } },
    );
    if (r.recordset.length > 0) {
      const existing = r.recordset[0];

      // FIX N8: Chỉ auto-link nếu account KHÔNG có mật khẩu thật
      // (tức là account OAuth khác) → tránh attacker chiếm account email+password
      const hasRealPassword =
        existing.password_hash &&
        existing.password_hash !== "OAUTH_NO_PASSWORD";

      if (hasRealPassword && !existing.oauth_provider) {
        // Account có mật khẩu thật và chưa link OAuth → KHÔNG tự link
        // Tạo account mới với email suffix để tránh conflict
        console.warn(
          `[OAuth] ⚠️ Email ${email} đã có account password — tạo account OAuth riêng`,
        );
        const oauthEmail = `${providerId}@${provider}.oauth`;
        const ins = await query(
          `INSERT INTO Users (name, email, password_hash, role, hsk_level, xp, streak,
                              oauth_provider, oauth_provider_id, avatar_url, created_at, last_login)
           OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role,
              INSERTED.token_version,
              INSERTED.oauth_provider,
                  INSERTED.hsk_level, INSERTED.xp, INSERTED.streak,
                  ISNULL(INSERTED.[plan],'free') AS [plan], INSERTED.plan_expiry
           VALUES (@name, @oemail, 'OAUTH_NO_PASSWORD', 'student', 1, 0, 0,
                   @prov, @pid, @ava, GETDATE(), GETDATE())`,
          {
            name: { type: sql.NVarChar(100), value: name },
            oemail: { type: sql.NVarChar(200), value: oauthEmail },
            prov: { type: sql.NVarChar(20), value: provider },
            pid: { type: sql.NVarChar(100), value: providerId },
            ava: { type: sql.NVarChar(500), value: avatarUrl },
          },
        );
        return ins.recordset[0];
      }

      // Account OAuth khác hoặc không có password → an toàn để link
      await query(
        `UPDATE Users SET oauth_provider=@prov, oauth_provider_id=@pid, avatar_url=@ava WHERE id=@id`,
        {
          prov: { type: sql.NVarChar(20), value: provider },
          pid: { type: sql.NVarChar(100), value: providerId },
          ava: { type: sql.NVarChar(500), value: avatarUrl },
          id: { type: sql.Int, value: existing.id },
        },
      );
      return existing;
    }

    // Tạo user mới
    const ins = await query(
      `INSERT INTO Users (name, email, password_hash, role, hsk_level, xp, streak,
                          oauth_provider, oauth_provider_id, avatar_url, created_at, last_login)
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role,
        INSERTED.token_version,
              INSERTED.oauth_provider,
              INSERTED.hsk_level, INSERTED.xp, INSERTED.streak,
              ISNULL(INSERTED.[plan],'free') AS [plan], INSERTED.plan_expiry
       VALUES (@name, @email, 'OAUTH_NO_PASSWORD', 'student', 1, 0, 0,
               @prov, @pid, @ava, GETDATE(), GETDATE())`,
      {
        name: { type: sql.NVarChar(100), value: name },
        email: { type: sql.NVarChar(200), value: email },
        prov: { type: sql.NVarChar(20), value: provider },
        pid: { type: sql.NVarChar(100), value: providerId },
        ava: { type: sql.NVarChar(500), value: avatarUrl },
      },
    );
    return ins.recordset[0];
  },
};

module.exports = UserModel;
