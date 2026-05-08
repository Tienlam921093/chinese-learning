/**
 * REFRESH TOKEN MODEL — Blacklist + Rotation
 */
const crypto      = require('crypto');
const { sql, query } = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const RefreshTokenModel = {

  async save({ token, userId, expiresAt, userAgent, ipAddress }) {
    const hash = hashToken(token);
    await query(
      `INSERT INTO RefreshTokens (token_hash, user_id, expires_at, user_agent, ip_address)
       VALUES (@hash, @uid, @exp, @ua, @ip)`,
      {
        hash: { type: sql.NVarChar(128), value: hash },
        uid:  { type: sql.Int,           value: userId },
        exp:  { type: sql.DateTime,      value: expiresAt },
        ua:   { type: sql.NVarChar(500), value: userAgent || null },
        ip:   { type: sql.NVarChar(45),  value: ipAddress || null },
      }
    );
  },

  async find(token) {
    const hash = hashToken(token);
    const r = await query(
      `SELECT id, user_id, expires_at, revoked FROM RefreshTokens
       WHERE token_hash = @hash`,
      { hash: { type: sql.NVarChar(128), value: hash } }
    );
    return r.recordset[0] || null;
  },

  async revoke(token) {
    const hash = hashToken(token);
    await query(
      `UPDATE RefreshTokens SET revoked=1, revoked_at=GETDATE() WHERE token_hash=@hash`,
      { hash: { type: sql.NVarChar(128), value: hash } }
    );
  },

  // Atomically consume current refresh token and issue a new one.
  // Returns true if rotation succeeded, false if token already used/invalid/expired.
  async consumeAndRotate({ oldToken, userId, newToken, expiresAt, userAgent, ipAddress }) {
    const oldHash = hashToken(oldToken);
    const newHash = hashToken(newToken);

    const result = await query(
      `BEGIN TRY
         BEGIN TRAN;

         UPDATE RefreshTokens
         SET revoked = 1, revoked_at = GETDATE()
         WHERE token_hash = @oldHash
           AND user_id = @uid
           AND revoked = 0
           AND expires_at > GETDATE();

         IF @@ROWCOUNT = 0
         BEGIN
           ROLLBACK TRAN;
           SELECT CAST(0 AS BIT) AS rotated;
           RETURN;
         END

         INSERT INTO RefreshTokens (token_hash, user_id, expires_at, user_agent, ip_address)
         VALUES (@newHash, @uid, @exp, @ua, @ip);

         COMMIT TRAN;
         SELECT CAST(1 AS BIT) AS rotated;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRAN;
         THROW;
       END CATCH`,
      {
        oldHash: { type: sql.NVarChar(128), value: oldHash },
        newHash: { type: sql.NVarChar(128), value: newHash },
        uid:     { type: sql.Int,           value: userId },
        exp:     { type: sql.DateTime,      value: expiresAt },
        ua:      { type: sql.NVarChar(500), value: userAgent || null },
        ip:      { type: sql.NVarChar(45),  value: ipAddress || null },
      }
    );

    return Boolean(result.recordset?.[0]?.rotated);
  },

  // Revoke tất cả token của user — dùng khi đổi mật khẩu
  async revokeAllForUser(userId) {
    await query(
      `UPDATE RefreshTokens SET revoked=1, revoked_at=GETDATE()
       WHERE user_id=@uid AND revoked=0`,
      { uid: { type: sql.Int, value: userId } }
    );
  },

  // Dọn token hết hạn/revoked
  async cleanup() {
    await query(
      `DELETE FROM RefreshTokens WHERE expires_at < GETDATE() OR revoked=1`,
      {}
    );
  },
};

module.exports = { RefreshTokenModel, hashToken };
