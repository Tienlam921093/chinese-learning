/**
 * OAUTH ROUTES — Google + Facebook
 * Dùng auth code tạm thay vì truyền token qua URL (bảo mật hơn)
 */
const router = require("express").Router();
const crypto = require("crypto");
const passport = require("../config/passport");
const env = require("../config/env");
const TokenService = require("../services/token.service");
const { RefreshTokenModel } = require("../models/refreshToken.model");
const { buildFrontendUrl } = require("../utils/frontend-url.utils");

// In-memory store cho auth codes — TTL 60 giây
// FIX C2: Giới hạn kích thước Map chống memory leak
const authCodes = new Map();
const AUTH_CODES_MAX = 1000;

function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [code, data] of authCodes) {
    if (now > data.expiresAt || data.used) authCodes.delete(code);
  }
}

function addAuthCode(code, data) {
  // Cleanup trước nếu vượt ngưỡng
  if (authCodes.size >= AUTH_CODES_MAX) {
    cleanupExpiredCodes();
    // Nếu vẫn quá lớn → xóa entries cũ nhất
    if (authCodes.size >= AUTH_CODES_MAX) {
      const toDelete = authCodes.size - AUTH_CODES_MAX + 100;
      let deleted = 0;
      for (const [key] of authCodes) {
        if (deleted >= toDelete) break;
        authCodes.delete(key);
        deleted++;
      }
    }
  }
  authCodes.set(code, data);
}

// Dọn mỗi 2 phút (tăng tần suất)
setInterval(cleanupExpiredCodes, 2 * 60 * 1000);

function logOAuthFailure(provider, err, req) {
  const oauthError = err?.oauthError || err?.cause || null;
  console.error(`[OAuth] ${provider} callback failed`, {
    message: err?.message || "Unknown OAuth error",
    oauthErrorMessage: oauthError?.message || null,
    oauthErrorStatus: oauthError?.statusCode || null,
    callbackUrl: `${env.BASE_URL}/api/auth/${provider}/callback`,
    originalUrl: req?.originalUrl,
  });
}

function oauthCallback(provider, failureError) {
  return (req, res, next) => {
    passport.authenticate(provider, (err, user, info) => {
      if (err) {
        logOAuthFailure(provider, err, req);
        return res.redirect(
          buildFrontendUrl(
            `/pages/login.html?error=${failureError}`,
            `/login?error=${failureError}`,
          ),
        );
      }

      if (!user) {
        console.warn(`[OAuth] ${provider} authentication returned no user`, {
          info: info?.message || info,
          callbackUrl: `${env.BASE_URL}/api/auth/${provider}/callback`,
        });
        return res.redirect(
          buildFrontendUrl(
            `/pages/login.html?error=${failureError}`,
            `/login?error=${failureError}`,
          ),
        );
      }

      req.user = user;
      return handleOAuthSuccess(req, res, next);
    })(req, res, next);
  };
}

/**
 * Tạo auth code tạm (60 giây), redirect frontend kèm code thay vì token
 */
function handleOAuthSuccess(req, res) {
  if (!req.user) {
    return res.redirect(
      buildFrontendUrl(
        "/pages/login.html?error=oauth_failed",
        "/login?error=oauth_failed",
      ),
    );
  }

  // Tạo mã tạm ngắn hạn, dùng 1 lần
  const code = crypto.randomBytes(32).toString("hex");
  addAuthCode(code, {
    user: req.user,
    expiresAt: Date.now() + 60 * 1000, // 60 giây
    used: false,
  });

  // Chỉ truyền code qua URL — không có token
  res.redirect(
    buildFrontendUrl(
      `/pages/oauth-callback.html?code=${code}`,
      `/oauth-callback?code=${code}`,
    ),
  );
}

/**
 * POST /api/auth/oauth/exchange
 * Frontend gửi auth code → nhận token qua JSON (không qua URL)
 */
router.post("/oauth/exchange", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Thiếu auth code" });

    const entry = authCodes.get(code);
    if (!entry || entry.used || Date.now() > entry.expiresAt) {
      authCodes.delete(code);
      return res
        .status(401)
        .json({ message: "Auth code không hợp lệ hoặc đã hết hạn" });
    }

    // Đánh dấu đã dùng → không thể reuse
    entry.used = true;
    authCodes.delete(code);

    const user = entry.user;
    const { accessToken, refreshToken, expiresIn } =
      TokenService.generate(user);

    // Lưu refresh token vào DB
    await RefreshTokenModel.save({
      token: refreshToken,
      userId: user.id,
      expiresAt: TokenService.getRefreshExpiry(),
      userAgent: req.headers["user-agent"],
      ipAddress:
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress ||
        null,
    });

    // Gửi refresh token qua httpOnly cookie (giống auth controller)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
      path: "/api",
    });

    res.json({
      token: accessToken,
      expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hsk_level: user.hsk_level || 1,
        xp: user.xp || 0,
        streak: user.streak || 0,
        plan: user.plan || "free",
        plan_expiry: user.plan_expiry || null,
      },
    });
  } catch (err) {
    console.error("[OAuth] Exchange error:", err.message);
    res.status(500).json({ message: "Lỗi đổi auth code" });
  }
});

// Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get("/google/callback", oauthCallback("google", "google_failed"));

// Facebook
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] }),
);
router.get("/facebook/callback", oauthCallback("facebook", "fb_failed"));

module.exports = router;
