/**
 * CHATBOT CONTROLLER
 */
const AIService = require("../services/ai.service");
const { sql, query } = require("../config/db");

const ALLOWED_MODES = new Set(["free", "lesson", "quiz"]);

function buildOfflineReply(message, mode = "free") {
  const text = String(message || "").toLowerCase();

  // ── QUIZ MODE ──
  if (
    mode === "quiz" ||
    text.match(/quiz|trắc nghiệm|kiểm tra|đố tôi|ra câu hỏi|câu hỏi trắc/)
  ) {
    const quizzes = [
      {
        q: '"你好" có nghĩa là gì?',
        opts: "A. Tạm biệt  B. **Xin chào ✅**  C. Cảm ơn  D. Xin lỗi",
        exp: "你(nǐ)=bạn + 好(hǎo)=tốt/khỏe → lời chào phổ biến nhất",
      },
      {
        q: '"谢谢" (xiè xie) có nghĩa là gì?',
        opts: "A. Xin lỗi  B. Không có gì  C. **Cảm ơn ✅**  D. Tạm biệt",
        exp: "谢谢 là cách cảm ơn thông dụng. Trả lời: 不客气(bú kèqi)=không có gì",
      },
      {
        q: "Câu phủ định trong tiếng Trung dùng từ nào?",
        opts: "A. 吗  B. 的  C. **不/没 ✅**  D. 了",
        exp: "不(bù) dùng cho thói quen/ý muốn, 没(méi) dùng cho quá khứ",
      },
      {
        q: '"我是越南人" có nghĩa là gì?',
        opts: "A. Tôi đến từ Việt Nam  B. **Tôi là người Việt Nam ✅**  C. Tôi thích Việt Nam  D. Tôi học tiếng Việt",
        exp: "我(wǒ)=tôi + 是(shì)=là + 越南人(Yuènánrén)=người Việt Nam",
      },
      {
        q: "Thanh thứ 3 trong tiếng Trung có dạng như thế nào?",
        opts: "A. Ngang  B. Đi lên  C. **Xuống rồi lên ✅**  D. Đi xuống",
        exp: "Thanh 3 (ǎ): giọng do dự, xuống thấp rồi lên. Ví dụ: mǎ(马)=ngựa",
      },
    ];
    const q = quizzes[Math.floor(Math.random() * quizzes.length)];
    return `**✅ Câu hỏi trắc nghiệm**\n\n**${q.q}**\n\n${q.opts}\n\n**Giải thích:** ${q.exp}\n\n📝 Gõ "quiz" để nhận câu hỏi tiếp theo!`;
  }

  // ── LESSON MODE ──
  if (mode === "lesson") {
    return `**📚 Bài học hôm nay — Chào hỏi cơ bản**\n\n**1. Chủ đề:** Gặp gỡ và tự giới thiệu\n\n**2. Từ vựng mới:**\n- 你好 (nǐ hǎo) = Xin chào\n- 我叫… (wǒ jiào) = Tôi tên là…\n- 你叫什么名字？(nǐ jiào shénme míngzi) = Bạn tên gì?\n- 很高兴认识你 (hěn gāoxìng rènshi nǐ) = Rất vui được gặp bạn\n- 再见 (zàijiàn) = Tạm biệt\n\n**3. Ngữ pháp:** Câu hỏi tên → Chủ ngữ + 叫 + 什么名字？\n\n**4. Ví dụ:**\n👉 你好！我叫小明。你叫什么名字？\n= Xin chào! Tôi tên Tiểu Minh. Bạn tên gì?\n\n**5. Bài tập:** Tự giới thiệu tên và quốc tịch của bạn bằng tiếng Trung! 📝`;
  }

  // ── CHÀO HỎI ──
  if (text.match(/chào|hello|xin chào|你好|nǐ hǎo|问候|hi\b/)) {
    return `**👋 Chào hỏi tiếng Trung**\n\n**Các câu chào cơ bản:**\n- 你好！(nǐ hǎo) = Xin chào!\n- 你好吗？(nǐ hǎo ma) = Bạn khỏe không?\n- 我很好，谢谢！(wǒ hěn hǎo, xièxie) = Tôi rất khỏe, cảm ơn!\n- 你叫什么名字？(nǐ jiào shénme míngzi) = Bạn tên gì?\n- 很高兴认识你！(hěn gāoxìng rènshi nǐ) = Rất vui được gặp bạn!\n- 再见！(zàijiàn) = Tạm biệt!\n- 明天见！(míngtiān jiàn) = Hẹn gặp lại ngày mai!\n\n**Thử hội thoại:**\n👉 A: 你好！你叫什么名字？\n👉 B: 你好！我叫小明。你呢？\n👉 A: 我叫阿兰。很高兴认识你！`;
  }

  // ── TỰ GIỚI THIỆU ──
  if (text.match(/tự giới thiệu|giới thiệu bản thân|introduce|自我介绍/)) {
    return `**🙋 Tự giới thiệu bằng tiếng Trung**\n\n**Mẫu câu đầy đủ:**\n- 我叫… (wǒ jiào) = Tôi tên là…\n- 我是越南人 (wǒ shì Yuènán rén) = Tôi là người Việt Nam\n- 我来自河内 (wǒ lái zì Hà Nội) = Tôi đến từ Hà Nội\n- 我今年…岁 (wǒ jīnnián … suì) = Tôi năm nay … tuổi\n- 我是学生/上班族 (wǒ shì xuésheng/shàngbānzú) = Tôi là học sinh/nhân viên\n- 我在学习汉语 (wǒ zài xuéxí hànyǔ) = Tôi đang học tiếng Trung\n- 我喜欢… (wǒ xǐhuān) = Tôi thích…\n\n**Ví dụ đầy đủ:**\n👉 你好！我叫阿兰。我是越南人，来自河内。我今年22岁，是大学生。我在学习汉语，很高兴认识你！\n= Xin chào! Tôi tên Lan. Tôi là người Việt Nam, đến từ Hà Nội. Tôi 22 tuổi, là sinh viên đại học. Tôi đang học tiếng Trung, rất vui được gặp bạn!`;
  }

  // ── THANH ĐIỆU ──
  if (text.match(/thanh điệu|4 thanh|bốn thanh|tone|声调/)) {
    return `**🎵 4 Thanh điệu tiếng Trung**\n\n| Thanh | Ký hiệu | Mô tả | Ví dụ | Nghĩa |\n|---|---|---|---|---|\n| 1 | ā | Ngang, cao đều | mā (妈) | mẹ |\n| 2 | á | Đi lên (hỏi) | má (麻) | vừng |\n| 3 | ǎ | Xuống rồi lên | mǎ (马) | ngựa |\n| 4 | à | Đi xuống mạnh | mà (骂) | mắng |\n\n**Mẹo nhớ:**\n- Thanh 1 🎵 = giọng hát cao đều\n- Thanh 2 ↗ = giọng hỏi "hả?"\n- Thanh 3 ↘↗ = giọng do dự "ừm..."\n- Thanh 4 ↘ = giọng quát "không!"\n\n**Luyện tập 4 thanh:** mā - má - mǎ - mà\n**Ứng dụng:** 买(mǎi)=mua, 卖(mài)=bán — khác thanh, khác nghĩa hoàn toàn!`;
  }

  // ── MÀU SẮC ──
  if (text.match(/màu sắc|màu|color|颜色/)) {
    return `**🎨 Màu sắc trong tiếng Trung**\n\n| Màu | Chữ Hán | Pinyin | Nghĩa |\n|---|---|---|---|\n| 🔴 | 红色 | hóng sè | Đỏ |\n| 🔵 | 蓝色 | lán sè | Xanh dương |\n| 🟢 | 绿色 | lǜ sè | Xanh lá |\n| 🟡 | 黄色 | huáng sè | Vàng |\n| ⚪ | 白色 | bái sè | Trắng |\n| ⚫ | 黑色 | hēi sè | Đen |\n| 🟠 | 橙色 | chéng sè | Cam |\n| 🟣 | 紫色 | zǐ sè | Tím |\n\n**Ví dụ câu:**\n👉 我喜欢红色。(wǒ xǐhuān hóng sè) = Tôi thích màu đỏ.\n👉 她的包是蓝色的。(tā de bāo shì lán sè de) = Túi của cô ấy màu xanh dương.`;
  }

  // ── SỐ ĐẾM ──
  if (text.match(/số|đếm|1-10|number|数字|一二三/)) {
    return `**🔢 Số đếm tiếng Trung**\n\n**1-10:**\n一(yī)=1 · 二(èr)=2 · 三(sān)=3 · 四(sì)=4 · 五(wǔ)=5\n六(liù)=6 · 七(qī)=7 · 八(bā)=8 · 九(jiǔ)=9 · 十(shí)=10\n\n**Số lớn:**\n- 十一(shíyī)=11 · 二十(èrshí)=20 · 一百(yībǎi)=100\n- 一千(yīqiān)=1.000 · 一万(yīwàn)=10.000\n\n**Ứng dụng thực tế:**\n👉 多少钱？(duōshǎo qián) = Bao nhiêu tiền?\n👉 五十块。(wǔshí kuài) = 50 tệ.\n👉 我有三本书。(wǒ yǒu sān běn shū) = Tôi có 3 quyển sách.\n\n**Mẹo:** 二(èr) dùng khi đếm đơn thuần, 两(liǎng) dùng trước lượng từ (两本书=2 quyển sách)`;
  }

  // ── NGỮ PHÁP CƠ BẢN / CẤU TRÚC CÂU ──
  if (text.match(/ngữ pháp cơ bản|cấu trúc câu|câu cơ bản|grammar basic/)) {
    return `**📖 Ngữ pháp cơ bản tiếng Trung**\n\n**1. Cấu trúc câu cơ bản:**\n→ **Chủ ngữ + Động từ + Tân ngữ**\n👉 我吃饭 (wǒ chī fàn) = Tôi ăn cơm\n👉 他学习汉语 (tā xuéxí hànyǔ) = Anh ấy học tiếng Trung\n\n**2. Câu phủ định:**\n→ Thêm **不(bù)** hoặc **没(méi)** trước động từ\n👉 我不吃肉 = Tôi không ăn thịt (thói quen)\n👉 我没吃饭 = Tôi chưa ăn cơm (quá khứ)\n\n**3. Câu hỏi:**\n→ Thêm **吗(ma)** cuối câu\n👉 你是越南人吗？= Bạn là người Việt Nam à?\n→ Dùng từ hỏi: 什么(shénme)=gì, 哪里(nǎlǐ)=đâu, 谁(shéi)=ai, 怎么(zěnme)=như thế nào\n\n**4. Câu có 是(shì):**\n→ Chủ ngữ + 是 + Danh từ\n👉 我是学生 = Tôi là học sinh`;
  }

  // ── CÂU HỎI / ĐẶT CÂU HỎI ──
  if (text.match(/đặt câu hỏi|cách hỏi|câu hỏi|how to ask|疑问/)) {
    return `**❓ Cách đặt câu hỏi trong tiếng Trung**\n\n**Cách 1: Thêm 吗(ma) cuối câu**\n👉 你是越南人吗？= Bạn là người Việt Nam à?\n👉 你吃饭了吗？= Bạn ăn cơm chưa?\n\n**Cách 2: Dùng từ để hỏi**\n- 什么 (shénme) = gì → 你吃什么？= Bạn ăn gì?\n- 哪里 (nǎlǐ) = đâu → 你在哪里？= Bạn ở đâu?\n- 谁 (shéi) = ai → 他是谁？= Anh ấy là ai?\n- 什么时候 (shénme shíhou) = khi nào\n- 为什么 (wèishénme) = tại sao\n- 怎么 (zěnme) = như thế nào\n- 多少 (duōshǎo) = bao nhiêu → 多少钱？= Bao nhiêu tiền?\n\n**Cách 3: Câu hỏi lựa chọn A不A**\n👉 你去不去？= Bạn có đi không? (đi hay không đi?)`;
  }

  // ── HỘI THOẠI NHÀ HÀNG ──
  if (
    text.match(/nhà hàng|đặt đồ ăn|gọi món|đồ ăn|food|restaurant|餐厅|点菜/)
  ) {
    return `**🍜 Hội thoại nhà hàng tiếng Trung**\n\n**Từ vựng cần thiết:**\n- 菜单 (càidān) = thực đơn\n- 服务员 (fúwùyuán) = nhân viên phục vụ\n- 点菜 (diǎn cài) = gọi món\n- 好吃 (hǎochī) = ngon\n- 买单/结账 (mǎidān/jiézhàng) = tính tiền\n\n**Hội thoại mẫu:**\n👉 服务员！(fúwùyuán) = Phục vụ ơi!\n👉 请给我看菜单。(qǐng gěi wǒ kàn càidān) = Cho tôi xem thực đơn.\n👉 我要一碗牛肉面和一杯绿茶。(wǒ yào yī wǎn niúròu miàn hé yī bēi lǜchá) = Tôi muốn một bát mì bò và một cốc trà xanh.\n👉 多少钱？(duōshǎo qián) = Bao nhiêu tiền?\n👉 买单！(mǎidān) = Tính tiền!\n\n**Mẹo:** Ở nhà hàng Trung Quốc thường gọi 服务员 to để gọi phục vụ, không cần giơ tay như ở Việt Nam! 😄`;
  }

  // ── SỬA LỖI ──
  if (text.match(/sửa lỗi|sửa câu|correct|fix|错误|帮我改/)) {
    const sentence = message
      .replace(/sửa lỗi[^:：]*/i, "")
      .replace(/[:：]/, "")
      .replace(/giúp tôi/i, "")
      .trim();
    return `**✏️ Phân tích câu: "${sentence || message}"**\n\n**Kiểm tra theo quy tắc:**\n\n**1. Cấu trúc:** Chủ ngữ + Động từ + Tân ngữ\n**2. Giới từ địa điểm:** 来自(láizì)=đến từ, 在(zài)=ở\n**3. Câu giới thiệu:** 我是越南人(người Việt) · 我来自河内(từ Hà Nội)\n\n**Ví dụ sửa lỗi thường gặp:**\n❌ 我是越南人来自河内\n✅ 我是越南人，我来自河内。\n= Tôi là người Việt Nam, tôi đến từ Hà Nội.\n\n❌ 我很喜欢的中国菜\n✅ 我很喜欢中国菜。\n= Tôi rất thích đồ ăn Trung Quốc.\n\n*💡 Để sửa chính xác hơn, hãy thử lại khi AI online!*`;
  }

  // ── NGỮ PHÁP NÂNG CAO / 的了过 ──
  if (
    text.match(
      /nâng cao|advanced|的|了|过|把|被|都|也|比|complement|khác biệt.*的|phân biệt.*了/,
    )
  ) {
    return `**📗 Ngữ pháp nâng cao tiếng Trung**\n\n**1. 的 / 了 / 过 — 3 hạt nhân quan trọng:**\n- **的(de)**: liên kết tính từ/sở hữu → 我的书=sách của tôi, 漂亮的花=hoa đẹp\n- **了(le)**: hoàn thành → 我吃了=Tôi đã ăn xong\n- **过(guò)**: đã từng trải qua → 我去过北京=Tôi đã từng đến Bắc Kinh\n\n**2. 都(dōu) vs 也(yě):**\n- 都 = tất cả đều → 我们都是学生=Chúng tôi đều là học sinh\n- 也 = cũng → 我也是学生=Tôi cũng là học sinh\n\n**3. Câu 把(bǎ) — nhấn mạnh tân ngữ:**\n👉 我把书放在桌子上。= Tôi đặt sách lên bàn.\nCấu trúc: Chủ ngữ + **把** + Tân ngữ + Động từ + Bổ ngữ\n\n**4. Câu 被(bèi) — bị động:**\n👉 书被他拿走了。= Sách bị anh ấy lấy đi rồi.`;
  }

  // ── TỪ MỚI HSK / TỪ VỰNG ──
  if (text.match(/từ mới|từ vựng|hsk|词汇|单词|vocabulary|5 từ|8 từ|10 từ/)) {
    return `**📚 Từ vựng HSK 1 — Chủ đề hỗn hợp**\n\n| Chữ Hán | Pinyin | Nghĩa | Ví dụ câu |\n|---|---|---|---|\n| 学习 | xuéxí | học tập | 我每天学习汉语 |\n| 朋友 | péngyou | bạn bè | 他是我的好朋友 |\n| 工作 | gōngzuò | công việc | 你做什么工作？|\n| 喜欢 | xǐhuān | thích | 我喜欢吃饺子 |\n| 漂亮 | piàoliang | đẹp | 她很漂亮 |\n\n**Dịch ví dụ:**\n- 我每天学习汉语 = Tôi học tiếng Trung mỗi ngày\n- 你做什么工作？= Bạn làm nghề gì?\n- 我喜欢吃饺子 = Tôi thích ăn sủi cảo\n\n💡 **Mẹo học:** Học kèm ví dụ câu → nhớ lâu hơn học từ đơn lẻ!`;
  }

  // ── GIA ĐÌNH ──
  if (text.match(/gia đình|family|父母|爸爸|妈妈|兄弟/)) {
    return `**👨‍👩‍👧 Từ vựng gia đình tiếng Trung**\n\n- 爸爸 (bàba) = bố\n- 妈妈 (māma) = mẹ\n- 哥哥 (gēge) = anh trai\n- 姐姐 (jiějie) = chị gái\n- 弟弟 (dìdi) = em trai\n- 妹妹 (mèimei) = em gái\n- 爷爷 (yéye) = ông nội\n- 奶奶 (nǎinai) = bà nội\n- 外公 (wàigōng) = ông ngoại\n- 外婆 (wàipó) = bà ngoại\n\n**Ví dụ:**\n👉 我有一个哥哥和两个妹妹。= Tôi có một anh trai và hai em gái.`;
  }

  // ── PHÂN BIỆT / SO SÁNH ──
  if (text.match(/phân biệt|so sánh|khác biệt|difference|compare/)) {
    return `**🔍 Phân biệt từ hay nhầm trong tiếng Trung**\n\n**了(le) vs 过(guò):**\n- 了 = vừa xong → 我吃了 (tôi vừa ăn xong)\n- 过 = đã từng → 我吃过 (tôi đã từng ăn)\n\n**不(bù) vs 没(méi):**\n- 不 = không (ý muốn/thói quen) → 我不喝酒 (tôi không uống rượu)\n- 没 = chưa/không có (thực tế) → 我没喝酒 (tôi chưa uống rượu)\n\n**在(zài) vs 是(shì):**\n- 在 = ở (vị trí) → 我在学校 (tôi ở trường)\n- 是 = là (định nghĩa) → 我是学生 (tôi là học sinh)\n\n**都(dōu) vs 也(yě):**\n- 都 = tất cả đều → 我们都去 (chúng tôi đều đi)\n- 也 = cũng → 我也去 (tôi cũng đi)`;
  }

  // ── DEFAULT — trả lời chung hữu ích ──
  return `**🤖 小明 — Chế độ offline**\n\nCâu hỏi của bạn: *"${message}"*\n\nMình đang ở chế độ offline nhưng có thể trả lời các chủ đề sau:\n\n| Chủ đề | Gõ để hỏi |\n|---|---|\n| 👋 Chào hỏi | "Dạy tôi chào hỏi tiếng Trung" |\n| 🙋 Tự giới thiệu | "Dạy tôi tự giới thiệu" |\n| 🎵 Thanh điệu | "Giải thích 4 thanh điệu" |\n| 🎨 Màu sắc | "Dạy tôi 8 từ về màu sắc" |\n| 🔢 Số đếm | "Dạy tôi đếm số 1-10" |\n| 📖 Ngữ pháp | "Ngữ pháp cơ bản tiếng Trung" |\n| ❓ Câu hỏi | "Cách đặt câu hỏi tiếng Trung" |\n| 🍜 Nhà hàng | "Hội thoại đặt đồ ăn nhà hàng" |\n| ✏️ Sửa lỗi | "Sửa lỗi câu này: [câu của bạn]" |\n| 📗 Nâng cao | "Phân biệt 的 了 过" |\n| 📚 Từ mới | "Cho tôi 5 từ HSK 1 mới" |\n| ✅ Quiz | "Ra cho tôi 1 câu hỏi trắc nghiệm" |`;
}

async function loadServerSideHistory(userId, limit = 8) {
  if (!userId) return [];
  const r = await query(
    `SELECT TOP (@lim) user_message, bot_reply
     FROM ChatHistory
     WHERE user_id=@uid
     ORDER BY created_at DESC`,
    {
      uid: { type: sql.Int, value: userId },
      lim: { type: sql.Int, value: limit },
    },
  );
  return r.recordset.reverse().flatMap((row) => {
    const messages = [];
    if (row.user_message)
      messages.push({ role: "user", content: row.user_message });
    if (row.bot_reply)
      messages.push({ role: "assistant", content: row.bot_reply });
    return messages;
  });
}

const ChatbotController = {
  async chat(req, res) {
    try {
      const { message, mode = "free" } = req.body;
      if (!message?.trim())
        return res
          .status(400)
          .json({ message: "Tin nhắn không được để trống" });
      if (message.length > 2000)
        return res
          .status(400)
          .json({ message: "Tin nhắn quá dài (tối đa 2000 ký tự)" });

      // Chỉ tin context do server quản lý; bỏ qua history từ client để chặn prompt injection.
      const safeHistory = await loadServerSideHistory(req.user?.id);
      const safeMode = ALLOWED_MODES.has(mode) ? mode : "free";

      const reply = await AIService.chat({
        messages: [...safeHistory, { role: "user", content: message }],
        mode: safeMode,
      });

      // Lưu lịch sử nếu đã đăng nhập
      if (req.user) {
        query(
          `INSERT INTO ChatHistory (user_id,user_message,bot_reply,mode,created_at)
           VALUES (@uid,@umsg,@breply,@mode,GETDATE())`,
          {
            uid: { type: sql.Int, value: req.user.id },
            umsg: { type: sql.NVarChar(sql.MAX), value: message },
            breply: { type: sql.NVarChar(sql.MAX), value: reply },
            mode: { type: sql.NVarChar(20), value: safeMode },
          },
        ).catch((e) =>
          console.warn("[CHAT] Không lưu được lịch sử:", e.message),
        );
      }

      res.json({
        reply,
        provider: process.env.AI_PROVIDER || "openai",
        mode: safeMode,
      });
    } catch (err) {
      console.error("[CHATBOT]", err.message);
      if (
        err.message?.includes("API key") ||
        err.message?.includes("Incorrect API key") ||
        err.message?.includes("quota") ||
        err.message?.includes("billing") ||
        err.message?.includes("rate limit")
      ) {
        return res.json({
          reply: buildOfflineReply(req.body?.message, req.body?.mode),
          provider: "offline",
          mode: ALLOWED_MODES.has(req.body?.mode) ? req.body.mode : "free",
        });
      }
      return res.json({
        reply: buildOfflineReply(req.body?.message, req.body?.mode),
        provider: "offline",
        mode: ALLOWED_MODES.has(req.body?.mode) ? req.body.mode : "free",
      });
    }
  },

  async history(req, res) {
    try {
      // FIX N15: Validate limit/offset — tránh NaN khi input không hợp lệ
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
      const offset = Math.max(0, parseInt(req.query.offset) || 0);
      const r = await query(
        `SELECT id,user_message,bot_reply,mode,created_at
         FROM ChatHistory WHERE user_id=@uid
         ORDER BY created_at DESC OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
        {
          uid: { type: sql.Int, value: req.user.id },
          lim: { type: sql.Int, value: parseInt(limit) },
          off: { type: sql.Int, value: parseInt(offset) },
        },
      );
      res.json({ history: r.recordset.reverse() });
    } catch (err) {
      res.status(500).json({ message: "Lỗi lấy lịch sử chat" });
    }
  },

  async clear(req, res) {
    try {
      await query(`DELETE FROM ChatHistory WHERE user_id=@uid`, {
        uid: { type: sql.Int, value: req.user.id },
      });
      res.json({ message: "Đã xóa lịch sử chat" });
    } catch (err) {
      res.status(500).json({ message: "Lỗi xóa lịch sử" });
    }
  },
};

module.exports = ChatbotController;
