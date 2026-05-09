import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "/api";

const MODES = {
  free: { label: "💬 Tự do", id: "free" },
  lesson: { label: "📚 Bài", id: "lesson" },
  quiz: { label: "🎯 Quiz", id: "quiz" },
};

const SUGGESTIONS = [
  { icon: "🙋", text: "Dạy tôi cách tự giới thiệu bằng tiếng Trung" },
  { icon: "🎵", text: "Giải thích 4 thanh điệu trong tiếng Trung" },
  { icon: "🎨", text: "Dạy tôi 8 từ về màu sắc bằng tiếng Trung" },
  { icon: "❓", text: "Cách đặt câu hỏi trong tiếng Trung như thế nào?" },
  { icon: "🍜", text: "Luyện hội thoại đặt đồ ăn tại nhà hàng tiếng Trung" },
  { icon: "✏️", text: "Sửa lỗi câu này giúp tôi: 我是越南人来自河内" },
  { icon: "📖", text: "Dạy tôi ngữ pháp cơ bản: cấu trúc câu tiếng Trung" },
  { icon: "📚", text: "Cho tôi 5 từ HSK 1 mới kèm ví dụ câu" },
];

const CHIPS = [
  { icon: "👋", label: "Chào hỏi", text: "你好！教我如何问候" },
  { icon: "🔢", label: "Số đếm", text: "Dạy tôi đếm số 1-10 tiếng Trung" },
  {
    icon: "📖",
    label: "Ngữ pháp",
    text: "Ngữ pháp: câu phủ định trong tiếng Trung",
  },
  {
    icon: "🃏",
    label: "Từ mới",
    text: "Cho tôi 5 từ mới ngẫu nhiên HSK 1 kèm ví dụ",
  },
  {
    icon: "✅",
    label: "Quiz",
    text: "Ra cho tôi 1 câu hỏi trắc nghiệm tiếng Trung",
  },
  {
    icon: "🔍",
    label: "Ngữ pháp nâng cao",
    text: "Giải thích sự khác biệt 的 了 过 trong tiếng Trung",
  },
];

const WELCOME_MESSAGE =
  "👋 **Xin chào! 你好！Nǐ hǎo!**\n\n" +
  "Tôi là **小明** (Xiǎo Míng) - AI Tutor tiếng Trung của bạn.\n\n" +
  "Bạn muốn học gì hôm nay? **今天你想学什么？**\n\n" +
  "- 💬 Chế độ **Tự do**: Hỏi bất kỳ điều gì\n" +
  "- 📚 Chế độ **Bài học**: Học có cấu trúc\n" +
  "- 🎯 Chế độ **Quiz**: Kiểm tra kiến thức";

function getToken() {
  return (
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
  );
}

function getUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") || sessionStorage.getItem("user") || "{}",
    );
  } catch {
    return {};
  }
}

function getUserProgress() {
  const user = getUser();
  try {
    return JSON.parse(
      localStorage.getItem(`progress_${user.id || "guest"}`) || "{}",
    );
  } catch {
    return {};
  }
}

function formatClockTime() {
  return new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function markdownToHTML(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^#{1,3}\s(.+)$/gm, "<h5>$1</h5>")
    .replace(/^\|(.+)\|$/gm, (row) => {
      const cells = row
        .split("|")
        .filter(Boolean)
        .map((cell) => cell.trim());
      return (
        "<tr>" + cells.map((cell) => `<td>${cell}</td>`).join("") + "</tr>"
      );
    })
    .replace(/(<tr>.*<\/tr>)/gs, "<table>$1</table>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[ht])(.+)$/gm, "$1")
    .replace(/👉 (.+)/g, '<span class="example">👉 $1</span>');
}

function useChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("free");
  const [isTyping, setIsTyping] = useState(false);
  const [provider, setProvider] = useState("ai");
  const [tts, setTts] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [progress] = useState(() => getUserProgress());

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: Date.now(),
        role: "bot",
        content: WELCOME_MESSAGE,
        time: formatClockTime(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const toggleTts = useCallback(() => {
    setTts((current) => !current);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((current) => !current);
  }, []);

  const clearChat = useCallback(() => {
    if (!window.confirm("Xóa toàn bộ lịch sử chat?")) return;

    setMessages([]);

    const token = getToken();
    if (!token) return;

    fetch(`${API_BASE}/chatbot/history`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }).catch(() => {});
  }, []);

  const sendMessage = useCallback(
    async (rawText) => {
      const text = (rawText ?? input).trim();
      if (!text || isTyping) return;

      setInput("");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "user",
          content: text,
          time: formatClockTime(),
        },
      ]);

      setIsTyping(true);

      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/chatbot/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ message: text, mode }),
        });

        const data = await response.json();
        setProvider(data.provider || "ai");

        const replyText = data.reply || "Xin lỗi, có lỗi xảy ra.";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            content: replyText,
            time: formatClockTime(),
          },
        ]);

        if (tts && replyText) {
          const tmp = document.createElement("div");
          tmp.innerHTML = replyText;
          const utterance = new SpeechSynthesisUtterance(tmp.textContent || "");
          utterance.lang = "zh-CN";
          window.speechSynthesis.speak(utterance);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            content: "❌ Không thể kết nối server. Vui lòng thử lại.",
            time: formatClockTime(),
          },
        ]);
      } finally {
        setIsTyping(false);
        inputRef.current?.focus();
      }
    },
    [input, isTyping, mode, tts],
  );

  const handleInputKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  return {
    messages,
    input,
    setInput,
    mode,
    setMode,
    isTyping,
    provider,
    tts,
    toggleTts,
    sidebarOpen,
    toggleSidebar,
    progress,
    inputRef,
    messagesEndRef,
    sendMessage,
    clearChat,
    handleInputKeyDown,
  };
}

function MessageBubble({ msg }) {
  const isBot = msg.role === "bot";
  const html = isBot
    ? markdownToHTML(escapeHTML(msg.content).replace(/&amp;(amp;)*/g, "&"))
    : null;

  return (
    <div className={`msg-row ${isBot ? "bot" : "user"}`}>
      {isBot && (
        <div className="bot-avatar">
          <span>小</span>
        </div>
      )}
      <div className={`bubble ${isBot ? "bubble-bot" : "bubble-user"}`}>
        {isBot ? (
          <div
            className="bot-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span>{msg.content}</span>
        )}
        <span className="msg-time">{msg.time}</span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="msg-row bot">
      <div className="bot-avatar">
        <span>小</span>
      </div>
      <div className="bubble bubble-bot typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

function Sidebar({
  sidebarOpen,
  progress,
  mode,
  setMode,
  quickSend,
  isTyping,
  clearChat,
}) {
  return (
    <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
      <div className="sidebar-header">
        <a href="../index.html" className="brand">
          <div className="brand-icon">漢</div>
          <div>
            <div className="brand-text">HánYǔ</div>
            <div className="brand-sub">AI Tutor Tiếng Trung</div>
          </div>
        </a>

        <div className="xp-row">
          <span className="xp-pill xp">⚡ {progress.xp || 0} XP</span>
          <span className="xp-pill str">🔥 {progress.streak || 0} ngày</span>
        </div>

        <div className="mode-row">
          {Object.values(MODES).map((m) => (
            <button
              key={m.id}
              className={`mode-btn ${mode === m.id ? "active" : ""}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-label">Gợi ý câu hỏi</div>

      <div className="sidebar-body">
        {SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            className="suggest-btn"
            onClick={() => quickSend(suggestion.text)}
            disabled={isTyping}
          >
            <span className="suggest-icon">{suggestion.icon}</span>
            <span>
              {suggestion.text.length > 38
                ? `${suggestion.text.slice(0, 38)}...`
                : suggestion.text}
            </span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="sb-btn outline" onClick={clearChat}>
          🗑 Cuộc trò chuyện mới
        </button>
        <a href="lessons.html" className="sb-btn ghost">
          📚 Bài học
        </a>
        <a href="../index.html" className="sb-btn ghost">
          🏠 Trang chủ
        </a>
      </div>
    </aside>
  );
}

function ChatInput({
  inputRef,
  input,
  setInput,
  isTyping,
  sendMessage,
  handleInputKeyDown,
  mode,
}) {
  return (
    <div className="input-area">
      <div className="input-row">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="Nhập câu hỏi tiếng Trung... (Enter để gửi)"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown}
          rows={1}
          disabled={isTyping}
        />
        <button
          className="icon-btn send"
          onClick={() => sendMessage()}
          disabled={isTyping || !input.trim()}
          title="Gửi (Enter)"
        >
          ➤
        </button>
      </div>
      <div className="input-hint">
        Enter để gửi · Shift+Enter xuống dòng · Chế độ: {MODES[mode].label}
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  const {
    messages,
    input,
    setInput,
    mode,
    setMode,
    isTyping,
    provider,
    tts,
    toggleTts,
    sidebarOpen,
    toggleSidebar,
    progress,
    inputRef,
    messagesEndRef,
    sendMessage,
    clearChat,
    handleInputKeyDown,
  } = useChat();

  const quickSend = useCallback(
    (text) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .chatbot-app {
          display: flex;
          height: 100vh;
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #0f0f13;
          color: #e8e8f0;
          overflow: hidden;
        }

        .sidebar {
          width: 260px;
          background: #16161f;
          border-right: 1px solid #2a2a3a;
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease;
          flex-shrink: 0;
        }
        .sidebar.collapsed { width: 0; overflow: hidden; }

        .sidebar-header {
          padding: 20px 16px 12px;
          border-bottom: 1px solid #2a2a3a;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          text-decoration: none;
        }
        .brand-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #e63946, #c1121f);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900; color: white;
        }
        .brand-text { font-size: 15px; font-weight: 700; color: #e8e8f0; }
        .brand-sub { font-size: 11px; color: #888; }

        .xp-row { display: flex; gap: 8px; }
        .xp-pill {
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px; font-weight: 600;
        }
        .xp-pill.xp { background: #1a2a1a; color: #4ade80; border: 1px solid #2a4a2a; }
        .xp-pill.str { background: #2a1a0a; color: #fb923c; border: 1px solid #4a2a0a; }

        .mode-row { display: flex; gap: 6px; margin-top: 12px; }
        .mode-btn {
          flex: 1; padding: 7px 4px;
          border: 1px solid #2a2a3a; border-radius: 8px;
          background: transparent; color: #aaa;
          font-size: 12px; cursor: pointer;
          transition: all 0.2s;
        }
        .mode-btn:hover { border-color: #e63946; color: #e8e8f0; }
        .mode-btn.active {
          background: #e63946; border-color: #e63946;
          color: white; font-weight: 600;
        }

        .sidebar-label {
          padding: 16px 16px 8px;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 1px;
          color: #555;
        }

        .sidebar-body { flex: 1; overflow-y: auto; padding: 0 10px 10px; }
        .sidebar-body::-webkit-scrollbar { width: 4px; }
        .sidebar-body::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }

        .suggest-btn {
          width: 100%; text-align: left;
          padding: 9px 12px; border-radius: 8px;
          background: transparent; border: none;
          color: #bbb; font-size: 13px;
          cursor: pointer; display: flex; align-items: center; gap: 8px;
          transition: all 0.15s; margin-bottom: 2px;
        }
        .suggest-btn:hover { background: #1e1e2a; color: #e8e8f0; }
        .suggest-icon { font-size: 15px; flex-shrink: 0; }

        .sidebar-footer {
          padding: 12px;
          border-top: 1px solid #2a2a3a;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sb-btn {
          padding: 8px 12px; border-radius: 8px;
          font-size: 13px; cursor: pointer;
          text-align: center; transition: all 0.15s;
          text-decoration: none; display: block;
        }
        .sb-btn.outline { border: 1px solid #3a3a4a; background: transparent; color: #aaa; }
        .sb-btn.outline:hover { border-color: #e63946; color: #e63946; }
        .sb-btn.ghost { border: none; background: transparent; color: #666; }
        .sb-btn.ghost:hover { color: #e8e8f0; }

        .chat-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        .chat-header {
          padding: 14px 20px;
          border-bottom: 1px solid #2a2a3a;
          background: #16161f;
          display: flex; align-items: center; gap: 12px;
        }
        .hamburger {
          width: 36px; height: 36px; border-radius: 8px;
          background: transparent; border: 1px solid #2a2a3a;
          color: #aaa; cursor: pointer; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .hamburger:hover { border-color: #e63946; color: #e63946; }

        .agent-info { flex: 1; }
        .agent-name { font-size: 15px; font-weight: 700; }
        .agent-status {
          font-size: 12px;
          color: #4ade80;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .status-dot { width: 7px; height: 7px; background: #4ade80; border-radius: 50%; }
        .provider-badge {
          padding: 3px 10px; border-radius: 20px; font-size: 11px;
          background: #1a1a2a; border: 1px solid #3a3a4a; color: #888;
        }
        .provider-badge.offline { color: #fb923c; border-color: #4a2a0a; background: #2a1a0a; }

        .head-actions { display: flex; gap: 6px; }
        .head-btn {
          width: 34px; height: 34px; border-radius: 8px;
          background: transparent; border: 1px solid #2a2a3a;
          color: #aaa; cursor: pointer; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; text-decoration: none;
        }
        .head-btn:hover { border-color: #555; color: #e8e8f0; }
        .head-btn.tts-on { border-color: #4ade80; color: #4ade80; background: #1a2a1a; }

        .chips-row {
          padding: 10px 20px;
          display: flex; gap: 8px; flex-wrap: wrap;
          border-bottom: 1px solid #2a2a3a; background: #16161f;
        }
        .chip {
          padding: 5px 14px; border-radius: 20px;
          background: #1e1e2a; border: 1px solid #2a2a3a;
          color: #bbb; font-size: 12px; cursor: pointer;
          transition: all 0.15s; white-space: nowrap;
        }
        .chip:hover { background: #e63946; border-color: #e63946; color: white; }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .messages-area::-webkit-scrollbar { width: 4px; }
        .messages-area::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }

        .msg-row {
          display: flex;
          gap: 10px;
          animation: fadeIn 0.3s ease;
        }
        .msg-row.user { flex-direction: row-reverse; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .bot-avatar {
          width: 36px; height: 36px; flex-shrink: 0;
          background: linear-gradient(135deg, #e63946, #c1121f);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 700; color: white;
          align-self: flex-end;
        }

        .bubble {
          max-width: 72%;
          padding: 12px 16px;
          border-radius: 18px;
          line-height: 1.6;
          font-size: 14px;
          position: relative;
        }
        .bubble-bot {
          background: #1e1e2a;
          border: 1px solid #2a2a3a;
          border-bottom-left-radius: 4px;
        }
        .bubble-user {
          background: linear-gradient(135deg, #e63946, #c1121f);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .bot-content { color: #e0e0e8; }
        .bot-content strong { color: #fff; }
        .bot-content code {
          background: #0a0a12;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Fira Code', monospace;
          font-size: 13px;
          color: #a78bfa;
        }
        .bot-content table {
          border-collapse: collapse;
          margin: 10px 0;
          width: 100%;
        }
        .bot-content td, .bot-content th {
          border: 1px solid #3a3a4a;
          padding: 6px 10px;
          font-size: 13px;
        }
        .bot-content ul { padding-left: 18px; margin: 8px 0; }
        .bot-content li { margin: 4px 0; }
        .bot-content h5 { color: #fff; margin: 10px 0 6px; font-size: 14px; }
        .example { display: block; margin: 6px 0; color: #a78bfa; }

        .msg-time {
          display: block;
          font-size: 10px;
          color: #555;
          margin-top: 5px;
          text-align: right;
        }
        .bubble-user .msg-time { color: rgba(255,255,255,0.5); }

        .typing-bubble { padding: 14px 18px; }
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #555;
          border-radius: 50%;
          margin: 0 2px;
          animation: bounce 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); background: #e63946; }
        }

        .input-area {
          padding: 16px 20px;
          border-top: 1px solid #2a2a3a;
          background: #16161f;
        }
        .input-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          background: #1e1e2a;
          border: 1px solid #2a2a3a;
          border-radius: 16px;
          padding: 8px 12px;
          transition: border-color 0.2s;
        }
        .input-row:focus-within { border-color: #e63946; }

        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #e8e8f0;
          font-size: 14px;
          resize: none;
          line-height: 1.5;
          min-height: 24px;
          max-height: 120px;
          font-family: inherit;
        }
        .chat-textarea::placeholder { color: #444; }

        .icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .icon-btn:hover { color: #e8e8f0; }
        .icon-btn.send {
          background: #e63946;
          color: white;
          border-radius: 10px;
        }
        .icon-btn.send:hover { background: #c1121f; transform: scale(1.05); }
        .icon-btn.send:disabled { background: #3a3a4a; cursor: not-allowed; transform: none; }

        .input-hint {
          font-size: 11px;
          color: #444;
          margin-top: 6px;
          text-align: center;
        }

        @media (max-width: 640px) {
          .sidebar { position: absolute; z-index: 100; height: 100%; }
          .sidebar.collapsed { width: 0; }
          .bubble { max-width: 88%; }
        }
      `}</style>

      <div className="chatbot-app">
        <Sidebar
          sidebarOpen={sidebarOpen}
          progress={progress}
          mode={mode}
          setMode={setMode}
          quickSend={quickSend}
          isTyping={isTyping}
          clearChat={clearChat}
        />

        <main className="chat-main">
          <header className="chat-header">
            <button className="hamburger" onClick={toggleSidebar}>
              ☰
            </button>
            <div className="agent-info">
              <div className="agent-name">小明 - AI Tutor Tiếng Trung</div>
              <div className="agent-status">
                <span className="status-dot" />
                Trực tuyến · Trả lời ngay lập tức
              </div>
            </div>
            <span
              className={`provider-badge ${provider === "offline" ? "offline" : ""}`}
            >
              {provider === "offline"
                ? "⚡ Offline"
                : provider === "gemini"
                  ? "♊ Gemini"
                  : provider === "anthropic"
                    ? "🤖 Claude"
                    : "🟢 Online"}
            </span>
            <div className="head-actions">
              <button
                className={`head-btn ${tts ? "tts-on" : ""}`}
                onClick={toggleTts}
                title="Đọc to (TTS)"
              >
                🔊
              </button>
              <button className="head-btn" onClick={clearChat} title="Xóa chat">
                🗑
              </button>
              <a href="lessons.html" className="head-btn" title="Bài học">
                📚
              </a>
            </div>
          </header>

          <div className="chips-row">
            {CHIPS.map((chip, index) => (
              <button
                key={index}
                className="chip"
                onClick={() => quickSend(chip.text)}
                disabled={isTyping}
              >
                {chip.icon} {chip.label}
              </button>
            ))}
          </div>

          <div className="messages-area">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            inputRef={inputRef}
            input={input}
            setInput={setInput}
            isTyping={isTyping}
            sendMessage={sendMessage}
            handleInputKeyDown={handleInputKeyDown}
            mode={mode}
          />
        </main>
      </div>
    </>
  );
}
