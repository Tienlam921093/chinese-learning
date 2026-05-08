"use strict";
// CHATBOT PAGE — Vanilla JS (secure rendering)
// Depends on: ../js/helpers.js (authFetch, getToken, getUser, getProgressKey, API_BASE, IS_LOCAL_DEV)
//
// Security:
// - Do not trust/execute HTML from AI; sanitize with DOMPurify when available.
// - Backend loads history server-side; frontend sends only message+mode.

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CHATBOT ENGINE
   API: POST /api/chatbot/chat
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const CHATBOT_API = `${API_BASE}/chatbot/chat`;

const MODES = {
  free: "Bạn là 小明, gia sư AI dạy tiếng Trung thân thiện. Trả lời bằng tiếng Việt, kèm chữ Hán + pinyin + nghĩa. Dùng emoji.",
  lesson:
    "Chế độ bài học: Dạy theo cấu trúc 1)Chủ đề 2)5 từ mới 3)Ngữ pháp 4)Ví dụ 5)Bài tập nhỏ.",
  quiz: "Chế độ quiz: Ra 1 câu hỏi trắc nghiệm, chờ trả lời, nhận xét đúng/sai và giải thích, rồi ra câu tiếp.",
};

let tts = false;
let typing = false;
let micRec = null;
let mode = "free";

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeHTML(html) {
  const dirty = String(html || "");
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
    return window.DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        "p",
        "strong",
        "em",
        "code",
        "pre",
        "ul",
        "ol",
        "li",
        "table",
        "tr",
        "td",
        "th",
        "h5",
        "h6",
        "hr",
        "span",
        "br",
      ],
      ALLOWED_ATTR: ["class", "style"],
    });
  }
  // Fallback: strip script tags + inline event handlers.
  return dirty
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function sanitizeTextForSpeech(html) {
  // Convert rendered HTML into plain text for TTS.
  // We already escape/convert markdown; DOMPurify sanitized HTML can still contain tags.
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeHTML(html);
  return tmp.textContent || "";
}

/* ── INIT ── */
function init() {
  const p = JSON.parse(localStorage.getItem(getProgressKey()) || "{}");
  const xpEl = document.getElementById("xpDisplay");
  const stEl = document.getElementById("streakDisplay");
  if (xpEl) xpEl.textContent = `⚡ ${p.xp || 0} XP`;
  if (stEl) stEl.textContent = `🔥 ${p.streak || 0} ngày`;

  addBotMsg(
    `<p>👋 <strong>Xin chào! 你好！Nǐ hǎo!</strong></p>
     <p>Tôi là <span class="hz">小明</span> (Xiǎo Míng) — AI Tutor tiếng Trung của bạn.</p>
     <p>Bạn muốn học gì hôm nay? <span class="hz">今天你想学什么？</span></p>`,
  );
}

/* ── MODE ── */
function setMode(m) {
  mode = m;
  ["free", "lesson", "quiz"].forEach((k) => {
    const el = document.getElementById(
      "mode" + k.charAt(0).toUpperCase() + k.slice(1),
    );
    if (!el) return;
    el.classList.toggle("active", k === m);
  });
  const msgs = {
    free: "💬 Chế độ Tự do — Hỏi bất cứ điều gì!",
    lesson: "📚 Chế độ Bài học — Bạn muốn học chủ đề gì?",
    quiz: "🎯 Chế độ Quiz — Sẵn sàng kiểm tra? Tôi sẽ ra câu hỏi!",
  };
  addBotMsg(`<p>${msgs[m] || msgs.free}</p>`);
}

/* ── SEND ── */
function quickSend(text) {
  const inp = document.getElementById("chatInput");
  if (inp) inp.value = text;
  sendMessage();
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

async function sendMessage() {
  const inp = document.getElementById("chatInput");
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || typing) return;

  inp.value = "";
  inp.style.height = "auto";

  addUserMsg(text);
  typing = true;
  setTyping(true);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);

  try {
    const headers = { "Content-Type": "application/json" };
    const token = typeof getToken === "function" ? getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(CHATBOT_API, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: text, mode }),
      signal: ctrl.signal,
      credentials: "include",
    });
    clearTimeout(t);
    if (!res.ok) throw new Error("API " + res.status);
    const data = await res.json();
    const reply = data.reply || data.message || "";

    addBotMsg(md(reply));
  } catch (e) {
    clearTimeout(t);
    if (IS_LOCAL_DEV) {
      addBotMsg(md(getDemoReply(text)));
    } else {
      addBotMsg(
        "<p>⚠️ Chatbot tạm thời không khả dụng. Vui lòng thử lại sau.</p>",
      );
    }
  } finally {
    setTyping(false);
    typing = false;
    addXP(5);
  }
}

/* ━━━ MARKDOWN RENDERER (safe) ━━━ */
function md(text) {
  if (!text) return "";

  // Escape raw HTML first.
  text = escapeHTML(text);

  // Protect fenced code blocks
  const codes = [];
  text = text.replace(/```[\s\S]*?```/g, (m) => {
    codes.push(m);
    return `%%CODE${codes.length - 1}%%`;
  });

  // Headings
  text = text.replace(
    /^### (.+)$/gm,
    '<h6 style="font-family:var(--font-d);margin:.5rem 0 .25rem;font-size:.95rem">$1</h6>',
  );
  text = text.replace(
    /^## (.+)$/gm,
    '<h5 style="font-family:var(--font-d);margin:.5rem 0 .25rem">$1</h5>',
  );

  // Horizontal rule
  text = text.replace(/^---$/gm, "<hr>");

  // Bold/italic
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Inline code
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Unordered lists
  text = text.replace(/((?:^[ \t]*[-*] .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((l) => l.replace(/^[ \t]*[-*] /, "").trim());
    return "<ul>" + items.map((i) => `<li>${i}</li>`).join("") + "</ul>";
  });

  // Ordered lists
  text = text.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((l) => l.replace(/^\d+\. /, "").trim());
    return "<ol>" + items.map((i) => `<li>${i}</li>`).join("") + "</ol>";
  });

  // Paragraphs
  text = text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      if (/^<(h[1-6]|ul|ol|li|hr|pre|code|blockquote)/.test(line.trim()))
        return line;
      return `<p>${line}</p>`;
    })
    .join("");

  // Restore code blocks
  text = text.replace(/%%CODE(\d+)%%/g, (_, i) => {
    const code = codes[i].replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    return `<pre><code>${code}</code></pre>`;
  });

  return text;
}

/* ── DEMO REPLIES ── */
function getDemoReply(q) {
  const l = String(q || "").toLowerCase();
  if (l.match(/xin chào|hello|你好|chào/))
    return `**你好！(Nǐ hǎo!)** 😊

Chào bạn! Rất vui được học cùng bạn!`;
  if (l.match(/thanh điệu|thanh|tone/))
    return `**🎵 4 Thanh Điệu**

| Thanh | Ví dụ |
|-------|-------|
| 1 | mā |
| 2 | má |
| 3 | mǎ |
| 4 | mà |`;
  if (l.match(/số|đếm|number|1|một/))
    return `**🔢 Số Đếm 1-10**

Bạn có muốn học số theo chủ đề (thời gian / đồ ăn) không?`;
  return `**💬 "${q}"**

🤖 Tôi đang xử lý câu hỏi của bạn.`;
}

/* ━━━ DOM HELPERS ━━━ */
function addBotMsg(htmlContent) {
  const box = document.getElementById("chatMessages");
  if (!box) return;

  const time = new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const div = document.createElement("div");
  div.className = "msg-row bot";

  const safeHtml = sanitizeHTML(htmlContent);
  div.innerHTML = `
    <div class="msg-ava"><i class="fa fa-robot"></i></div>
    <div class="msg-col">
      <div class="bubble bot-b">${safeHtml}</div>
      <span class="msg-time">小明 · ${time}</span>
    </div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;

  if (tts && "speechSynthesis" in window) {
    const bubble = div.querySelector(".bubble");
    const plain = bubble ? bubble.textContent : "";
    if (plain) {
      const u = new SpeechSynthesisUtterance(plain.substring(0, 160));
      u.lang = "zh-CN";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  }
}

function addUserMsg(text) {
  const box = document.getElementById("chatMessages");
  if (!box) return;

  const time = new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const div = document.createElement("div");
  div.className = "msg-row user";

  const escaped = escapeHTML(text).replace(/\n/g, "<br>");
  div.innerHTML = `
    <div class="msg-ava"><i class="fa fa-user"></i></div>
    <div class="msg-col">
      <div class="bubble user-b">${escaped}</div>
      <span class="msg-time">Bạn · ${time}</span>
    </div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function addTyping() {
  const box = document.getElementById("chatMessages");
  if (!box) return;
  const div = document.createElement("div");
  div.className = "msg-row bot";
  div.id = "typing";
  div.innerHTML = `
    <div class="msg-ava"><i class="fa fa-robot"></i></div>
    <div class="typing-bub">
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById("typing");
  if (el && el.remove) el.remove();
}

function setTyping(on) {
  typing = on;
  if (on) addTyping();
  const btn = document.getElementById("sendBtn");
  if (btn) btn.disabled = on;
  if (!on) removeTyping();
}

function clearChat() {
  mode = "free";
  localStorage.removeItem(getProgressKey() + "_chat");
  const box = document.getElementById("chatMessages");
  if (box) box.innerHTML = "";
  addBotMsg(
    '<p>🔄 Cuộc trò chuyện mới! <span class="hz">新对话开始了！</span></p><p>Bạn muốn học gì? <span class="hz">今天你想学什么？</span></p>',
  );
  setTyping(false);
}

function addXP(n) {
  const p = JSON.parse(localStorage.getItem(getProgressKey()) || "{}");
  p.xp = (p.xp || 0) + n;
  const today = new Date().toDateString();
  if (p.lastStudy !== today) {
    p.streak = (p.streak || 0) + 1;
    p.lastStudy = today;
  }
  localStorage.setItem(getProgressKey(), JSON.stringify(p));
  const xpEl = document.getElementById("xpDisplay");
  const stEl = document.getElementById("streakDisplay");
  if (xpEl) xpEl.textContent = `⚡ ${p.xp} XP`;
  if (stEl) stEl.textContent = `🔥 ${p.streak || 0} ngày`;
}

/* ── TTS ── */
function toggleVoice() {
  tts = !tts;
  const btn = document.getElementById("voiceBtn");
  if (btn) {
    btn.classList.toggle("active-voice", tts);
    btn.title = tts ? "Tắt đọc to" : "Bật đọc to (TTS)";
  }
}

/* ── MIC ── */
function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Tính năng nhận dạng giọng chỉ hỗ trợ trên Chrome.");
    return;
  }
  const btn = document.getElementById("micBtn");
  if (!btn) return;

  if (micRec) {
    micRec.stop();
    micRec = null;
    btn.classList.remove("recording");
    return;
  }

  micRec = new SR();
  micRec.lang = "zh-CN";
  micRec.continuous = false;
  micRec.interimResults = false;
  btn.classList.add("recording");

  micRec.onresult = (e) => {
    let transcript = "";
    if (
      e &&
      e.results &&
      e.results[0] &&
      e.results[0][0] &&
      e.results[0][0].transcript
    ) {
      transcript = e.results[0][0].transcript;
    }
    const inp = document.getElementById("chatInput");
    if (inp && transcript) inp.value = transcript;
    btn.classList.remove("recording");
    micRec = null;
  };
  micRec.onerror = micRec.onend = () => {
    btn.classList.remove("recording");
    micRec = null;
  };
  micRec.start();
}

// Ensure functions exist globally for inline onclick/onkeydown.
window.quickSend = quickSend;
window.handleKey = handleKey;
window.autoGrow = autoGrow;
window.sendMessage = sendMessage;
window.setMode = setMode;
window.clearChat = clearChat;
window.toggleVoice = toggleVoice;
window.toggleMic = toggleMic;

init();
