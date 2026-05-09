/**
 * OAUTH ROUTES â€” Google + Facebook
 * DÃ¹ng auth code táº¡m thay vÃ¬ truyá»n token qua URL (báº£o máº­t hÆ¡n)
 */
const router = require("express").Router();
const crypto = require("crypto");
const passport = require("../config/passport");
const env = require("../config/env");
const TokenService = require("../services/token.service");
const { RefreshTokenModel } = require("../models/refreshToken.model");
const { buildFrontendUrl } = require("../utils/frontend-url.utils");

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 15 * 60 * 1000,
  path: "/",
};

function clearLegacyAuthCookies(res) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.clearCookie("accessToken", { path: "/api" });
}

// In-memory store cho auth codes â€” TTL 60 giÃ¢y
// FIX C2: Giá»›i háº¡n kÃ­ch thÆ°á»›c Map chá»‘ng memory leak
const authCodes = new Map();
const AUTH_CODES_MAX = 1000;

function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [code, data] of authCodes) {
    if (now > data.expiresAt || data.used) authCodes.delete(code);
  }
}

function addAuthCode(code, data) {
  // Cleanup trÆ°á»›c náº¿u vÆ°á»£t ngÆ°á»¡ng
  if (authCodes.size >= AUTH_CODES_MAX) {
    cleanupExpiredCodes();
    // Náº¿u váº«n quÃ¡ lá»›n â†’ xÃ³a entries cÅ© nháº¥t
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

// Dá»n má»—i 2 phÃºt (tÄƒng táº§n suáº¥t)
setInterval(cleanupExpiredCodes, 2 * 60 * 1000);

function logOAuthFailure(provider, err, req) {
  const oauthError = err?.oauthError || err?.cause || null;
  const details = {
    message: err?.message || "Unknown OAuth error",
    name: err?.name || null,
    stack: err?.stack || null,
    oauthErrorMessage: oauthError?.message || null,
    oauthErrorStatus: oauthError?.statusCode || oauthError?.status || null,
    // passport/facebook may put response body on different properties
    oauthErrorBody: oauthError?.data || oauthError?.body || oauthError || null,
    callbackUrl: `${env.BASE_URL}/api/auth/${provider}/callback`,
    originalUrl: req?.originalUrl,
  };

  try {
    console.error(
      `[OAuth] ${provider} callback failed — details:`,
      JSON.stringify(details, null, 2),
    );
    const util = require("util");
    console.error(
      `[OAuth] ${provider} raw error inspect:`,
      util.inspect(err, { depth: 6 }),
    );
  } catch (e) {
    const util = require("util");
    console.error(
      `[OAuth] ${provider} callback failed (inspect):`,
      util.inspect(err, { depth: 4 }),
    );
  }
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
 * Táº¡o auth code táº¡m (60 giÃ¢y), redirect frontend kÃ¨m code thay vÃ¬ token
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

  // Táº¡o mÃ£ táº¡m ngáº¯n háº¡n, dÃ¹ng 1 láº§n
  const code = crypto.randomBytes(32).toString("hex");
  addAuthCode(code, {
    user: req.user,
    expiresAt: Date.now() + 60 * 1000, // 60 giÃ¢y
    used: false,
  });

  // Chá»‰ truyá»n code qua URL â€” khÃ´ng cÃ³ token
  res.redirect(
    buildFrontendUrl(
      `/pages/oauth-callback.html?code=${code}`,
      `/oauth-callback?code=${code}`,
    ),
  );
}

/**
 * POST /api/auth/oauth/exchange
 * Frontend gá»­i auth code â†’ nháº­n token qua JSON (khÃ´ng qua URL)
 */
router.post("/oauth/exchange", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Thiáº¿u auth code" });

    const entry = authCodes.get(code);
    if (!entry || entry.used || Date.now() > entry.expiresAt) {
      authCodes.delete(code);
      return res.status(401).json({
        message: "Auth code khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n",
      });
    }

    // ÄÃ¡nh dáº¥u Ä‘Ã£ dÃ¹ng â†’ khÃ´ng thá»ƒ reuse
    entry.used = true;
    authCodes.delete(code);

    const user = entry.user;
    const { accessToken, refreshToken, expiresIn } = TokenService.generate({
      ...user,
      auth_source: "oauth",
    });

    // LÆ°u refresh token vÃ o DB
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

    // Dá»n cookie legacy path Ä‘á»ƒ trÃ¡nh tá»“n táº¡i 2 refreshToken cÃ¹ng tÃªn.
    clearLegacyAuthCookies(res);

    // DÃ¹ng cÃ¹ng cookie options vá»›i auth controller Ä‘á»ƒ session nháº¥t quÃ¡n.
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
    res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTS);

    // FIX: Trả về đúng display name (oauth_display_name nếu user đã tự đặt tên,
    // fallback về name từ provider). Luôn bao gồm oauth_provider để frontend
    // biết đây là OAuth account.
    const displayName = user.oauth_display_name || user.name || "";

    res.json({
      token: accessToken,
      expiresIn,
      user: {
        id: user.id,
        name: displayName,
        email: user.email,
        role: user.role,
        oauth_provider: user.oauth_provider || null,
        auth_source: "oauth",
        hsk_level: user.hsk_level || 1,
        xp: user.xp || 0,
        streak: user.streak || 0,
        plan: user.plan || "free",
        plan_expiry: user.plan_expiry || null,
      },
    });
  } catch (err) {
    console.error("[OAuth] Exchange error:", err.message);
    res.status(500).json({ message: "Lá»—i Ä‘á»•i auth code" });
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
