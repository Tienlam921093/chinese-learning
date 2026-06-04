require("dotenv").config();
const { validateEnv } = require("./config/env");
validateEnv();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("./config/passport");
const {
  notFoundHandler,
  globalErrorHandler,
} = require("./middleware/error.middleware");

const app = express();

// Tu day tro xuong la pipeline middleware cua Express: security -> parser -> session -> limiter -> routes.

// App chạy sau nginx reverse proxy (docker compose) nên cần trust proxy
// để req.ip và express-rate-limit xử lý đúng X-Forwarded-For.
app.set("trust proxy", 1);

// ── Helmet — HTTP Security Headers ──
app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "cdn.jsdelivr.net",
          "cdnjs.cloudflare.com",
          "fonts.googleapis.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "cdn.jsdelivr.net",
          "cdnjs.cloudflare.com",
          "fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
        // FIX N9: Chỉ cho phép localhost trong development
        connectSrc: [
          "'self'",
          process.env.NODE_ENV !== "production" && "http://localhost:5000",
          process.env.PUBLIC_URL,
        ].filter(Boolean),
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// FIX A6: CORS — chỉ cho phép localhost trong development
const corsOrigins = [process.env.FRONTEND_URL].filter(Boolean);
if (process.env.NODE_ENV !== "production") {
  corsOrigins.push(
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
  );
}
app.use(
  cors({
    origin: corsOrigins,
    credentials: true, // Cần để gửi cookie
  }),
);

app.use(cookieParser()); // Đọc httpOnly cookie

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Session — Chỉ dùng cho OAuth redirect flow ──
// FIX M1: MemoryStore chấp nhận được vì session chỉ tồn tại ~60 giây cho OAuth
// Nếu scale nhiều instance → chuyển sang connect-mssql-v2 hoặc connect-redis
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      // FIX: Phải dùng "lax" (không phải "strict") để session cookie
      // được gửi khi Google/Facebook redirect về callback URL.
      // "strict" chặn cookie trong cross-site redirect → Passport mất session
      // → deserializeUser thất bại → OAuth flow bị lỗi.
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 phút — session chỉ dùng cho OAuth flow
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// ── Rate Limiting ──
// FIX H3: Rate limiter riêng phải đặt TRƯỚC rate limiter chung
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Quá nhiều lần thử đăng nhập. Thử lại sau 15 phút." },
  }),
);
app.use(
  "/api/auth/forgot-password",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Quá nhiều yêu cầu. Thử lại sau 1 giờ." },
  }),
);
app.use(
  "/api/chatbot",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ── Routes ──
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/auth", require("./routes/oauth.routes"));
app.use("/api/lessons", require("./routes/lesson.routes"));
app.use("/api/vocabulary", require("./routes/vocabulary.routes"));
app.use("/api/chatbot", require("./routes/chatbot.routes"));
app.use("/api/progress", require("./routes/progress.routes"));
app.use("/api/payment", require("./routes/payment.routes"));
app.use("/api/quiz", require("./routes/quiz.routes"));
app.use("/api/live-classes", require("./routes/liveClass.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", version: "2.1.0" }),
);

// ── Global 404 + error handler ──
app.use(notFoundHandler);
app.use(globalErrorHandler);

const { getPool, query } = require("./config/db");
const { RefreshTokenModel } = require("./models/refreshToken.model");

async function ensureSchema() {
  // Dam bao cac cot/index moi ton tai khi app start, huu ich khi deploy len DB cu.
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await query(
        `IF COL_LENGTH('dbo.Users', 'oauth_display_name') IS NULL
         BEGIN
           ALTER TABLE dbo.Users ADD oauth_display_name NVARCHAR(100) NULL;
         END`,
        {},
      );
      // FIX: KHÔNG xóa unique constraint trên email.
      // Thay vào đó dùng filtered unique index: chỉ enforce unique
      // cho password accounts (password_hash NOT NULL và không phải OAUTH_NO_PASSWORD).
      // OAuth accounts được phép có email trùng với password account
      // vì chúng được phân biệt bằng oauth_provider + oauth_provider_id.
      await query(
        `IF NOT EXISTS (
           SELECT 1 FROM sys.indexes
           WHERE name = 'UQ_Users_email_password' AND object_id = OBJECT_ID('dbo.Users')
         )
         BEGIN
           CREATE UNIQUE INDEX UQ_Users_email_password
           ON dbo.Users (email)
           WHERE password_hash IS NOT NULL AND password_hash <> 'OAUTH_NO_PASSWORD';
         END`,
        {},
      );
      // Đảm bảo oauth_provider_id có index để findOrCreateOAuth nhanh
      await query(
        `IF NOT EXISTS (
           SELECT 1 FROM sys.indexes
           WHERE name = 'IX_Users_oauth' AND object_id = OBJECT_ID('dbo.Users')
         )
         BEGIN
           CREATE INDEX IX_Users_oauth ON dbo.Users (oauth_provider, oauth_provider_id)
           WHERE oauth_provider IS NOT NULL;
         END`,
        {},
      );
      await query(
        `IF COL_LENGTH('dbo.QuizResults', 'quiz_type') IS NULL
         BEGIN
           ALTER TABLE dbo.QuizResults ADD quiz_type NVARCHAR(20) NULL;
         END
         IF COL_LENGTH('dbo.QuizResults', 'xp_awarded') IS NULL
         BEGIN
           ALTER TABLE dbo.QuizResults ADD xp_awarded INT NOT NULL CONSTRAINT DF_QuizResults_xp_awarded DEFAULT 0;
         END
         IF COL_LENGTH('dbo.QuizResults', 'attempt_key') IS NULL
         BEGIN
           ALTER TABLE dbo.QuizResults ADD attempt_key VARCHAR(128) NULL;
         END`,
        {},
      );
      await query(
        `IF NOT EXISTS (
           SELECT 1 FROM sys.indexes
           WHERE name = 'UX_QuizResults_attempt_key' AND object_id = OBJECT_ID('dbo.QuizResults')
         )
         BEGIN
           CREATE UNIQUE INDEX UX_QuizResults_attempt_key
           ON dbo.QuizResults (attempt_key)
           WHERE attempt_key IS NOT NULL;
         END`,
        {},
      );
      await query(
        `IF OBJECT_ID('dbo.LiveClasses', 'U') IS NULL
         BEGIN
           CREATE TABLE dbo.LiveClasses (
             id INT IDENTITY(1,1) PRIMARY KEY,
             teacher_id INT NOT NULL REFERENCES dbo.Users(id),
             title NVARCHAR(160) NOT NULL,
             description NVARCHAR(1000) NULL,
             hsk_level TINYINT NOT NULL,
             starts_at DATETIME NOT NULL,
             ends_at DATETIME NOT NULL,
             meeting_url NVARCHAR(500) NOT NULL,
             meeting_platform NVARCHAR(20) NOT NULL DEFAULT 'other',
             capacity INT NOT NULL DEFAULT 30,
             status NVARCHAR(20) NOT NULL DEFAULT 'scheduled',
             created_at DATETIME NOT NULL DEFAULT GETDATE(),
             updated_at DATETIME NOT NULL DEFAULT GETDATE(),
             CONSTRAINT CK_LiveClasses_hsk CHECK (hsk_level BETWEEN 1 AND 6),
             CONSTRAINT CK_LiveClasses_capacity CHECK (capacity BETWEEN 1 AND 500),
             CONSTRAINT CK_LiveClasses_status CHECK (status IN ('scheduled', 'cancelled', 'completed'))
           );
         END
         IF OBJECT_ID('dbo.LiveClassEnrollments', 'U') IS NULL
         BEGIN
           CREATE TABLE dbo.LiveClassEnrollments (
             id INT IDENTITY(1,1) PRIMARY KEY,
             class_id INT NOT NULL REFERENCES dbo.LiveClasses(id) ON DELETE CASCADE,
             user_id INT NOT NULL REFERENCES dbo.Users(id) ON DELETE CASCADE,
             status NVARCHAR(20) NOT NULL DEFAULT 'enrolled',
             created_at DATETIME NOT NULL DEFAULT GETDATE(),
             updated_at DATETIME NOT NULL DEFAULT GETDATE(),
             CONSTRAINT UQ_LiveClassEnrollments_user UNIQUE (class_id, user_id),
             CONSTRAINT CK_LiveClassEnrollments_status CHECK (status IN ('enrolled', 'cancelled'))
           );
         END`,
        {},
      );
      await query(
        `IF NOT EXISTS (
           SELECT 1 FROM sys.indexes
           WHERE name = 'IX_LiveClasses_starts_at' AND object_id = OBJECT_ID('dbo.LiveClasses')
         )
         BEGIN
           CREATE INDEX IX_LiveClasses_starts_at ON dbo.LiveClasses(status, starts_at);
         END
         IF NOT EXISTS (
           SELECT 1 FROM sys.indexes
           WHERE name = 'IX_LiveClassEnrollments_user' AND object_id = OBJECT_ID('dbo.LiveClassEnrollments')
         )
         BEGIN
           CREATE INDEX IX_LiveClassEnrollments_user ON dbo.LiveClassEnrollments(user_id, status);
         END`,
        {},
      );
      console.log(
        "[DB] Schema check complete for oauth, quiz anti-farm, live classes",
      );
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.warn("[DB] Schema check failed:", err.message);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// FIX L5: Dọn refresh tokens hết hạn mỗi 6 giờ
setInterval(
  async () => {
    // Cleanup dinh ky giup bang RefreshTokens khong phinh to vi token het han.
    try {
      await RefreshTokenModel.cleanup();
      console.log("[CLEANUP] ✅ Đã dọn refresh tokens hết hạn");
    } catch (e) {
      console.warn("[CLEANUP] ⚠️ Lỗi dọn tokens:", e.message);
    }
  },
  6 * 60 * 60 * 1000,
);

const PORT = process.env.PORT || 5000;
let server;

(async () => {
  // Start sequence: kiem tra schema truoc, sau do moi listen HTTP port.
  await ensureSchema();
  server = app.listen(PORT, () =>
    console.log(`[SERVER] ✅ HánYǔ API v2.1 chạy tại port ${PORT}`),
  );
})().catch((err) => {
  console.error("[SERVER] ❌ Failed to start:", err.message);
  process.exit(1);
});

// FIX L4: Graceful shutdown — đóng DB pool và HTTP server khi Docker stop
function gracefulShutdown(signal) {
  console.log(`[SERVER] ${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      const pool = await getPool();
      await pool.close();
      console.log("[DB] Pool closed");
    } catch {}
    process.exit(0);
  });
  // Force shutdown sau 10 giây nếu server không đóng được
  setTimeout(() => {
    process.exit(1);
  }, 10000);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
