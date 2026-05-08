/**
 * EMAIL SERVICE — Nodemailer
 * Hỗ trợ Gmail, SMTP tuỳ chỉnh
 */
const nodemailer = require("nodemailer");
const { buildFrontendUrl } = require("../utils/frontend-url.utils");

function isPlaceholder(value) {
  if (!value) return true;
  const normalized = String(value).trim().toLowerCase();
  return [
    "your_email@gmail.com",
    "your_gmail_app_password",
    "your_smtp_host",
    "your_smtp_user",
    "your_smtp_pass",
    "change_me",
    "replace_me",
    "example",
  ].some((placeholder) => normalized.includes(placeholder));
}

function ensureSmtpConfig() {
  const missing = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!process.env.SMTP_USER) missing.push("SMTP_USER");
  if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
  if (missing.length) {
    throw new Error(
      `Thiếu cấu hình email trong backend.env: ${missing.join(", ")}`,
    );
  }

  const placeholderFields = [];
  if (isPlaceholder(process.env.SMTP_HOST)) placeholderFields.push("SMTP_HOST");
  if (isPlaceholder(process.env.SMTP_USER)) placeholderFields.push("SMTP_USER");
  if (isPlaceholder(process.env.SMTP_PASS)) placeholderFields.push("SMTP_PASS");
  if (placeholderFields.length) {
    throw new Error(
      `Cấu hình email đang dùng giá trị placeholder: ${placeholderFields.join(", ")}`,
    );
  }
}

function createTransport() {
  ensureSmtpConfig();

  // Gmail
  if (
    process.env.SMTP_HOST === "smtp.gmail.com" ||
    process.env.EMAIL_PROVIDER === "gmail"
  ) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // App Password — không phải mật khẩu Gmail
      },
    });
  }

  // SMTP tuỳ chỉnh (Mailgun, SendGrid, v.v.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const EmailService = {
  async sendPasswordReset({ to, name, resetToken }) {
    const resetUrl = buildFrontendUrl(
      `/pages/reset-password.html?token=${resetToken}`,
      `/reset-password?token=${resetToken}`,
    );

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/></head>
<body style="font-family:'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:2rem">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#0f172a;padding:2rem;text-align:center">
      <span style="font-size:2.5rem;font-weight:900;color:#dc2626">漢</span>
      <span style="font-size:1.25rem;font-weight:700;color:#fff;margin-left:.5rem">HánYǔ</span>
    </div>
    <div style="padding:2rem">
      <h2 style="color:#0f172a;margin-top:0">Đặt lại mật khẩu</h2>
      <p style="color:#475569">Xin chào <strong>${name}</strong>,</p>
      <p style="color:#475569">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tiếp tục:</p>
      <div style="text-align:center;margin:2rem 0">
        <a href="${resetUrl}"
           style="background:#dc2626;color:#fff;text-decoration:none;padding:.85rem 2rem;border-radius:10px;font-weight:700;display:inline-block">
          🔑 Đặt lại mật khẩu
        </a>
      </div>
      <p style="color:#94a3b8;font-size:.85rem">
        Link có hiệu lực trong <strong>15 phút</strong>.<br/>
        Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0"/>
      <p style="color:#94a3b8;font-size:.8rem;text-align:center">
        Nếu nút không hoạt động, copy link này:<br/>
        <a href="${resetUrl}" style="color:#dc2626;word-break:break-all">${resetUrl}</a>
      </p>
    </div>
    <div style="background:#f8fafc;padding:1rem;text-align:center">
      <p style="color:#94a3b8;font-size:.75rem;margin:0">© 2024 HánYǔ — Học tiếng Trung hiệu quả</p>
    </div>
  </div>
</body>
</html>`;

    const transport = createTransport();
    await transport.sendMail({
      from: `"HánYǔ" <${process.env.SMTP_USER}>`,
      to,
      subject: "🔑 Đặt lại mật khẩu HánYǔ",
      html,
      text: `Đặt lại mật khẩu: ${resetUrl} (hiệu lực 15 phút)`,
    });
  },

  async sendPasswordChanged({ to, name }) {
    const transport = createTransport();
    await transport.sendMail({
      from: `"HánYǔ" <${process.env.SMTP_USER}>`,
      to,
      subject: "✅ Mật khẩu HánYǔ đã được thay đổi",
      html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:2rem">
  <h2>Mật khẩu đã được thay đổi</h2>
  <p>Xin chào <strong>${name}</strong>,</p>
  <p>Mật khẩu tài khoản HánYǔ của bạn vừa được thay đổi thành công.</p>
  <p>Tất cả các phiên đăng nhập cũ đã bị vô hiệu hoá.</p>
  <p style="color:#dc2626"><strong>Nếu không phải bạn thực hiện, hãy liên hệ ngay với chúng tôi!</strong></p>
</div>`,
    });
  },
};

module.exports = EmailService;
