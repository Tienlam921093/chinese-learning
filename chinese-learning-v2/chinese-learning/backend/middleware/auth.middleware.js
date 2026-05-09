/**
 * AUTH MIDDLEWARE — JWT + token_version check
 *
 * token_version giải quyết:
 * - Đổi mật khẩu → kick tất cả phiên cũ ngay lập tức
 * - 2 thiết bị cùng đăng nhập → đều bị kick sau khi đổi mật khẩu
 */
const TokenService = require("../services/token.service");
const { sql, query } = require("../config/db");

async function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;
  const token = bearerToken || req.cookies?.accessToken;
  if (!token)
    return res
      .status(401)
      .json({ message: "Không có token xác thực. Vui lòng đăng nhập." });
  try {
    const decoded = TokenService.verifyAccess(token);

    // ── Check token_version ──
    // Nếu user đổi mật khẩu → token_version trong DB tăng lên
    // → Token cũ có version thấp hơn → bị reject ngay
    const r = await query(
      `SELECT token_version, is_active FROM Users WHERE id=@id`,
      { id: { type: sql.Int, value: decoded.id } },
    );
    const dbUser = r.recordset[0];

    if (!dbUser || !dbUser.is_active)
      return res
        .status(401)
        .json({ message: "Tài khoản không tồn tại hoặc đã bị vô hiệu hoá." });

    if (dbUser.token_version !== decoded.token_version)
      return res.status(401).json({
        message:
          "Phiên đăng nhập đã hết hạn do mật khẩu thay đổi. Vui lòng đăng nhập lại.",
        code: "TOKEN_VERSION_MISMATCH",
        should_logout: true, // Frontend dùng flag này để tự động logout
      });

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res
        .status(401)
        .json({ message: "Token đã hết hạn.", code: "TOKEN_EXPIRED" });
    return res
      .status(401)
      .json({ message: "Token không hợp lệ.", code: "TOKEN_INVALID" });
  }
}

// Tuỳ chọn — không bắt buộc auth nhưng decode nếu có token
async function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;
  const token = bearerToken || req.cookies?.accessToken;
  if (token) {
    try {
      const decoded = TokenService.verifyAccess(token);
      const r = await query(`SELECT token_version FROM Users WHERE id=@id`, {
        id: { type: sql.Int, value: decoded.id },
      });
      const dbUser = r.recordset[0];
      if (dbUser && dbUser.token_version === decoded.token_version) {
        req.user = decoded;
      }
    } catch {}
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Chưa xác thực" });
    if (!roles.includes(req.user.role))
      return res
        .status(403)
        .json({ message: "Không có quyền thực hiện thao tác này" });
    next();
  };
}

module.exports = { authenticate, optionalAuth, requireRole };
