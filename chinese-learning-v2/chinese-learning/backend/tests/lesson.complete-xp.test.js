const assert = require('assert');
const path = require('path');

function loadControllerWithMocks({ saveProgressImpl, addXPImpl }) {
  const lessonModelPath = path.resolve(__dirname, '../models/lesson.model.js');
  const userModelPath = path.resolve(__dirname, '../models/user.model.js');
  const controllerPath = path.resolve(__dirname, '../controllers/lesson.controller.js');

  delete require.cache[lessonModelPath];
  delete require.cache[userModelPath];
  delete require.cache[controllerPath];

  require.cache[lessonModelPath] = {
    id: lessonModelPath,
    filename: lessonModelPath,
    loaded: true,
    exports: { saveProgress: saveProgressImpl },
  };

  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: { addXP: addXPImpl },
  };

  return require(controllerPath);
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function run() {
  let saveCall = 0;
  let addXpCalls = 0;

  const LessonController = loadControllerWithMocks({
    saveProgressImpl: async () => {
      saveCall += 1;
      return { alreadyCompleted: saveCall > 1 };
    },
    addXPImpl: async () => {
      addXpCalls += 1;
    },
  });

  const req = {
    params: { id: '101' },
    user: { id: 7 },
    body: { score: 80, time_spent: 120 },
  };

  const res1 = createRes();
  await LessonController.complete(req, res1);
  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.body.xp_gained, 90);
  assert.strictEqual(addXpCalls, 1);

  const res2 = createRes();
  await LessonController.complete(req, res2);
  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.body.xp_gained, 0);
  assert.strictEqual(addXpCalls, 1);

  console.log('Lesson complete XP anti-farm test passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
