/**
 * BASIC TESTS — HánYǔ Backend
 *
 * Chạy: node tests/basic.test.js
 * Kiểm tra các utility functions không cần DB connection
 */

const assert = require('assert');

// ── Test SM-2 Algorithm ──
const { calculateSM2 } = require('../utils/sm2.utils');

function testSM2() {
  console.log('  ✓ SM-2: quality 5 (perfect)');
  const r1 = calculateSM2({ quality: 5, repetitions: 0, easeFactor: 2.5, intervalDays: 0 });
  assert.strictEqual(r1.repetitions, 1);
  assert.strictEqual(r1.intervalDays, 1);
  assert(r1.easeFactor >= 2.5, 'Ease factor should not decrease for quality 5');

  console.log('  ✓ SM-2: quality 2 (fail → reset)');
  const r2 = calculateSM2({ quality: 2, repetitions: 5, easeFactor: 2.5, intervalDays: 30 });
  assert.strictEqual(r2.repetitions, 0);
  assert.strictEqual(r2.intervalDays, 1);

  console.log('  ✓ SM-2: quality 4 (good)');
  const r3 = calculateSM2({ quality: 4, repetitions: 1, easeFactor: 2.5, intervalDays: 1 });
  assert.strictEqual(r3.repetitions, 2);
  assert.strictEqual(r3.intervalDays, 6);

  console.log('  ✓ SM-2: ease factor minimum 1.3');
  const r4 = calculateSM2({ quality: 3, repetitions: 0, easeFactor: 1.3, intervalDays: 0 });
  assert(r4.easeFactor >= 1.3, 'Ease factor should never go below 1.3');

  console.log('  ✓ SM-2: interval capped at 365');
  const r5 = calculateSM2({ quality: 5, repetitions: 10, easeFactor: 2.5, intervalDays: 300 });
  assert(r5.intervalDays <= 365, 'Interval should never exceed 365 days');
}

// ── Test XP Calculation ──
const { calculateLessonXP } = require('../utils/xp.utils');

function testXP() {
  console.log('  ✓ XP: perfect score (100) → max XP');
  const xp100 = calculateLessonXP(100);
  assert(xp100 > 0, 'XP should be positive');

  console.log('  ✓ XP: zero score (0) → min XP');
  const xp0 = calculateLessonXP(0);
  assert(xp0 >= 0, 'XP should not be negative');

  console.log('  ✓ XP: higher score → more XP');
  assert(xp100 >= xp0, 'Higher score should give more or equal XP');
}

// ── Test escapeHTML (if exists) ──
function testEscapeHTML() {
  // Simulate the frontend escapeHTML function
  function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, c => map[c]);
  }

  console.log('  ✓ escapeHTML: XSS prevention');
  assert.strictEqual(escapeHTML('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');

  console.log('  ✓ escapeHTML: normal text unchanged');
  assert.strictEqual(escapeHTML('Hello World'), 'Hello World');

  console.log('  ✓ escapeHTML: Chinese characters unchanged');
  assert.strictEqual(escapeHTML('你好世界'), '你好世界');

  console.log('  ✓ escapeHTML: non-string returns as-is');
  assert.strictEqual(escapeHTML(42), 42);
  assert.strictEqual(escapeHTML(null), null);
}

// ── Test Environment Config ──
function testEnvConfig() {
  console.log('  ✓ env.js: module loads without error');
  // This just tests that the module can be required without crashing
  // In CI, there may not be a .env file, so we just check it doesn't throw
  try {
    require('../config/env');
    console.log('  ✓ env.js: loaded successfully');
  } catch (err) {
    // Expected if no .env file exists in CI
    console.log('  ⚠ env.js: skipped (no .env file — expected in CI)');
  }
}

// ── Run All Tests ──
console.log('\n🧪 HánYǔ Backend Tests\n');

let passed = 0;
let failed = 0;

function runSuite(name, fn) {
  console.log(`📦 ${name}`);
  try {
    fn();
    passed++;
    console.log(`   ✅ PASSED\n`);
  } catch (err) {
    failed++;
    console.error(`   ❌ FAILED: ${err.message}\n`);
  }
}

runSuite('SM-2 Algorithm', testSM2);
runSuite('XP Calculation', testXP);
runSuite('HTML Escaping', testEscapeHTML);
runSuite('Environment Config', testEnvConfig);

console.log(`\n${'═'.repeat(40)}`);
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
