// Import assert de so sanh ket qua thuc te voi ket qua mong doi.
const assert = require("assert");
// Import path de tao duong dan tuyet doi toi cac module can mock.
const path = require("path");

// Helper nay load lesson.controller.js trong khi thay the model that bang mock.
function loadControllerWithMocks({ completeOnceImpl }) {
  // Duong dan toi Lesson model that, se bi thay bang mock trong require.cache.
  const lessonModelPath = path.resolve(__dirname, "../models/lesson.model.js");
  // Duong dan toi User model that, cung se bi mock.
  const userModelPath = path.resolve(__dirname, "../models/user.model.js");
  // Duong dan toi controller that can test.
  const controllerPath = path.resolve(__dirname, "../controllers/lesson.controller.js");

  // Xoa cache cu de lan require tiep theo doc mock moi.
  delete require.cache[lessonModelPath];
  delete require.cache[userModelPath];
  delete require.cache[controllerPath];

  // Gan mock cho Lesson model: controller se thay exports nay khi require model.
  require.cache[lessonModelPath] = {
    id: lessonModelPath,
    filename: lessonModelPath,
    loaded: true,
    exports: { completeOnce: completeOnceImpl },
  };

  // Gan mock cho User model: user nao cung duoc xem la plan free.
  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: { findById: async () => ({ plan: "free" }) },
  };

  // Require controller sau khi da gan mock, nen controller se dung mock o tren.
  return require(controllerPath);
}

// Tao object response gia lap giong Express response.
function createRes() {
  return {
    // Mac dinh HTTP status la 200.
    statusCode: 200,
    // Noi luu JSON response controller tra ve.
    body: null,
    // Gia lap res.status(code), luu code va tra ve this de chain .json().
    status(code) {
      this.statusCode = code;
      return this;
    },
    // Gia lap res.json(payload), luu payload de test doc lai.
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// Ham async chay test vi controller.complete la async.
async function run() {
  // Dem so lan LessonModel.completeOnce duoc goi.
  let completeCall = 0;

  // Load controller voi mock completeOnce co hanh vi: lan dau co XP, lan sau XP = 0.
  const LessonController = loadControllerWithMocks({
    completeOnceImpl: async ({ xpGain }) => {
      // Moi lan controller goi completeOnce thi tang counter.
      completeCall += 1;
      // Tu lan thu 2 tro di, lesson duoc xem la da hoan thanh truoc do.
      const alreadyCompleted = completeCall > 1;
      // Neu da hoan thanh thi khong cong XP nua; neu chua thi tra xpGain.
      return { alreadyCompleted, xpGained: alreadyCompleted ? 0 : xpGain };
    },
  });

  // Request gia lap: user 7 hoan thanh lesson 101 voi score 80 trong 120 giay.
  const req = {
    params: { id: "101" },
    user: { id: 7 },
    body: { score: 80, time_spent: 120 },
  };

  // Lan complete dau tien phai duoc cong XP.
  const res1 = createRes();
  await LessonController.complete(req, res1);
  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.body.xp_gained, 90);
  assert.strictEqual(completeCall, 1);

  // Lan complete thu hai cho cung lesson/user khong duoc farm them XP.
  const res2 = createRes();
  await LessonController.complete(req, res2);
  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.body.xp_gained, 0);
  assert.strictEqual(completeCall, 2);

  // Neu khong assert nao fail thi in thong bao pass.
  console.log("Lesson complete XP anti-farm test passed.");
}

// Chay test va bien loi async thanh exit code 1 de CI nhan biet fail.
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
