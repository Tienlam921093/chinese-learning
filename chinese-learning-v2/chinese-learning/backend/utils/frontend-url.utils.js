function useNextFrontend() {
  return process.env.NEXT_FRONTEND_ENABLED === "true";
}

function frontendBase() {
  if (useNextFrontend()) {
    return process.env.NEXT_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  }
  return process.env.FRONTEND_URL || "http://localhost:8080";
}

function buildFrontendUrl(pathLegacy, pathNext) {
  const base = frontendBase().replace(/\/$/, "");
  const path = useNextFrontend() ? pathNext : pathLegacy;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

module.exports = { useNextFrontend, frontendBase, buildFrontendUrl };
