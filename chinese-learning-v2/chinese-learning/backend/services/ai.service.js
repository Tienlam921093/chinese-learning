/**
 * AI SERVICE — OpenAI / Anthropic Claude
 */

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
  buildSystemPrompt(mode = "free") {
    return SYSTEM_PROMPT.base + (SYSTEM_PROMPT[mode] || "");
  },

  async chat({ messages, mode = "free" }) {
    const systemPrompt = this.buildSystemPrompt(mode);
    const history = messages.slice(-10);

    // Fallback chain: try providers in order until one succeeds
    const providers = this._getProviderChain();

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
        console.warn(`[AI] ${provider} failed:`, err.message);
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error("All AI providers failed. No response available.");
  },

  _getProviderChain() {
    // Priority order: configured provider first, then fallbacks
    const primary = process.env.AI_PROVIDER || "gemini";
    const fallbacks = ["gemini", "openai", "anthropic"].filter(
      (p) => p !== primary,
    );
    return [primary, ...fallbacks];
  },

  async _callOpenAI(messages, systemPrompt) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        max_tokens: 1000,
        temperature: 0.8,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error?.message || `OpenAI error ${res.status}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  },

  async _callAnthropic(messages, systemPrompt) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error?.message || `Anthropic error ${res.status}`);
    }
    const data = await res.json();
    return data.content[0].text;
  },
  async _callGemini(messages, systemPrompt) {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.8,
        },
      }),
    });

    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error?.message || `Gemini error ${res.status}`);
    }
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  },
};

module.exports = AIService;
