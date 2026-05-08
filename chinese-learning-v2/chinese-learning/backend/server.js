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
      sameSite: "strict",
      maxAge: 10 * 60 * 1000, // 10 phút (giảm từ 24h — session chỉ cho OAuth)
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

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", version: "2.1.0" }),
);

// ── Global 404 + error handler ──
app.use(notFoundHandler);
app.use(globalErrorHandler);

const { getPool } = require("./config/db");
const { RefreshTokenModel } = require("./models/refreshToken.model");

// FIX L5: Dọn refresh tokens hết hạn mỗi 6 giờ
setInterval(
  async () => {
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
const server = app.listen(PORT, () =>
  console.log(`[SERVER] ✅ HánYǔ API v2.1 chạy tại port ${PORT}`),
);

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
