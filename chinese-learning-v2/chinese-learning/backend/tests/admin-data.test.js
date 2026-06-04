// Import module assert co san cua Node.js de viet cac ky vong trong test.
const assert = require("node:assert");

// Lay cac ham xu ly/validate du lieu admin can kiem tra.
const {
  normalizePaging,
  parseHskLevel,
  validateLessonPayload,
  validateVocabularyImport,
  validateVocabularyPayload,
} = require("../utils/admin-data.utils");

// Gom toan bo test trong mot ham run de co the goi mot lan o cuoi file.
function run() {
  // HSK level dang number hop le thi giu nguyen.
  assert.strictEqual(parseHskLevel(1), 1);
  // HSK level dang string hop le thi duoc parse thanh number.
  assert.strictEqual(parseHskLevel("6"), 6);
  // HSK level ngoai khoang cho phep thi tra ve null.
  assert.strictEqual(parseHskLevel("7"), null);
  // limit qua lon bi cap o 200, offset am bi dua ve 0.
  assert.deepStrictEqual(normalizePaging({ limit: "999", offset: "-2" }), {
    limit: 200,
    offset: 0,
  });

  // Tao payload lesson hop le de kiem tra validateLessonPayload normalize dung.
  const lesson = validateLessonPayload({
    hsk_level: 2,
    title: "Shopping",
    word_count: 10,
    duration_minutes: 15,
    order_index: 7,
    is_published: false,
    content: { sections: [] },
  });
  // Payload hop le phai co valid = true.
  assert.strictEqual(lesson.valid, true);
  // Gia tri boolean false phai duoc giu nguyen, khong bi default thanh true.
  assert.strictEqual(lesson.value.is_published, false);
  // Object content phai duoc chuyen thanh JSON string truoc khi luu.
  assert.strictEqual(lesson.value.content, JSON.stringify({ sections: [] }));

  // Payload lesson sai: title rong va HSK level khong hop le.
  const badLesson = validateLessonPayload({ title: "", hsk_level: 9 });
  // Payload sai phai bi danh dau invalid.
  assert.strictEqual(badLesson.valid, false);
  // Danh sach loi phai noi ro title la bat buoc.
  assert.ok(badLesson.errors.includes("title is required"));

  // Tao payload vocabulary hop le.
  const vocab = validateVocabularyPayload({
    lesson_id: 1,
    hsk_level: 1,
    hanzi: "你好",
    pinyin: "ni hao",
    meaning: "Xin chao",
    tone: 3,
  });
  // Vocabulary hop le phai pass validation.
  assert.strictEqual(vocab.valid, true);
  // lesson_id sau validate van la number 1.
  assert.strictEqual(vocab.value.lesson_id, 1);

  // Vocabulary sai: HSK level bang 0 va hanzi rong.
  const badVocab = validateVocabularyPayload({ hsk_level: 0, hanzi: "" });
  // Payload sai phai invalid.
  assert.strictEqual(badVocab.valid, false);
  // Loi phai bao hanzi la bat buoc.
  assert.ok(badVocab.errors.includes("hanzi is required"));

  // Kiem tra import vocabulary o che do dry_run, tuc chi validate ma chua ghi DB.
  const dryRun = validateVocabularyImport({
    dry_run: true,
    source: "seed-review",
    rows: [
      {
        hsk_level: 1,
        hanzi: "谢谢",
        pinyin: "xie xie",
        meaning: "Cam on",
      },
    ],
  });
  // Import hop le phai valid.
  assert.strictEqual(dryRun.valid, true);
  // Co dry_run true thi ket qua normalize cung phai giu true.
  assert.strictEqual(dryRun.value.dry_run, true);
  // Chi co mot row duoc dua vao nen output cung co mot row.
  assert.strictEqual(dryRun.value.rows.length, 1);

  // Import sai: row thieu nhieu field bat buoc nhu hsk_level/pinyin/meaning.
  const badImport = validateVocabularyImport({ rows: [{ hanzi: "一" }] });
  // Ket qua import sai phai invalid.
  assert.strictEqual(badImport.valid, false);
  // Loi cua row dau tien phai co prefix rows[0]. de admin biet dong nao loi.
  assert.ok(badImport.errors.some((error) => error.startsWith("rows[0].")));

  // Neu tat ca assert qua, in thong bao pass.
  console.log("Admin data workflow tests passed.");
}

// Chay test khi file duoc execute bang node.
run();
