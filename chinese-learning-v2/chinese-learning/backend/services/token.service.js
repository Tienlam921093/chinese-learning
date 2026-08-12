/**
 * TOKEN SERVICE — JWT với token_version để kick phiên cũ
 *
 * FIX N10: Đọc secrets qua env.js (hỗ trợ Docker secret files)
 *          thay vì process.env trực tiếp
 */
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

// TokenService gom cac ham tao va xac thuc JWT cho he thong dang nhap.
const TokenService = {
  // Tạo access token — nhúng token_version vào payload
  generateAccess(user) {
    // jwt.sign tao JWT moi tu payload, secret va thoi gian het han.
    return jwt.sign(
      {
        // Cac field nay duoc nhung vao token de middleware biet nguoi dung la ai.
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        token_version: user.token_version || 1, // ← key để kick phiên cũ
        // auth_source cho biet user dang nhap bang password hay OAuth.
        auth_source: user.auth_source || "password",
      },
      // Secret doc qua config/env de ho tro ca bien moi truong va Docker secret files.
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES || "15m" }, // ← 15 phút thay vì 7 ngày
    );
  },

  // Tạo refresh token — chỉ lưu id
  generateRefresh(userId, authSource = "password") {
    // Include a random jti/nonced value to ensure every refresh token is unique
    // even if generated within the same second for the same user id.
    const payload = {
      // Refresh token chi can id de cap lai access token.
      id: userId,
      // Giu nguon dang nhap de luong refresh biet user den tu dau.
      auth_source: authSource,
      // jti la ma ngau nhien giup refresh token khong trung nhau.
      jti: crypto.randomBytes(16).toString("hex"),
    };
    // Refresh token song 30 ngay va duoc ky bang secret rieng.
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
  },

  // Tạo cả 2
  generate(user) {
    // Tra ve bo token day du cho client sau khi dang nhap/refresh thanh cong.
    return {
      accessToken: this.generateAccess(user),
      refreshToken: this.generateRefresh(
        user.id,
        user.auth_source || "password",
      ),
      expiresIn: env.JWT_EXPIRES_SECONDS || 900, // 15 phút
    };
  },

  verifyAccess(token) {
    // Xac thuc access token va tra ve payload neu token hop le.
    return jwt.verify(token, env.JWT_SECRET);
  },

  verifyRefresh(token) {
    // Xac thuc refresh token bang secret rieng cua refresh token.
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  },

  getRefreshExpiry() {
    // Tinh thoi diem het han refresh token, dung khi luu vao database/cookie.
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  },
};

// Xuat service de routes/controllers su dung chung logic token.
module.exports = TokenService;
