const ALLOWED_IMPORT_TYPES = new Set(["vocabulary"]);

function cleanString(value, maxLength) {
  const text = String(value || "").trim();
  if (!maxLength) return text;
  return text.slice(0, maxLength);
}

function parsePositiveInt(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseHskLevel(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : null;
}

function normalizePaging(query = {}) {
  const limit = Math.min(parsePositiveInt(query.limit, 50), 200);
  const offset = Math.max(Number.parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}

function validateLessonPayload(payload = {}) {
  const errors = [];
  const title = cleanString(payload.title, 200);
  const hskLevel = parseHskLevel(payload.hsk_level);
  const orderIndex = Number.parseInt(payload.order_index, 10);
  const wordCount = Number.parseInt(payload.word_count, 10);
  const durationMinutes = Number.parseInt(payload.duration_minutes, 10);

  if (!title) errors.push("title is required");
  if (!hskLevel) errors.push("hsk_level must be between 1 and 6");
  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    errors.push("order_index must be a non-negative integer");
  }
  if (!Number.isInteger(wordCount) || wordCount < 0) {
    errors.push("word_count must be a non-negative integer");
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    errors.push("duration_minutes must be a positive integer");
  }

  return {
    valid: errors.length === 0,
    errors,
    value: {
      hsk_level: hskLevel,
      title,
      description: cleanString(payload.description, 500) || null,
      content: payload.content ? JSON.stringify(payload.content) : null,
      emoji: cleanString(payload.emoji, 50) || null,
      word_count: Number.isInteger(wordCount) && wordCount >= 0 ? wordCount : 0,
      duration_minutes:
        Number.isInteger(durationMinutes) && durationMinutes > 0 ? durationMinutes : 15,
      order_index: Number.isInteger(orderIndex) && orderIndex >= 0 ? orderIndex : 0,
      is_published: payload.is_published === undefined ? true : Boolean(payload.is_published),
    },
  };
}

function validateVocabularyPayload(payload = {}) {
  const errors = [];
  const hanzi = cleanString(payload.hanzi, 50);
  const pinyin = cleanString(payload.pinyin, 100);
  const meaning = cleanString(payload.meaning, 300);
  const hskLevel = parseHskLevel(payload.hsk_level);
  const lessonId = payload.lesson_id ? parsePositiveInt(payload.lesson_id) : null;
  const tone = payload.tone === undefined || payload.tone === null || payload.tone === ""
    ? null
    : Number.parseInt(payload.tone, 10);

  if (!hanzi) errors.push("hanzi is required");
  if (!pinyin) errors.push("pinyin is required");
  if (!meaning) errors.push("meaning is required");
  if (!hskLevel) errors.push("hsk_level must be between 1 and 6");
  if (tone !== null && (!Number.isInteger(tone) || tone < 0 || tone > 4)) {
    errors.push("tone must be between 0 and 4");
  }

  return {
    valid: errors.length === 0,
    errors,
    value: {
      lesson_id: lessonId,
      hsk_level: hskLevel,
      hanzi,
      pinyin,
      meaning,
      meaning_en: cleanString(payload.meaning_en, 300) || null,
      example: cleanString(payload.example, 500) || null,
      example_pinyin: cleanString(payload.example_pinyin, 500) || null,
      example_meaning: cleanString(payload.example_meaning, 500) || null,
      audio_url: cleanString(payload.audio_url, 500) || null,
      tone,
      category: cleanString(payload.category, 50) || null,
    },
  };
}

function validateVocabularyImport(payload = {}) {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const errors = [];
  const validRows = [];

  if (payload.type && !ALLOWED_IMPORT_TYPES.has(payload.type)) {
    errors.push("type must be vocabulary");
  }
  if (rows.length === 0) {
    errors.push("rows must contain at least one vocabulary item");
  }
  if (rows.length > 500) {
    errors.push("rows cannot contain more than 500 items");
  }

  rows.forEach((row, index) => {
    const result = validateVocabularyPayload(row);
    if (!result.valid) {
      result.errors.forEach((error) => errors.push(`rows[${index}].${error}`));
      return;
    }
    validRows.push(result.value);
  });

  return {
    valid: errors.length === 0,
    errors,
    value: {
      type: "vocabulary",
      source: cleanString(payload.source, 100) || "admin",
      dry_run: Boolean(payload.dry_run),
      rows: validRows,
    },
  };
}

module.exports = {
  normalizePaging,
  parseHskLevel,
  validateLessonPayload,
  validateVocabularyImport,
  validateVocabularyPayload,
};
