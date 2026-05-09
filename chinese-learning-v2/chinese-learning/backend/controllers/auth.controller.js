/**
 * AUTH CONTROLLER — Full Security
 * - Refresh token rotation + blacklist
 * - token_version để kick phiên cũ
 * - Forgot/Reset password thật sự
 * - httpOnly cookie cho refresh token
 */
const bcrypt = require("bcryptjs");
const UserModel = require("../models/user.model");
const TokenService = require("../services/token.service");
const { RefreshTokenModel } = require("../models/refreshToken.model");
const PasswordResetModel = require("../models/passwordReset.model");
const EmailService = require("../services/email.service");
const { buildFrontendUrl } = require("../utils/frontend-url.utils");
const { sql, query } = require("../config/db");

// FIX H6/M2: Email regex validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cookie options cho refresh token — httpOnly bảo vệ khỏi XSS
// In dev: frontend calls /api proxy (same-origin nginx) → sameSite lax ok
// In prod: always HTTPS strict same-site
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
  path: "/", // Root path so all requests include it
};
const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 15 * 60 * 1000, // 15 phút
  path: "/", // Root path so all requests include it
};

function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    null
  );
}

function clearLegacyAuthCookies(res) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.clearCookie("accessToken", { path: "/api" });
}

// ── Helper: chuẩn hóa user object trả về cho frontend ──
// Đảm bảo luôn trả đúng tên hiển thị tùy loại tài khoản:
// - OAuth: dùng oauth_display_name nếu có (tên user tự đặt), fallback về name từ provider
// - Password: dùng name trong DB
function buildSessionUser(user, authSource = "password", extra = {}) {
  const isOAuth = authSource === "oauth" || !!user.oauth_provider;
  const displayName = isOAuth
    ? user.oauth_display_name || user.name || ""
    : user.name || "";

  return {
    id: user.id,
    name: displayName,
    email: user.email,
    role: user.role || "student",
    oauth_provider: user.oauth_provider || null,
    auth_source: authSource,
    hsk_level: user.hsk_level || 1,
    xp: user.xp || 0,
    streak: user.streak || 0,
    plan: user.plan || "free",
    plan_expiry: user.plan_expiry || null,
    ...extra,
  };
}

const AuthController = {
  // ── Register ──
  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password)
        return res
          .status(400)
          .json({ message: "Vui lòng điền đầy đủ thông tin" });

      // FIX H6: Validate input format
      const trimmedName = String(name).trim();
      const trimmedEmail = String(email).trim().toLowerCase();
      if (trimmedName.length < 2 || trimmedName.length > 100)
        return res.status(400).json({ message: "Tên phải từ 2-100 ký tự" });
      if (!EMAIL_REGEX.test(trimmedEmail))
        return res.status(400).json({ message: "Email không hợp lệ" });
      if (password.length < 6)
        return res
          .status(400)
          .json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
      if (password.length > 128)
        return res
          .status(400)
          .json({ message: "Mật khẩu quá dài (tối đa 128 ký tự)" });
      if (await UserModel.emailExists(trimmedEmail))
        return res.status(409).json({ message: "Email đã được sử dụng" });

      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = await UserModel.create({
        name: trimmedName,
        email: trimmedEmail,
        passwordHash,
      });
      const { accessToken, refreshToken, expiresIn } = TokenService.generate({
        ...newUser,
        token_version: 1,
      });

      // Lưu refresh token vào DB
      await RefreshTokenModel.save({
        token: refreshToken,
        userId: newUser.id,
        expiresAt: TokenService.getRefreshExpiry(),
        userAgent: req.headers["user-agent"],
        ipAddress: getIP(req),
      });

      // Dọn cookie legacy path để tránh 2 session cùng tồn tại
      clearLegacyAuthCookies(res);

      // Gửi refresh token qua httpOnly cookie
      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
      res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTS);

      res.status(201).json({
        message: "Đăng ký thành công! Chào mừng bạn đến với HánYǔ 🎉",
        token: accessToken,
        expiresIn, // Frontend dùng để biết khi nào cần refresh
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          oauth_provider: null,
          auth_source: "password",
          plan: "free",
        },
      });
    } catch (err) {
      console.error("[AUTH] Register:", err.message);
      res.status(500).json({ message: "Lỗi server. Vui lòng thử lại." });
    }
  },

  // ── Login ──
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res
          .status(400)
          .json({ message: "Vui lòng nhập email và mật khẩu" });

      // FIX H6: Normalize email
      const trimmedEmail = String(email).trim().toLowerCase();
      const user = await UserModel.findByEmail(trimmedEmail);
      if (!user || !(await bcrypt.compare(password, user.password_hash)))
        return res
          .status(401)
          .json({ message: "Email hoặc mật khẩu không đúng" });

      await UserModel.updateLastLogin(user.id);
      const { accessToken, refreshToken, expiresIn } = TokenService.generate({
        ...user,
        auth_source: "password",
      });

      await RefreshTokenModel.save({
        token: refreshToken,
        userId: user.id,
        expiresAt: TokenService.getRefreshExpiry(),
        userAgent: req.headers["user-agent"],
        ipAddress: getIP(req),
      });

      clearLegacyAuthCookies(res);
      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
      res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTS);

      res.json({
        message: "Đăng nhập thành công!",
        token: accessToken,
        expiresIn,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          oauth_provider: user.oauth_provider || null,
          auth_source: "password",
          hsk_level: user.hsk_level,
          xp: user.xp,
          streak: user.streak,
          plan: user.plan || "free",
          plan_expiry: user.plan_expiry || null,
        },
      });
    } catch (err) {
      console.error("[AUTH] Login:", err.message);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ── Refresh Token — Rotation ──
  async refresh(req, res) {
    try {
      // Đọc từ httpOnly cookie (ưu tiên) hoặc body (fallback cho app mobile)
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token)
        return res.status(401).json({
          message: "Không có refresh token",
          code: "NO_REFRESH_TOKEN",
        });

      // 1. Verify JWT
      let decoded;
      try {
        decoded = TokenService.verifyRefresh(token);
      } catch {
        res.clearCookie("refreshToken", { path: "/" });
        res.clearCookie("accessToken", { path: "/" });
        clearLegacyAuthCookies(res);
        return res
          .status(401)
          .json({ message: "Refresh token không hợp lệ hoặc đã hết hạn" });
      }

      // 2. Lấy user + token_version mới nhất từ DB
      const user = await UserModel.findById(decoded.id);
      if (!user)
        return res.status(401).json({ message: "Tài khoản không tồn tại" });
      const sessionAuthSource = decoded.auth_source || "password";

      // 3. TOKEN ROTATION (atomic): consume token cũ + tạo token mới trong cùng transaction
      const {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      } = TokenService.generate({ ...user, auth_source: sessionAuthSource });
      const rotated = await RefreshTokenModel.consumeAndRotate({
        oldToken: token,
        userId: user.id,
        newToken: newRefreshToken,
        expiresAt: TokenService.getRefreshExpiry(),
        userAgent: req.headers["user-agent"],
        ipAddress: getIP(req),
      });
      if (!rotated) {
        // Token đã bị dùng/revoke/hết hạn hoặc không thuộc user này.
        res.clearCookie("refreshToken", { path: "/" });
        res.clearCookie("accessToken", { path: "/" });
        clearLegacyAuthCookies(res);
        return res.status(401).json({
          message: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
          code: "REFRESH_TOKEN_INVALID",
          should_logout: true,
        });
      }

      clearLegacyAuthCookies(res);
      res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTS);
      res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTS);
      res.json({
        token: accessToken,
        expiresIn,
        auth_source: sessionAuthSource,
      });
    } catch (err) {
      console.error("[AUTH] Refresh:", err.message);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ── Logout ──
  async logout(req, res) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (token) await RefreshTokenModel.revoke(token);
      res.clearCookie("refreshToken", { path: "/" });
      res.clearCookie("accessToken", { path: "/" });
      clearLegacyAuthCookies(res);
      res.json({ message: "Đăng xuất thành công" });
    } catch {
      res.json({ message: "Đăng xuất thành công" }); // Luôn trả success cho logout
    }
  },

  // ── Logout tất cả thiết bị ──
  async logoutAll(req, res) {
    try {
      await RefreshTokenModel.revokeAllForUser(req.user.id);
      // Tăng token_version → kick tất cả access token đang lưu
      await query(
        `UPDATE Users SET token_version = token_version + 1 WHERE id = @id`,
        { id: { type: sql.Int, value: req.user.id } },
      );
      res.clearCookie("refreshToken", { path: "/" });
      res.clearCookie("accessToken", { path: "/" });
      clearLegacyAuthCookies(res);
      res.json({ message: "Đã đăng xuất khỏi tất cả thiết bị" });
    } catch (err) {
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ── Me ──
  async me(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user)
        return res.status(404).json({ message: "Người dùng không tồn tại" });
      res.json({
        user: buildSessionUser(
          user,
          req.user.auth_source || (user.oauth_provider ? "oauth" : "password"),
        ),
      });
    } catch {
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ── Change Password — kick phiên cũ ──
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword)
        return res.status(400).json({ message: "Vui lòng điền đầy đủ" });
      if (newPassword.length < 6)
        return res
          .status(400)
          .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

      const hash = await UserModel.getPasswordHash(req.user.id);
      if (!hash)
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      if (!(await bcrypt.compare(currentPassword, hash)))
        return res
          .status(401)
          .json({ message: "Mật khẩu hiện tại không đúng" });

      const newHash = await bcrypt.hash(newPassword, 12);
      await UserModel.updatePassword(req.user.id, newHash);

      // KICK TẤT CẢ PHIÊN CŨ:
      // 1. Tăng token_version → tất cả access token cũ không còn hợp lệ
      await query(
        `UPDATE Users SET token_version = token_version + 1,
                          password_changed_at = GETDATE()
         WHERE id = @id`,
        { id: { type: sql.Int, value: req.user.id } },
      );
      // 2. Revoke tất cả refresh token → không thể lấy access token mới
      await RefreshTokenModel.revokeAllForUser(req.user.id);

      // Gửi email thông báo
      try {
        const user = await UserModel.findById(req.user.id);
        await EmailService.sendPasswordChanged({
          to: user.email,
          name: user.name,
        });
      } catch (emailErr) {
        console.warn(
          "[EMAIL] Không gửi được email thông báo:",
          emailErr.message,
        );
      }

      res.clearCookie("refreshToken", { path: "/" });
      res.clearCookie("accessToken", { path: "/" });
      clearLegacyAuthCookies(res);
      res.json({
        message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
        should_logout: true, // Frontend tự logout và redirect về login
      });
    } catch (err) {
      console.error("[CHANGE-PWD]", err.message);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ── Forgot Password ──
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email)
        return res.status(400).json({ message: "Vui lòng nhập email" });

      const normalizedEmail = String(email).trim().toLowerCase();

      // Luôn trả về success để tránh user enumeration
      // (không để hacker biết email có tồn tại không)
      const user = await UserModel.findByEmail(normalizedEmail);
      if (user) {
        const rawToken = await PasswordResetModel.create({
          userId: user.id,
          ipAddress: getIP(req),
        });
        const resetUrl = buildFrontendUrl(
          `/pages/reset-password.html?token=${rawToken}`,
          `/reset-password?token=${rawToken}`,
        );
        try {
          await EmailService.sendPasswordReset({
            to: user.email,
            name: user.name,
            resetToken: rawToken,
          });
        } catch (emailErr) {
          console.error(
            "[EMAIL] Forgot password email failed:",
            emailErr.message,
          );
          if (process.env.NODE_ENV !== "production") {
            return res.json({
              message:
                "SMTP chưa cấu hình nên email không gửi được. Dùng link reset tạm thời trong dev.",
              devResetUrl: resetUrl,
            });
          }
          return res.status(500).json({
            message:
              "Không gửi được email reset. Kiểm tra cấu hình SMTP trong backend.env.",
          });
        }
      }

      // Trả về cùng 1 message dù email có tồn tại hay không
      res.json({
        message:
          "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.",
      });
    } catch (err) {
      console.error("[FORGOT-PWD]", err.message);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ── Reset Password (từ link email) ──
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword)
        return res.status(400).json({ message: "Thiếu thông tin" });
      if (newPassword.length < 6)
        return res
          .status(400)
          .json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });

      const resetRecord = await PasswordResetModel.findValid(token);
      if (!resetRecord)
        return res.status(400).json({
          message:
            "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (15 phút).",
        });

      const newHash = await bcrypt.hash(newPassword, 12);
      await UserModel.updatePassword(resetRecord.user_id, newHash);

      // Tăng token_version + revoke tất cả phiên
      await query(
        `UPDATE Users SET token_version = token_version + 1,
                          password_changed_at = GETDATE()
         WHERE id = @id`,
        { id: { type: sql.Int, value: resetRecord.user_id } },
      );
      await RefreshTokenModel.revokeAllForUser(resetRecord.user_id);

      // Đánh dấu token đã dùng
      await PasswordResetModel.markUsed(token);

      // Đăng nhập luôn sau khi reset mật khẩu
      const user = await UserModel.findById(resetRecord.user_id);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      const { accessToken, refreshToken, expiresIn } = TokenService.generate({
        ...user,
        auth_source: "password",
      });
      await RefreshTokenModel.save({
        token: refreshToken,
        userId: user.id,
        expiresAt: TokenService.getRefreshExpiry(),
        userAgent: req.headers["user-agent"],
        ipAddress: getIP(req),
      });

      clearLegacyAuthCookies(res);
      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
      res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTS);

      res.json({
        message: "Đặt lại mật khẩu thành công! Đang đăng nhập tự động...",
        token: accessToken,
        expiresIn,
        user: buildSessionUser(user, "password", {
          plan: user.plan || "free",
          plan_expiry: user.plan_expiry || null,
        }),
      });
    } catch (err) {
      console.error("[RESET-PWD]", err.message);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ── Update Profile (tên) ──
  async updateProfile(req, res) {
    try {
      const { name } = req.body;
      if (!name || String(name).trim().length < 2)
        return res.status(400).json({ message: "Tên phải có ít nhất 2 ký tự" });
      if (String(name).trim().length > 100)
        return res
          .status(400)
          .json({ message: "Tên quá dài (tối đa 100 ký tự)" });

      const trimmed = String(name).trim();
      if ((req.user.auth_source || "password") === "oauth") {
        await UserModel.updateOAuthDisplayName(req.user.id, trimmed);
      } else {
        await UserModel.updateName(req.user.id, trimmed);
      }

      // Trả về user mới nhất để frontend cập nhật localStorage
      const updated = await UserModel.findById(req.user.id);
      res.json({
        message: "Đã cập nhật tên",
        user: buildSessionUser(updated, req.user.auth_source || "password"),
      });
    } catch (err) {
      console.error("[UPDATE-PROFILE]", err.message);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ── Leaderboard ──
  async leaderboard(req, res) {
    try {
      const users = await UserModel.getLeaderboard(50);
      res.json({ users });
    } catch (err) {
      res.status(500).json({ message: "Lỗi lấy bảng xếp hạng" });
    }
  },
};

module.exports = AuthController;
