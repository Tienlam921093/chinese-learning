/**
 * USER MODEL — Tất cả DB queries liên quan đến Users
 */
const { sql, query } = require("../config/db");

const UserModel = {
  async findByEmail(email) {
    const r = await query(
      `SELECT id, name, email, password_hash, role, token_version, oauth_provider, oauth_display_name, hsk_level, xp, streak,
              ISNULL([plan],'free') AS [plan], plan_expiry
       FROM Users
       WHERE email = @email
         AND password_hash IS NOT NULL
         AND password_hash <> 'OAUTH_NO_PASSWORD'`,
      { email: { type: sql.NVarChar(200), value: email } },
    );
    return r.recordset[0] || null;
  },

  async findById(id) {
    const r = await query(
      `SELECT id, name, email, role, token_version, oauth_provider, oauth_display_name, hsk_level, xp, streak,
              ISNULL([plan],'free') AS [plan], plan_expiry,
              last_login, created_at
       FROM Users WHERE id = @id`,
      { id: { type: sql.Int, value: id } },
    );
    return r.recordset[0] || null;
  },

  async emailExists(email) {
    const r = await query(
      `SELECT id FROM Users
       WHERE email = @email
         AND password_hash IS NOT NULL
         AND password_hash <> 'OAUTH_NO_PASSWORD'`,
      {
        email: { type: sql.NVarChar(200), value: email },
      },
    );
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

  async updateName(id, name) {
    await query(
      `UPDATE Users SET name=@name, updated_at=GETDATE() WHERE id=@id`,
      {
        name: { type: sql.NVarChar(100), value: name },
        id: { type: sql.Int, value: id },
      },
    );
  },

  async updateOAuthDisplayName(id, name) {
    await query(
      `UPDATE Users SET oauth_display_name=@name, updated_at=GETDATE() WHERE id=@id`,
      {
        name: { type: sql.NVarChar(100), value: name },
        id: { type: sql.Int, value: id },
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
    // BƯỚC 1: Tìm theo oauth_provider + oauth_provider_id (chính xác nhất)
    // Đây là lookup duy nhất đúng — KHÔNG bao giờ link theo email
    // vì một email có thể thuộc về password account, Google account, Facebook account riêng biệt
    let r = await query(
      `SELECT id, name, email, role, token_version, oauth_provider, oauth_display_name, hsk_level, xp, streak,
              ISNULL([plan],'free') AS [plan], plan_expiry
       FROM Users WHERE oauth_provider=@prov AND oauth_provider_id=@pid`,
      {
        prov: { type: sql.NVarChar(20), value: provider },
        pid: { type: sql.NVarChar(100), value: providerId },
      },
    );
    if (r.recordset.length > 0) {
      const existing = r.recordset[0];
      const updates = [];
      const params = {
        id: { type: sql.Int, value: existing.id },
      };

      if (email && existing.email !== email) {
        updates.push("email=@email");
        params.email = { type: sql.NVarChar(200), value: email };
      }
      if (!existing.oauth_display_name && name) {
        updates.push("oauth_display_name=@name");
        params.name = { type: sql.NVarChar(100), value: name };
      }
      updates.push("oauth_provider=@prov");
      updates.push("oauth_provider_id=@pid");
      updates.push("avatar_url=@ava");
      updates.push("last_login=GETDATE()");
      params.prov = { type: sql.NVarChar(20), value: provider };
      params.pid = { type: sql.NVarChar(100), value: providerId };
      params.ava = { type: sql.NVarChar(500), value: avatarUrl };

      await query(
        `UPDATE Users SET ${updates.join(", ")} WHERE id=@id`,
        params,
      );

      if (email && existing.email !== email) existing.email = email;
      if (!existing.oauth_display_name && name)
        existing.oauth_display_name = name;
      existing.oauth_provider = provider;
      return existing;
    }

    // BƯỚC 2: Không tìm thấy gì → tạo user OAuth mới.
    // OAuth accounts dùng email placeholder nếu email đã bị dùng bởi account khác
    // (password account hoặc OAuth provider khác), để tránh conflict.
    // Mỗi combination (provider, providerId) luôn có row riêng.
    let emailValue = email || `${providerId}@${provider}.oauth`;

    // Kiểm tra email đã tồn tại chưa (bất kỳ loại account nào).
    // Nếu có → dùng email placeholder để tránh duplicate email error.
    if (email) {
      const emailCheck = await query(
        `SELECT COUNT(*) AS cnt FROM Users WHERE email = @email`,
        { email: { type: sql.NVarChar(200), value: email } },
      );
      if (emailCheck.recordset[0].cnt > 0) {
        // Email đã tồn tại trong DB (password account hoặc OAuth khác)
        // → dùng placeholder riêng cho provider này
        emailValue = `${providerId}@${provider}.oauth`;
      }
    }

    const ins = await query(
      `INSERT INTO Users (name, email, password_hash, role, hsk_level, xp, streak,
                          oauth_provider, oauth_provider_id, oauth_display_name, avatar_url,
                          created_at, last_login)
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role,
              INSERTED.token_version, INSERTED.oauth_provider, INSERTED.oauth_display_name,
              INSERTED.hsk_level, INSERTED.xp, INSERTED.streak,
              ISNULL(INSERTED.[plan],'free') AS [plan], INSERTED.plan_expiry
       VALUES (@name, @email, 'OAUTH_NO_PASSWORD', 'student', 1, 0, 0,
               @prov, @pid, NULL, @ava, GETDATE(), GETDATE())`,
      {
        name: { type: sql.NVarChar(100), value: name },
        email: { type: sql.NVarChar(200), value: emailValue },
        prov: { type: sql.NVarChar(20), value: provider },
        pid: { type: sql.NVarChar(100), value: providerId },
        ava: { type: sql.NVarChar(500), value: avatarUrl },
      },
    );
    return ins.recordset[0];
  },
};

module.exports = UserModel;
