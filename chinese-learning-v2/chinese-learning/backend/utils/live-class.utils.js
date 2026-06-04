"use strict";

const ALLOWED_PLATFORMS = new Set(["meet", "zoom", "jitsi", "teams", "other"]);

function parsePositiveInt(value, fallback, min = 1, max = 500) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizePlatform(value) {
  const platform = String(value || "other").trim().toLowerCase();
  return ALLOWED_PLATFORMS.has(platform) ? platform : "other";
}

function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeMeetingUrl(value) {
  const url = String(value || "").trim();
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function validateLiveClassInput(input) {
  const title = normalizeText(input.title, 160);
  const description = normalizeText(input.description, 1000);
  const hskLevel = parsePositiveInt(input.hsk_level, 1, 1, 6);
  const startsAt = new Date(input.starts_at);
  const endsAt = new Date(input.ends_at);
  const meetingUrl = normalizeMeetingUrl(input.meeting_url);
  const meetingPlatform = normalizePlatform(input.meeting_platform);
  const capacity = parsePositiveInt(input.capacity, 30, 1, 500);

  if (title.length < 3) {
    return { error: "Ten lop phai co it nhat 3 ky tu" };
  }
  if (!meetingUrl) {
    return { error: "Link hoc phai la URL http/https hop le" };
  }
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Thoi gian lop hoc khong hop le" };
  }
  if (endsAt <= startsAt) {
    return { error: "Thoi gian ket thuc phai sau thoi gian bat dau" };
  }

  return {
    value: {
      title,
      description,
      hskLevel,
      startsAt,
      endsAt,
      meetingUrl,
      meetingPlatform,
      capacity,
    },
  };
}

module.exports = {
  validateLiveClassInput,
  normalizeMeetingUrl,
  normalizePlatform,
};
