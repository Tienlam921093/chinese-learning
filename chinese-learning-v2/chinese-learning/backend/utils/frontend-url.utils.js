function useNextFrontend() {
  // Chỉ bật Next frontend khi biến môi trường đúng bằng chuỗi "true".
  return process.env.NEXT_FRONTEND_ENABLED === "true";
}

function frontendBase() {
  // Nếu dùng Next frontend, ưu tiên NEXT_FRONTEND_URL trước FRONTEND_URL.
  if (useNextFrontend()) {
    return process.env.NEXT_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  }
  // Nếu dùng frontend legacy, ưu tiên FRONTEND_URL rồi fallback về localhost:8080.
  return process.env.FRONTEND_URL || "http://localhost:8080";
}

function buildFrontendUrl(pathLegacy, pathNext) {
  // Lấy base URL và bỏ dấu "/" cuối để tránh tạo URL bị hai dấu slash.
  const base = frontendBase().replace(/\/$/, "");
  // Chọn path theo loại frontend đang được bật.
  const path = useNextFrontend() ? pathNext : pathLegacy;
  // Ghép base với path; tự thêm "/" nếu path chưa có.
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

// Export các helper để code backend build link frontend nhất quán.
module.exports = { useNextFrontend, frontendBase, buildFrontendUrl };
