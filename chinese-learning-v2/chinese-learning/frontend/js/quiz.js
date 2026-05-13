/**
 * QUIZ PAGE — JavaScript
 * FIX N26: Tách từ inline <script> ra file riêng
 */
// Auth utilities (getToken, getUser, getProgressKey, API_BASE, authFetch) provided by helpers.js

const ALL_VOCAB = [
  { hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào" },
  { hanzi: "谢谢", pinyin: "xiè xie", meaning: "Cảm ơn" },
  { hanzi: "对不起", pinyin: "duì bu qǐ", meaning: "Xin lỗi" },
  { hanzi: "再见", pinyin: "zài jiàn", meaning: "Tạm biệt" },
  { hanzi: "一", pinyin: "yī", meaning: "Số một" },
  { hanzi: "二", pinyin: "èr", meaning: "Số hai" },
  { hanzi: "三", pinyin: "sān", meaning: "Số ba" },
  { hanzi: "红色", pinyin: "hóng sè", meaning: "Màu đỏ" },
  { hanzi: "蓝色", pinyin: "lán sè", meaning: "Màu xanh" },
  { hanzi: "妈妈", pinyin: "mā ma", meaning: "Mẹ" },
  { hanzi: "爸爸", pinyin: "bà ba", meaning: "Bố" },
  { hanzi: "水", pinyin: "shuǐ", meaning: "Nước" },
  { hanzi: "吃饭", pinyin: "chī fàn", meaning: "Ăn cơm" },
  { hanzi: "学习", pinyin: "xué xí", meaning: "Học tập" },
  { hanzi: "朋友", pinyin: "péng you", meaning: "Bạn bè" },
  { hanzi: "老师", pinyin: "lǎo shī", meaning: "Giáo viên" },
  { hanzi: "学生", pinyin: "xué sheng", meaning: "Học sinh" },
  { hanzi: "中国", pinyin: "Zhōng guó", meaning: "Trung Quốc" },
];

let questions = [],
  currentQ = 0,
  score = 0,
  correct = 0,
  wrong = 0;
let timerInterval = null,
  timeLeft = 20;
let quizStartTime = null; // Track quiz start time for time_spent
let quizAttemptId = null;

function createAttemptId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildQuestion(vocab, type) {
  const others = ALL_VOCAB.filter((v) => v !== vocab);
  const wrong3 = shuffle(others).slice(0, 3);

  if (type === "meaning") {
    return {
      question: vocab.hanzi,
      answer: vocab.meaning,
      options: shuffle([vocab.meaning, ...wrong3.map((v) => v.meaning)]),
      label: "Chọn nghĩa đúng cho chữ",
    };
  } else if (type === "hanzi") {
    return {
      question: vocab.meaning,
      answer: vocab.hanzi,
      options: shuffle([vocab.hanzi, ...wrong3.map((v) => v.hanzi)]),
      label: "Chọn chữ Hán đúng",
    };
  } else {
    return {
      question: vocab.hanzi,
      answer: vocab.pinyin,
      options: shuffle([vocab.pinyin, ...wrong3.map((v) => v.pinyin)]),
      label: "Chọn pinyin đúng",
    };
  }
}

async function loadQuizPool() {
  const hsk = document.getElementById("quizHSK").value;
  if (hsk === "all") return ALL_VOCAB;
  try {
    const res = await fetch(
      `${API_BASE}/vocabulary/flashcard?hsk_level=${hsk}&count=999`,
    );
    if (res.ok) {
      const data = await res.json();
      const apiCards = (data.flashcards || []).map((v) => ({
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        meaning: v.meaning,
      }));
      if (apiCards.length >= ALL_VOCAB.length) return apiCards;
    }
  } catch {
    /* use local fallback */
  }
  return ALL_VOCAB;
}

async function startQuiz() {
  const type = document.getElementById("quizType").value;
  const source = await loadQuizPool();
  const pool = shuffle(source).slice(0, Math.min(15, source.length));
  questions = pool.map((v) => buildQuestion(v, type));
  currentQ = 0;
  score = 0;
  correct = 0;
  wrong = 0;
  quizStartTime = Date.now(); // Start tracking time
  quizAttemptId = createAttemptId();

  document.getElementById("qTotal").textContent = questions.length;
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("resultScreen").style.display = "none";
  document.getElementById("quizScreen").style.display = "block";
  renderQuestion();
}

function renderQuestion() {
  if (currentQ >= questions.length) {
    endQuiz();
    return;
  }
  const q = questions[currentQ];
  clearInterval(timerInterval);
  timeLeft = 20;

  document.getElementById("qNum").textContent = currentQ + 1;
  document.getElementById("qTypeLabel").textContent = q.label;
  document.getElementById("qQuestion").textContent = q.question;
  document.getElementById("qQuestion").style.fontSize =
    q.question.length > 4 ? "3rem" : "5rem";
  document.getElementById("quizProgress").style.width =
    `${(currentQ / questions.length) * 100}%`;
  document.getElementById("scoreDisplay").textContent = `${score} điểm`;
  document.getElementById("correctCount").textContent = correct;
  document.getElementById("wrongCount").textContent = wrong;
  document.getElementById("timerDisplay").textContent = timeLeft;
  document.getElementById("timerDisplay").className = "quiz-timer";

  const letters = ["A", "B", "C", "D"];
  document.getElementById("optionsGrid").innerHTML = q.options
    .map(
      (opt, i) => `
    <div class="col-6">
      <button class="quiz-option w-100 d-flex align-items-center gap-2" onclick="selectAnswer(this,'${opt.replace(/'/g, "\\'")}')">
        <span class="option-letter">${letters[i]}</span>
        <span style="${opt.match(/[\u4e00-\u9fff]/) ? "font-family:'Noto Serif SC',serif;font-size:1.2rem" : ""}">${opt}</span>
      </button>
    </div>`,
    )
    .join("");

  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timerDisplay").textContent = timeLeft;
    if (timeLeft <= 5)
      document.getElementById("timerDisplay").className = "quiz-timer warning";
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      autoFail();
    }
  }, 1000);
}

function selectAnswer(btn, chosen) {
  clearInterval(timerInterval);
  const q = questions[currentQ];
  const all = document.querySelectorAll(".quiz-option");
  all.forEach((b) => (b.disabled = true));

  if (chosen === q.answer) {
    btn.classList.add("correct");
    btn.querySelector(".option-letter").style.background = "#4CAF50";
    btn.querySelector(".option-letter").style.color = "#fff";
    correct++;
    score += Math.max(10, timeLeft * 2);
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(
        q.question.match(/[\u4e00-\u9fff]/) ? q.question : q.answer,
      );
      u.lang = "zh-CN";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  } else {
    btn.classList.add("wrong");
    btn.querySelector(".option-letter").style.background = "#e63946";
    btn.querySelector(".option-letter").style.color = "#fff";
    all.forEach((b) => {
      if (b.querySelector("span:last-child").textContent === q.answer) {
        b.classList.add("correct");
        b.querySelector(".option-letter").style.background = "#4CAF50";
        b.querySelector(".option-letter").style.color = "#fff";
      }
    });
    wrong++;
  }
  setTimeout(() => {
    currentQ++;
    renderQuestion();
  }, 1200);
}

function autoFail() {
  wrong++;
  const q = questions[currentQ];
  document.querySelectorAll(".quiz-option").forEach((b) => {
    b.disabled = true;
    if (b.querySelector("span:last-child").textContent === q.answer)
      b.classList.add("correct");
  });
  setTimeout(() => {
    currentQ++;
    renderQuestion();
  }, 1200);
}

function skipQuestion() {
  clearInterval(timerInterval);
  wrong++;
  currentQ++;
  renderQuestion();
}

async function endQuiz() {
  clearInterval(timerInterval);
  document.getElementById("quizScreen").style.display = "none";
  document.getElementById("resultScreen").style.display = "block";

  const total = questions.length;
  const pct = Math.round((correct / total) * 100);
  const quizType = document.getElementById("quizType").value;
  const timeSpent = quizStartTime
    ? Math.round((Date.now() - quizStartTime) / 1000)
    : 0;

  // Calculate score (simple: percent correct)
  const score = pct;

  // Setup result UI with loading state first
  document.getElementById("rCorrect").textContent = correct;
  document.getElementById("rWrong").textContent = wrong;
  document.getElementById("resultPct").textContent = `${pct}%`;
  document.getElementById("rXP").textContent = "⏳";
  setTimeout(() => {
    document.getElementById("resultBar").style.width = `${pct}%`;
  }, 100);

  // Try to submit quiz to backend
  let xpGain = correct * 10; // Local fallback
  try {
    const res = await authFetch(`${API}/quiz/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correct,
        total,
        score,
        time_spent: timeSpent,
        type: quizType,
        attempt_id: quizAttemptId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      xpGain = data.xp_gained || xpGain;
      console.log("[QUIZ] ✅ Submitted to backend. XP:", xpGain);
    } else {
      console.warn("[QUIZ] ⚠️ Backend submit failed:", res.status);
    }
  } catch (err) {
    console.warn("[QUIZ] ⚠️ Failed to submit to backend:", err.message);
    // Fallback: save locally
    const p = JSON.parse(localStorage.getItem(getProgressKey()) || "{}");
    p.xp = (p.xp || 0) + xpGain;
    localStorage.setItem(getProgressKey(), JSON.stringify(p));
  }

  // Update UI with final XP
  document.getElementById("rXP").textContent = `+${xpGain}`;
  document.getElementById("resultSubtitle").textContent =
    `Đúng ${correct}/${total} câu · ${pct}% · +${xpGain} XP`;

  // Update result emoji + title
  if (pct >= 90) {
    document.getElementById("resultEmoji").textContent = "🏆";
    document.getElementById("resultTitle").textContent = "Xuất Sắc! 厉害！";
  } else if (pct >= 70) {
    document.getElementById("resultEmoji").textContent = "👍";
    document.getElementById("resultTitle").textContent = "Tốt Lắm! 很好！";
  } else if (pct >= 50) {
    document.getElementById("resultEmoji").textContent = "💪";
    document.getElementById("resultTitle").textContent = "Cố Gắng Thêm! 加油！";
  } else {
    document.getElementById("resultEmoji").textContent = "📚";
    document.getElementById("resultTitle").textContent = "Cần Ôn Tập Thêm!";
  }
}

function showStart() {
  document.getElementById("resultScreen").style.display = "none";
  document.getElementById("startScreen").style.display = "block";
}
