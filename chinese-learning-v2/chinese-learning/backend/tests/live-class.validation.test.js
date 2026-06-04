"use strict";

const assert = require("assert");
const {
  validateLiveClassInput,
  normalizeMeetingUrl,
  normalizePlatform,
} = require("../utils/live-class.utils");

function run() {
  const now = Date.now();
  const valid = validateLiveClassInput({
    title: "HSK 1 conversation",
    description: "Practice speaking with a teacher",
    hsk_level: 1,
    starts_at: new Date(now + 60_000).toISOString(),
    ends_at: new Date(now + 3_600_000).toISOString(),
    meeting_url: "https://meet.google.com/abc-defg-hij",
    meeting_platform: "meet",
    capacity: 20,
  });

  assert.ok(valid.value, "valid input should pass");
  assert.strictEqual(valid.value.hskLevel, 1);
  assert.strictEqual(valid.value.capacity, 20);
  assert.strictEqual(valid.value.meetingPlatform, "meet");

  const badTitle = validateLiveClassInput({
    ...valid.value,
    title: "ab",
    hsk_level: 1,
    starts_at: valid.value.startsAt,
    ends_at: valid.value.endsAt,
    meeting_url: valid.value.meetingUrl,
  });
  assert.match(badTitle.error, /Ten lop/);

  const badUrl = validateLiveClassInput({
    title: "HSK 1 conversation",
    starts_at: new Date(now + 60_000).toISOString(),
    ends_at: new Date(now + 3_600_000).toISOString(),
    meeting_url: "javascript:alert(1)",
  });
  assert.match(badUrl.error, /URL/);

  const badTime = validateLiveClassInput({
    title: "HSK 1 conversation",
    starts_at: new Date(now + 3_600_000).toISOString(),
    ends_at: new Date(now + 60_000).toISOString(),
    meeting_url: "https://example.com/live",
  });
  assert.match(badTime.error, /ket thuc/);

  assert.strictEqual(normalizeMeetingUrl("https://example.com/a"), "https://example.com/a");
  assert.strictEqual(normalizeMeetingUrl("ftp://example.com/a"), null);
  assert.strictEqual(normalizePlatform("zoom"), "zoom");
  assert.strictEqual(normalizePlatform("unknown"), "other");
}

run();
console.log("Live class validation tests passed.");
