/**
 * AI SERVICE — OpenAI / Anthropic Claude
 */

// SYSTEM_PROMPT gom cac chi dan co dinh gui kem moi request AI.
// Moi mode se bo sung them yeu cau rieng cho cach AI tra loi.
const SYSTEM_PROMPT = {
  base: `Bạn là 小明 (Xiǎo Míng), gia sư AI dạy tiếng Trung thông thái và thân thiện.
Nhiệm vụ: Giúp người Việt học tiếng Trung Mandarin (Phổ Thông Thoại).

QUY TẮC TRẢ LỜI:
1. Luôn dùng tiếng Việt để giải thích
2. Từ tiếng Trung phải có: Chữ Hán + Pinyin (có dấu thanh) + Nghĩa tiếng Việt
3. Cho ví dụ câu thực tế và đơn giản
4. Sửa lỗi nhẹ nhàng, khuyến khích học viên
5. Khi dạy từ mới, cho biết thanh điệu và cách nhớ (mnemonic)
6. Giải thích ngữ pháp bằng so sánh với tiếng Việt khi có thể
7. Thêm emoji để phản hồi sinh động

ĐỊNH DẠNG:
- Từ quan trọng in **đậm**
- Ví dụ: 👉 [câu] = [nghĩa]
- Bài tập: 📝 [đề bài]`,

  lesson: `\n\nCHẾ ĐỘ BÀI HỌC: Dạy theo cấu trúc: 1) Chủ đề 2) 5-8 từ vựng mới 3) Điểm ngữ pháp 4) Ví dụ 5) Bài tập nhỏ`,
  quiz: `\n\nCHẾ ĐỘ QUIZ: Ra 1 câu hỏi trắc nghiệm mỗi lần. Nhận xét đúng/sai, giải thích, ra câu tiếp theo.`,
  free: "",
};

const AIService = {
  // Tao prompt he thong bang cach ghep prompt nen voi prompt cua mode hien tai.
  buildSystemPrompt(mode = "free") {
    return SYSTEM_PROMPT.base + (SYSTEM_PROMPT[mode] || "");
  },

  // Ham chinh de controller goi khi can chat voi AI.
  // messages la lich su hoi dap; mode quyet dinh AI tra loi theo kieu free/lesson/quiz.
  async chat({ messages, mode = "free" }) {
    // Chuyen mode thanh system prompt cu the.
    const systemPrompt = this.buildSystemPrompt(mode);

    // Chi gui 10 tin nhan cuoi de request gon hon va tranh vuot gioi han token.
    const history = messages.slice(-10);

    // Fallback chain: try providers in order until one succeeds
    const providers = this._getProviderChain();

    // Thu tung nha cung cap AI. Neu nha cung cap dau loi thi tu dong thu fallback.
    for (const provider of providers) {
      try {
        if (provider === "anthropic") {
          return await this._callAnthropic(history, systemPrompt);
        }
        if (provider === "gemini") {
          return await this._callGemini(history, systemPrompt);
        }
        if (provider === "openai") {
          return await this._callOpenAI(history, systemPrompt);
        }
      } catch (err) {
        // Ghi log loi cua provider hien tai nhung khong dung luong xu ly.
        console.warn(`[AI] ${provider} failed:`, err.message);
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error("All AI providers failed. No response available.");
  },

  _getProviderChain() {
    // Priority order: configured provider first, then fallbacks
    // AI_PROVIDER cho phep chon provider uu tien bang bien moi truong.
    const primary = process.env.AI_PROVIDER || "gemini";

    // Loai provider chinh khoi danh sach fallback de khong goi trung lap.
    const fallbacks = ["gemini", "openai", "anthropic"].filter(
      (p) => p !== primary,
    );

    // Provider chinh dung truoc, cac provider du phong dung sau.
    return [primary, ...fallbacks];
  },

  // Goi OpenAI Chat Completions API va tra ve noi dung cau tra loi dau tien.
  async _callOpenAI(messages, systemPrompt) {
    // fetch gui HTTP request truc tiep toi OpenAI.
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        // Cho phep doi model bang OPENAI_MODEL, neu khong co thi dung gpt-4o-mini.
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        max_tokens: 1000,
        temperature: 0.8,
        // OpenAI nhan system prompt nhu mot message role=system o dau danh sach.
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    // Neu API tra ve HTTP error, doc message loi va nem Error cho fallback xu ly.
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error?.message || `OpenAI error ${res.status}`);
    }

    // Lay noi dung text tu choice dau tien cua OpenAI.
    const data = await res.json();
    return data.choices[0].message.content;
  },

  // Goi Anthropic Messages API va tra ve phan text dau tien.
  async _callAnthropic(messages, systemPrompt) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Model Claude dang duoc co dinh trong code.
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        // Anthropic co field system rieng, khong tron vao messages nhu OpenAI.
        system: systemPrompt,
        messages,
      }),
    });

    // Nem loi neu Anthropic khong tra response thanh cong.
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error?.message || `Anthropic error ${res.status}`);
    }

    // Anthropic tra content dang mang; phan text dau tien la cau tra loi.
    const data = await res.json();
    return data.content[0].text;
  },

  // Goi Gemini generateContent API va tra ve text cua candidate dau tien.
  async _callGemini(messages, systemPrompt) {
    // Cho phep doi model bang GEMINI_MODEL, mac dinh dung gemini-2.0-flash.
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // Gemini dung role "model" cho assistant; cac role khac duoc chuyen thanh "user".
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // system_instruction la noi dat system prompt cua Gemini.
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.8,
        },
      }),
    });

    // Neu Gemini loi, nem Error de chat() thu provider tiep theo.
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error?.message || `Gemini error ${res.status}`);
    }

    // Lay text tu candidate dau tien cua Gemini.
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  },
};

// Xuat service de routes/controllers co the require va su dung.
module.exports = AIService;
