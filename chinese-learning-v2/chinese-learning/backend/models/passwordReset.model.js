/**
 * PASSWORD RESET MODEL
 */
const crypto         = require('crypto');
const { sql, query } = require('../config/db');

const PasswordResetModel = {

  // Tạo token reset — trả về raw token (gửi email), lưu hash vào DB
  async create({ userId, ipAddress }) {
    // Xóa các token cũ chưa dùng của user này
    await query(
      `UPDATE PasswordResets SET used=1, used_at=GETDATE() WHERE user_id=@uid AND used=0`,
      { uid: { type: sql.Int, value: userId } }
    );

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await query(
      `INSERT INTO PasswordResets (user_id, token_hash, expires_at, ip_address)
       VALUES (@uid, @hash, @exp, @ip)`,
      {
        uid:  { type: sql.Int,           value: userId    },
        hash: { type: sql.NVarChar(128), value: tokenHash },
        exp:  { type: sql.DateTime,      value: expiresAt },
        ip:   { type: sql.NVarChar(45),  value: ipAddress || null },
      }
    );

    return rawToken; // Chỉ gửi raw token qua email, không lưu vào DB
  },

  async findValid(rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const r = await query(
      `SELECT pr.id, pr.user_id, u.email, u.name
       FROM PasswordResets pr
       JOIN Users u ON u.id = pr.user_id
       WHERE pr.token_hash=@hash AND pr.used=0 AND pr.expires_at > GETDATE()`,
      { hash: { type: sql.NVarChar(128), value: tokenHash } }
    );
    return r.recordset[0] || null;
  },

  async markUsed(rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await query(
      `UPDATE PasswordResets SET used=1, used_at=GETDATE() WHERE token_hash=@hash`,
      { hash: { type: sql.NVarChar(128), value: tokenHash } }
    );
  },
};

module.exports = PasswordResetModel;
