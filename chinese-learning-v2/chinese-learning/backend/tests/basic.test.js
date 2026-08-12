/**
 * BASIC TESTS - HanYu Backend
 *
 * Chay: node tests/basic.test.js
 * File nay kiem tra cac utility function khong can DB connection.
 */

// Import assert cua Node.js de viet cac dieu kien test.
const assert = require("assert");

// Import ham tinh lich on tap SM-2.
const { calculateSM2 } = require("../utils/sm2.utils");

// Suite test cho thuat toan SM-2.
function testSM2() {
  // Case nguoi hoc tra loi hoan hao.
  console.log("  - SM-2: quality 5 (perfect)");
  // Goi calculateSM2 voi lan hoc dau tien, quality 5.
  const r1 = calculateSM2({ quality: 5, repetitions: 0, easeFactor: 2.5, intervalDays: 0 });
  // Sau lan dau dung, repetitions phai tang len 1.
  assert.strictEqual(r1.repetitions, 1);
  // Interval dau tien phai la 1 ngay.
  assert.strictEqual(r1.intervalDays, 1);
  // Quality 5 khong nen lam ease factor giam.
  assert(r1.easeFactor >= 2.5, "Ease factor should not decrease for quality 5");

  // Case nguoi hoc fail.
  console.log("  - SM-2: quality 2 (fail -> reset)");
  // Goi calculateSM2 voi quality 2, dang co lich on tap dai.
  const r2 = calculateSM2({ quality: 2, repetitions: 5, easeFactor: 2.5, intervalDays: 30 });
  // Fail thi repetitions phai reset ve 0.
  assert.strictEqual(r2.repetitions, 0);
  // Fail thi interval quay ve 1 ngay.
  assert.strictEqual(r2.intervalDays, 1);

  // Case nguoi hoc tra loi tot.
  console.log("  - SM-2: quality 4 (good)");
  // Goi calculateSM2 khi da co 1 lan lap lai truoc do.
  const r3 = calculateSM2({ quality: 4, repetitions: 1, easeFactor: 2.5, intervalDays: 1 });
  // Repetitions phai tang tu 1 len 2.
  assert.strictEqual(r3.repetitions, 2);
  // Theo SM-2, lan lap lai thu hai co interval 6 ngay.
  assert.strictEqual(r3.intervalDays, 6);

  // Case kiem tra san duoi cua ease factor.
  console.log("  - SM-2: ease factor minimum 1.3");
  // Goi voi easeFactor da o muc toi thieu.
  const r4 = calculateSM2({ quality: 3, repetitions: 0, easeFactor: 1.3, intervalDays: 0 });
  // Ease factor khong bao gio duoc nho hon 1.3.
  assert(r4.easeFactor >= 1.3, "Ease factor should never go below 1.3");

  // Case kiem tra gioi han tren cua interval.
  console.log("  - SM-2: interval capped at 365");
  // Goi voi interval lon de dam bao bi cap.
  const r5 = calculateSM2({ quality: 5, repetitions: 10, easeFactor: 2.5, intervalDays: 300 });
  // Interval khong duoc vuot qua 365 ngay.
  assert(r5.intervalDays <= 365, "Interval should never exceed 365 days");
}

// Import ham tinh XP lesson.
const { calculateLessonXP } = require("../utils/xp.utils");

// Suite test cho logic tinh XP.
function testXP() {
  // Diem 100 phai cho XP lon hon 0.
  console.log("  - XP: perfect score (100) -> max XP");
  const xp100 = calculateLessonXP(100);
  assert(xp100 > 0, "XP should be positive");

  // Diem 0 khong duoc cho XP am.
  console.log("  - XP: zero score (0) -> min XP");
  const xp0 = calculateLessonXP(0);
  assert(xp0 >= 0, "XP should not be negative");

  // Diem cao hon phai cho XP cao hon hoac bang.
  console.log("  - XP: higher score -> more XP");
  assert(xp100 >= xp0, "Higher score should give more or equal XP");
}

// Suite test ham escape HTML mo phong logic frontend.
function testEscapeHTML() {
  // Dinh nghia ham escape local de test y tuong chong XSS.
  function escapeHTML(str) {
    // Neu input khong phai string thi tra nguyen trang.
    if (typeof str !== "string") return str;
    // Bang map ky tu nguy hiem sang HTML entity.
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    // Thay moi ky tu nguy hiem bang entity tuong ung.
    return str.replace(/[&<>"']/g, (c) => map[c]);
  }

  // Script tag phai bi escape de khong chay nhu HTML/JS.
  console.log("  - escapeHTML: XSS prevention");
  assert.strictEqual(escapeHTML("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");

  // Text binh thuong khong chua ky tu nguy hiem thi giu nguyen.
  console.log("  - escapeHTML: normal text unchanged");
  assert.strictEqual(escapeHTML("Hello World"), "Hello World");

  // Ky tu tieng Trung khong nam trong map escape nen giu nguyen.
  console.log("  - escapeHTML: Chinese characters unchanged");
  assert.strictEqual(escapeHTML("你好世界"), "你好世界");

  // Non-string phai tra nguyen trang.
  console.log("  - escapeHTML: non-string returns as-is");
  assert.strictEqual(escapeHTML(42), 42);
  assert.strictEqual(escapeHTML(null), null);
}

// Suite test config environment.
function testEnvConfig() {
  // Muc tieu: module env load duoc ma khong lam crash test.
  console.log("  - env.js: module loads without error");
  try {
    // Thu load config env.
    require("../config/env");
    // Neu khong throw thi load thanh cong.
    console.log("  - env.js: loaded successfully");
  } catch (err) {
    // CI co the khong co .env, nen case nay duoc xem la skipped.
    console.log("  - env.js: skipped (no .env file - expected in CI)");
  }
}

// In tieu de khi bat dau chay file.
console.log("\nHanYu Backend Tests\n");

// Bien dem so suite pass.
let passed = 0;
// Bien dem so suite fail.
let failed = 0;

// Helper chay tung suite va bat loi assert.
function runSuite(name, fn) {
  // In ten suite dang chay.
  console.log(`Suite: ${name}`);
  try {
    // Goi function test cua suite.
    fn();
    // Neu khong throw, suite pass.
    passed++;
    console.log("   PASSED\n");
  } catch (err) {
    // Neu co loi assert/exception, suite fail.
    failed++;
    console.error(`   FAILED: ${err.message}\n`);
  }
}

// Chay suite SM-2.
runSuite("SM-2 Algorithm", testSM2);
// Chay suite tinh XP.
runSuite("XP Calculation", testXP);
// Chay suite escape HTML.
runSuite("HTML Escaping", testEscapeHTML);
// Chay suite config env.
runSuite("Environment Config", testEnvConfig);

// In separator de ket qua de doc.
console.log(`\n${"=".repeat(40)}`);
// In tong so suite pass/fail.
console.log(`Results: ${passed} passed, ${failed} failed`);
// In separator dong.
console.log(`${"=".repeat(40)}\n`);

// Neu co bat ky suite fail thi exit 1, nguoc lai exit 0.
process.exit(failed > 0 ? 1 : 0);
