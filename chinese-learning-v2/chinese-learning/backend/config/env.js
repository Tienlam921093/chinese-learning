/**
 * ENV CONFIG
 * Hỗ trợ 2 môi trường:
 *   DEV:  đọc từ secrets/backend.env (docker env_file)
 *   PROD: đọc từ secret files trên server (docker swarm / k8s)
 *
 * Ưu tiên: SECRET_FILE > ENV_VAR
 */
const fs = require("fs");

/**
 * Đọc secret từ file (production) hoặc env var (development)
 * @param {string} key - Tên env var
 * @param {boolean} required - Ném lỗi nếu không tìm thấy
 */
function readSecret(key, required = false) {
  // Thử đọc từ file trước (Docker Swarm / Kubernetes)
  const fileKey = key + "_FILE";
  if (process.env[fileKey]) {
    try {
      const val = fs.readFileSync(process.env[fileKey], "utf8").trim();
      if (val) return val;
    } catch (e) {
      console.warn(
        `[ENV] Không đọc được secret file ${process.env[fileKey]}: ${e.message}`,
      );
    }
  }

  // Fallback: đọc từ env var (dev với docker env_file)
  const val = process.env[key];
  if (!val && required) {
    throw new Error(
      `[ENV] ❌ Thiếu biến bắt buộc: ${key}\n` +
        `      Hãy thêm vào secrets/backend.env rồi restart Docker.`,
    );
  }
  return val || null;
}

// ── Validate khi khởi động ──
function validateEnv() {
  const REQUIRED = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "DB_PASSWORD",
    "SESSION_SECRET",
  ];
  const missing = REQUIRED.filter((k) => !readSecret(k));
  if (missing.length > 0) {
    throw new Error(
      `[ENV] ❌ Thiếu biến bắt buộc: ${missing.join(", ")}\n` +
        `      Kiểm tra file secrets/backend.env`,
    );
  }

  // Cảnh báo secret yếu
  const WEAK = [
    "hanyu-super-secret",
    "hanyu-refresh-secret",
    "hanyu-session-secret",
    "change_this",
    "your_key_here",
    "paste_",
  ];
  [readSecret("JWT_SECRET"), readSecret("SESSION_SECRET")]
    .filter(Boolean)
    .forEach((val) => {
      if (WEAK.some((w) => val.includes(w))) {
        console.warn(
          "[ENV] ⚠️  Phát hiện secret yếu — đổi trước khi deploy production!",
        );
      }
    });

  console.log("[ENV] ✅ Tất cả biến môi trường hợp lệ");
}

// ── Export config ──
module.exports = {
  validateEnv,

  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database
  DB_SERVER: process.env.DB_SERVER || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT) || 1433,
  DB_NAME: process.env.DB_NAME || "HanYuDB",
  DB_USER: readSecret("DB_USER") || "sa",
  DB_PASSWORD: readSecret("DB_PASSWORD", true),

  // JWT
  JWT_SECRET: readSecret("JWT_SECRET", true),
  JWT_REFRESH_SECRET: readSecret("JWT_REFRESH_SECRET", true),
  JWT_EXPIRES: process.env.JWT_EXPIRES || "15m",
  JWT_EXPIRES_SECONDS: parseInt(process.env.JWT_EXPIRES_SECONDS) || 900,

  // Session
  SESSION_SECRET: readSecret("SESSION_SECRET", true),

  // URLs
  BASE_URL: process.env.BASE_URL || "http://localhost:5000",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:8080",
  PUBLIC_URL:
    process.env.PUBLIC_URL || process.env.BASE_URL || "http://localhost:5000",
  PAYMENT_ENVIRONMENT:
    process.env.PAYMENT_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "sandbox"),

  // AI
  AI_PROVIDER: process.env.AI_PROVIDER || "openai",
  OPENAI_API_KEY: readSecret("OPENAI_API_KEY"),
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  ANTHROPIC_API_KEY: readSecret("ANTHROPIC_API_KEY"),

  // OAuth
  GOOGLE_CLIENT_ID: readSecret("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: readSecret("GOOGLE_CLIENT_SECRET"),
  FACEBOOK_APP_ID: readSecret("FACEBOOK_APP_ID"),
  FACEBOOK_APP_SECRET: readSecret("FACEBOOK_APP_SECRET"),

  // VNPay
  VNPAY_TMN_CODE: readSecret("VNPAY_TMN_CODE"),
  VNPAY_HASH_SECRET: readSecret("VNPAY_HASH_SECRET"),
  VNPAY_URL:
    process.env.VNPAY_URL ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",

  // MoMo
  MOMO_PARTNER_CODE: readSecret("MOMO_PARTNER_CODE"),
  MOMO_ACCESS_KEY: readSecret("MOMO_ACCESS_KEY"),
  MOMO_SECRET_KEY: readSecret("MOMO_SECRET_KEY"),
  MOMO_API_URL:
    process.env.MOMO_API_URL ||
    "https://test-payment.momo.vn/v2/gateway/api/create",

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: readSecret("SMTP_USER"),
  SMTP_PASS: readSecret("SMTP_PASS"),
};
