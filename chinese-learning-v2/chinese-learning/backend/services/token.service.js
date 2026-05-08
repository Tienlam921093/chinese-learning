/**
 * TOKEN SERVICE — JWT với token_version để kick phiên cũ
 *
 * FIX N10: Đọc secrets qua env.js (hỗ trợ Docker secret files)
 *          thay vì process.env trực tiếp
 */
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

const TokenService = {
  // Tạo access token — nhúng token_version vào payload
  generateAccess(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        token_version: user.token_version || 1, // ← key để kick phiên cũ
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES || "15m" }, // ← 15 phút thay vì 7 ngày
    );
  },

  // Tạo refresh token — chỉ lưu id
  generateRefresh(userId) {
    // Include a random jti/nonced value to ensure every refresh token is unique
    // even if generated within the same second for the same user id.
    const payload = { id: userId, jti: crypto.randomBytes(16).toString("hex") };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
  },

  // Tạo cả 2
  generate(user) {
    return {
      accessToken: this.generateAccess(user),
      refreshToken: this.generateRefresh(user.id),
      expiresIn: env.JWT_EXPIRES_SECONDS || 900, // 15 phút
    };
  },

  verifyAccess(token) {
    return jwt.verify(token, env.JWT_SECRET);
  },

  verifyRefresh(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  },

  getRefreshExpiry() {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  },
};

module.exports = TokenService;
