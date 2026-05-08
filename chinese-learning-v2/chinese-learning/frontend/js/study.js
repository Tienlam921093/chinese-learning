/**
 * STUDY PAGE — JavaScript
 * FIX N26: Tách từ inline <script> ra file riêng
 * Depends on: helpers.js
 */
"use strict";

const LESSONS = [
  {
    id: 1,
    hsk: 1,
    title: "Chào Hỏi Cơ Bản",
    intro: "Học cách chào, cảm ơn, xin lỗi và hỏi thăm đơn giản.",
    keywords: ["你好", "谢谢", "对不起", "再见", "请", "没关系"],
  },
  {
    id: 2,
    hsk: 1,
    title: "Số Đếm 1-10",
    intro: "Làm quen số đếm, hỏi số lượng và thời gian cơ bản.",
    keywords: ["一", "二", "三", "四", "五", "十"],
  },
  {
    id: 3,
    hsk: 1,
    title: "Màu Sắc",
    intro: "Miêu tả màu sắc và hỏi sở thích về màu.",
    keywords: ["红色", "蓝色", "绿色", "黄色", "颜色"],
  },
  {
    id: 4,
    hsk: 1,
    title: "Gia Đình",
    intro: "Gọi tên thành viên gia đình và giới thiệu quan hệ.",
    keywords: ["爸爸", "妈妈", "哥哥", "姐姐", "家", "人"],
  },
  {
    id: 5,
    hsk: 1,
    title: "Thức Ăn & Đồ Uống",
    intro: "Gọi món, nói ăn uống và sở thích cơ bản.",
    keywords: ["饭", "水", "茶", "咖啡", "吃", "喝"],
  },
  {
    id: 6,
    hsk: 1,
    title: "Thời Gian",
    intro: "Nói ngày, tháng, buổi và hỏi mấy giờ.",
    keywords: ["今天", "明天", "昨天", "几点", "现在"],
  },
  {
    id: 7,
    hsk: 2,
    title: "Mua Sắm",
    intro: "Hỏi giá, trả giá và nói nhu cầu mua bán.",
    keywords: ["多少钱", "便宜", "贵", "买", "卖"],
  },
  {
    id: 8,
    hsk: 2,
    title: "Giao Thông",
    intro: "Hỏi đường, chọn phương tiện và mô tả di chuyển.",
    keywords: ["公交车", "地铁", "出租车", "骑车", "走路"],
  },
  {
    id: 9,
    hsk: 2,
    title: "Sức Khỏe",
    intro: "Nói triệu chứng, đi khám và dùng thuốc.",
    keywords: ["医院", "医生", "头疼", "发烧", "药"],
  },
  {
    id: 10,
    hsk: 3,
    title: "Thời Tiết",
    intro: "Nói thời tiết, mùa và cảm nhận nhiệt độ.",
    keywords: ["天气", "下雨", "晴天", "刮风", "温度"],
  },
  {
    id: 11,
    hsk: 3,
    title: "Du Lịch",
    intro: "Chuẩn bị giấy tờ, đặt phòng và hỏi thông tin du lịch.",
    keywords: ["旅游", "护照", "酒店", "飞机", "签证"],
  },
  {
    id: 12,
    hsk: 4,
    title: "Công Việc",
    intro: "Trao đổi về công việc, nhiệm vụ, cuộc họp và kinh nghiệm.",
    keywords: ["工作", "公司", "上班", "老板", "工资"],
  },
  {
    id: 13,
    hsk: 4,
    title: "Cảm Xúc & Tính Cách",
    intro: "Diễn đạt cảm xúc và mô tả tính cách người khác.",
    keywords: ["高兴", "生气", "难过", "紧张", "性格"],
  },
  {
    id: 14,
    hsk: 5,
    title: "Kinh Tế & Tài Chính",
    intro: "Nói về thị trường, đầu tư, ngân hàng và tài chính cá nhân.",
    keywords: ["经济", "股票", "投资", "银行", "利率"],
  },
  {
    id: 15,
    hsk: 5,
    title: "Môi Trường",
    intro: "Thảo luận ô nhiễm, năng lượng và bảo vệ môi trường.",
    keywords: ["环境", "污染", "能源", "保护", "气候"],
  },
  {
    id: 16,
    hsk: 6,
    title: "Triết Học & Văn Hóa",
    intro: "Đọc hiểu các khái niệm văn hóa, tư tưởng và giá trị.",
    keywords: ["哲学", "文化", "传统", "思想", "精神"],
  },
  {
    id: 17,
    hsk: 6,
    title: "Chính Trị & Xã Hội",
    intro: "Nói về xã hội, chính sách, quyền lợi và trách nhiệm.",
    keywords: ["政治", "社会", "制度", "民主", "改革"],
  },
];

const CONTENT = {
  1: {
    grammar: [
      ["A 是 B", "Dùng 是 để giới thiệu hoặc xác nhận danh tính."],
      ["你好吗？", "Thêm 吗 ở cuối câu để tạo câu hỏi có/không."],
      ["请 + động từ", "Dùng 请 để nói lịch sự: 请坐, 请说."],
    ],
    examples: [
      ["你好！我是学生。", "Xin chào! Tôi là học sinh."],
      ["你好吗？我很好。", "Bạn khỏe không? Tôi khỏe."],
      ["对不起，没关系。", "Xin lỗi, không sao."],
    ],
    listening: ["你好，我是小明。", "谢谢你的帮助。", "再见，明天见。"],
  },
  2: {
    grammar: [
      ["数字 + 个 + danh từ", "Cấu trúc đếm số lượng đơn giản."],
      ["几 + danh từ", "Dùng 几 để hỏi số lượng nhỏ."],
      ["现在 + số + 点", "Nói giờ hiện tại."],
    ],
    examples: [
      ["我有三个朋友。", "Tôi có ba người bạn."],
      ["现在六点。", "Bây giờ là 6 giờ."],
      ["你要几个？", "Bạn muốn mấy cái?"],
    ],
    listening: ["一二三四五。", "我有十本书。", "现在八点。"],
  },
  3: {
    grammar: [
      ["Màu + 的 + danh từ", "Dùng 的 để nối màu với danh từ."],
      ["你喜欢什么颜色？", "Hỏi người khác thích màu gì."],
      ["A 是 + màu + 的", "Miêu tả màu sắc của vật."],
    ],
    examples: [
      ["这是红色的花。", "Đây là hoa màu đỏ."],
      ["我喜欢蓝色。", "Tôi thích màu xanh lam."],
      ["草是绿色的。", "Cỏ màu xanh lá."],
    ],
    listening: ["你喜欢什么颜色？", "天空是蓝色的。", "这是黄色的。"],
  },
  4: {
    grammar: [
      ["这是我的 + người thân", "Dùng 我的 để giới thiệu thành viên gia đình."],
      [
        "家里有 + số + 口人",
        "Dùng 口 (lượng từ cho người trong gia đình) để nói số thành viên.",
      ],
      [
        "比 — A 比 B + tính từ",
        "So sánh hơn: 哥哥比我高 = Anh trai cao hơn tôi.",
      ],
    ],
    examples: [
      ["我家有五口人。", "Nhà tôi có năm người."],
      ["我爸爸是医生。", "Bố tôi là bác sĩ."],
      ["姐姐比我大两岁。", "Chị gái lớn hơn tôi 2 tuổi."],
    ],
    listening: ["我家有五口人。", "妈妈在做饭。", "爸爸在工作。"],
  },
  5: {
    grammar: [
      [
        "想 + động từ",
        "Dùng 想 để diễn đạt ý muốn: 我想吃饭 = Tôi muốn ăn cơm.",
      ],
      [
        "一杯/一碗/一盘 + đồ ăn",
        "Lượng từ cho đồ ăn uống: 杯 (ly), 碗 (tô), 盘 (đĩa).",
      ],
      [
        "好吃 / 好喝",
        "Dùng 好 + động từ để miêu tả cảm nhận: 好吃 = ngon (ăn), 好喝 = ngon (uống).",
      ],
    ],
    examples: [
      ["我想喝茶。", "Tôi muốn uống trà."],
      ["来一碗米饭。", "Cho tôi một tô cơm."],
      ["这个菜很好吃！", "Món này rất ngon!"],
    ],
    listening: ["你想吃什么？", "我要一杯咖啡。", "这个很好吃。"],
  },
  6: {
    grammar: [
      [
        "现在 + số + 点 + số + 分",
        "Nói giờ đầy đủ: 现在三点十五分 = Bây giờ 3 giờ 15 phút.",
      ],
      ["星期 + số", "Nói thứ trong tuần: 星期一 = Thứ Hai, 星期天 = Chủ Nhật."],
      [
        "从...到...",
        "Diễn đạt khoảng thời gian: 从八点到五点 = Từ 8 giờ đến 5 giờ.",
      ],
    ],
    examples: [
      ["现在几点了？", "Bây giờ mấy giờ rồi?"],
      ["我每天上午八点上课。", "Mỗi ngày 8 giờ sáng tôi đi học."],
      ["从星期一到星期五上班。", "Đi làm từ Thứ 2 đến Thứ 6."],
    ],
    listening: ["现在三点半。", "明天星期六。", "从九点到五点上班。"],
  },
  7: {
    grammar: [
      ["多少钱？", "Hỏi giá: 这个多少钱？ = Cái này bao nhiêu tiền?"],
      [
        "太 + tính từ + 了",
        "Diễn đạt mức độ quá: 太贵了 = Đắt quá!, 太便宜了 = Rẻ quá!",
      ],
      [
        "能不能 + động từ",
        "Hỏi khả năng/xin phép: 能不能便宜一点？ = Có thể rẻ hơn chút không?",
      ],
    ],
    examples: [
      ["这件衣服多少钱？", "Bộ quần áo này bao nhiêu?"],
      ["太贵了，便宜一点吧。", "Đắt quá, bớt chút đi."],
      ["可以用手机付钱吗？", "Có thể trả bằng điện thoại không?"],
    ],
    listening: ["多少钱？", "太贵了！", "可以打折吗？"],
  },
  8: {
    grammar: [
      [
        "坐 + phương tiện",
        "Dùng 坐 cho phương tiện ngồi: 坐公交车 = Đi xe buýt.",
      ],
      [
        "怎么去 + địa điểm",
        "Hỏi cách đi: 怎么去火车站？ = Đến ga tàu bằng cách nào?",
      ],
      [
        "往/向 + hướng + 走/转",
        "Chỉ đường: 向左转 = Rẽ trái, 往前走 = Đi thẳng.",
      ],
    ],
    examples: [
      ["坐地铁去学校。", "Đi tàu điện ngầm đến trường."],
      ["这里怎么去？", "Đến đây bằng cách nào?"],
      ["向右转，再直走。", "Rẽ phải rồi đi thẳng."],
    ],
    listening: ["请问，地铁站在哪里？", "坐公交车去。", "向左转。"],
  },
  9: {
    grammar: [
      ["身体 + bộ phận + 不舒服", "Nói triệu chứng: 我头疼 = Tôi đau đầu."],
      ["需要 + động từ", "Diễn đạt cần thiết: 需要去医院 = Cần đi bệnh viện."],
      ["吃药 / 打针 / 休息", "Các hành động y tế cơ bản."],
    ],
    examples: [
      ["我发烧了，头疼。", "Tôi bị sốt, đau đầu."],
      ["你需要多休息。", "Bạn cần nghỉ ngơi nhiều hơn."],
      ["吃了药就会好的。", "Uống thuốc sẽ đỡ thôi."],
    ],
    listening: ["我不舒服。", "你哪里不舒服？", "多休息，多喝水。"],
  },
};

function fallbackContent(lesson) {
  const k = lesson.keywords;
  return {
    grammar: [
      [
        `用 ${k[0]} 造句`,
        `Dùng từ khóa ${k[0]} để đặt câu theo chủ đề ${lesson.title}.`,
      ],
      [
        "主语 + 很 + tính từ",
        "Dùng 很 để nối chủ ngữ với tính từ hoặc trạng thái.",
      ],
      [
        "因为...所以...",
        "Nêu nguyên nhân và kết quả trong một câu hoàn chỉnh.",
      ],
    ],
    examples: [
      [`${k[0]}很重要。`, `${k[0]} rất quan trọng.`],
      [`我想学习${k[1]}。`, `Tôi muốn học về ${k[1]}.`],
      [
        `请你说一个关于${k[2]}的句子。`,
        `Hãy nói một câu liên quan đến ${k[2]}.`,
      ],
    ],
    listening: [
      `${k[0]}很重要。`,
      `我想学习${k[1]}。`,
      `请你说一个关于${k[2]}的句子。`,
    ],
  };
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

async function loadBackendContent(id) {
  try {
    const res = await authFetch(`${API}/lessons/${id}`);
    if (!res.ok) throw new Error("lesson api failed");
    const data = await res.json();
    return data?.lesson ? data : null;
  } catch {
    return null;
  }
}

async function renderLesson() {
  const id =
    parseInt(new URLSearchParams(location.search).get("lesson"), 10) || 1;
  const backend = await loadBackendContent(id);
  const fallbackLesson = LESSONS.find((l) => l.id === id) || LESSONS[0];
  const lesson = backend?.lesson
    ? {
        ...fallbackLesson,
        ...backend.lesson,
        hsk:
          backend.lesson.hsk_level || backend.lesson.hsk || fallbackLesson.hsk,
        intro:
          backend.lesson.description ||
          backend.lesson.intro ||
          fallbackLesson.intro,
        keywords: fallbackLesson.keywords,
      }
    : fallbackLesson;
  const localContent = CONTENT[lesson.id] || fallbackContent(lesson);
  const content = localContent;
  const keywords = lesson.keywords;

  document.title = `${lesson.title} | Học Bài`;
  document.getElementById("lessonBadge").textContent =
    `HSK ${lesson.hsk || lesson.hsk_level} · Bài ${lesson.id}`;
  document.getElementById("lessonTitle").textContent = lesson.title;
  document.getElementById("lessonIntro").textContent = lesson.intro;
  document.getElementById("vocabLink").href =
    `vocabulary.html?lesson=${lesson.id}&mode=list`;
  document.getElementById("flashcardLink").href =
    `vocabulary.html?lesson=${lesson.id}&mode=learn`;

  document.getElementById("grammarList").innerHTML = content.grammar
    .map(
      ([pattern, note]) => `
    <div class="grammar-item">
      <div class="grammar-pattern">${pattern}</div>
      <div class="grammar-note">${note}</div>
    </div>`,
    )
    .join("");

  document.getElementById("exampleList").innerHTML = content.examples
    .map(
      ([zh, vi]) => `
    <div class="example-row">
      <div class="zh">${zh}</div>
      <div class="vi">${vi}</div>
      <button class="btn btn-outline-secondary btn-sm" onclick="speak('${zh.replace(/'/g, "\\'")}')"><i class="fa fa-volume-up"></i></button>
    </div>`,
    )
    .join("");

  document.getElementById("listeningList").innerHTML = content.listening
    .map(
      (line, i) => `
    <div class="listen-card">
      <div class="listen-text">${line}</div>
      <button class="btn btn-success btn-sm" onclick="speak('${line.replace(/'/g, "\\'")}')"><i class="fa fa-play me-1"></i>Nghe câu ${i + 1}</button>
    </div>`,
    )
    .join("");

  document.getElementById("keywordList").innerHTML = keywords
    .map(
      (w) => `
    <span class="word-chip">${w}</span>`,
    )
    .join("");
}

async function markStudied() {
  const id =
    parseInt(new URLSearchParams(location.search).get("lesson"), 10) || 1;
  const token = getToken();
  if (token) {
    try {
      await authFetch(`${API}/lessons/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: 100, time_spent: 0 }),
      });
    } catch {
      /* local fallback below */
    }
  }
  const p = JSON.parse(localStorage.getItem(getProgressKey()) || "{}");
  const ids = new Set((p.completedLessonIds || []).map(Number));
  const isNew = !ids.has(id);
  ids.add(id);
  p.completedLessonIds = [...ids];
  if (isNew) p.todayLessons = (p.todayLessons || 0) + 1;
  localStorage.setItem(getProgressKey(), JSON.stringify(p));
  window.location.href = `lessons.html?completed=${id}`;
}

renderLesson();
