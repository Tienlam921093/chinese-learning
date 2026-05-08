# 漢語學習 HánYǔ — Website Học Tiếng Trung

> **Full-stack Learning Platform** | MVC Backend · JWT Auth · AI Chatbot · Spaced Repetition · SQL Server 2022 · Docker

**🎯 Highlight**: Production-ready **MVC + RESTful API** backend (Node.js/Express) với authentication, role-based access, token rotation, comprehensive error handling.

---

## 🏗️ Kiến Trúc (Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (HTML/CSS/JS)                       │
│                 (Vanilla ES6+ — see rationale below)              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│               NGINX (Reverse Proxy + Static Serve)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        ↓                                         ↓
   ┌─────────────────────┐               ┌──────────────────┐
   │  /api/* Routes      │               │  Static Assets   │
   │  Backend Server     │               │  (index.html,css)│
   └────────┬────────────┘               └──────────────────┘
            │
    ┌───────┴──────────────────┐
    ↓                          ↓
┌─────────────────────┐  ┌──────────────────────────┐
│  **BACKEND (MVC)**  │  │ **3rd Party Services**   │
│                     │  │ - OpenAI / Anthropic API │
│  ├─ Controllers     │  │ - Email Service          │
│  ├─ Routes          │  │ - Payment (Momo, VNPay)  │
│  ├─ Models          │  │ - OAuth (Google/FB)      │
│  ├─ Middleware      │  │                          │
│  └─ Services        │  │                          │
└────────┬────────────┘  └──────────────────────────┘
         │
         ↓
   ┌─────────────────────────────────────────────┐
   │   **DATABASE (SQL Server 2022)**             │
   │   - Users, Lessons, Vocabulary               │
   │   - Progress (Spaced Repetition)             │
   │   - RefreshTokens (Token Rotation)           │
   │   - ChatHistory, Orders, etc.                │
   └─────────────────────────────────────────────┘
```

### Backend MVC Flow

**Example: User Completes Lesson**

```
Frontend POST /api/lessons/1/complete
    ↓
Route: lessons.routes.js → authenticate → lessonController.completeLessonFlow
    ↓
Controller: Validate input → call model → update XP → return user
    ↓
Model: UPDATE UserProgress WHERE user_id=X
      UPDATE Users SET xp = xp + 100
      (Transaction: ROLLBACK on error)
    ↓
Response: { success: true, user: {...}, newXp: 1200 }
```

---

## 🔐 Security Checklist

- Refresh token được lưu bằng `httpOnly cookie` để giảm rủi ro XSS.
- Access token ở frontend chỉ giữ trong `sessionStorage` để giảm thời gian sống trên trình duyệt.
- Auth endpoints đã có rate limit cho `POST /api/auth/login` và `POST /api/auth/forgot-password`.
- Payment callback xác minh lại `amount`, `currency`, `merchant id`, và `payment environment` trước khi ghi nhận trạng thái đơn hàng.
- Không commit file secret thật: chỉ giữ `secrets/*.example` trong repo.

## 💳 Payment Hardening

- VNPay:
  - verify chữ ký
  - đối chiếu `vnp_Amount` với số tiền trong đơn hàng
  - đối chiếu `vnp_CurrCode === VND`
  - đối chiếu `vnp_TmnCode` với merchant config
  - kiểm tra `PAYMENT_ENVIRONMENT` khớp `VNPAY_URL`
- MoMo:
  - verify chữ ký
  - đối chiếu `amount` với số tiền trong đơn hàng
  - đối chiếu `partnerCode`
  - kiểm tra `PAYMENT_ENVIRONMENT` khớp `MOMO_API_URL`

## 🚀 Deployment Notes

- Production nên dùng env riêng cho payment, OAuth, AI, SMTP và database.
- Không dùng sandbox key cho live demo.
- Trước khi share repo công khai, xóa `node_modules/` local và đảm bảo không có file `secrets/*.env` nào bị track.
- Có thể thêm GitHub Actions để chạy test và build trước khi deploy.

---

## 📁 Cấu Trúc Folder

```
chinese-learning/
├── 📂 frontend/                    # Giao diện người dùng (HTML/CSS/JS)
│   ├── 📄 index.html               # Trang chủ - Landing page
│   ├── 📂 css/
│   │   └── 📄 style.css            # CSS3 + Bootstrap override + animations
│   ├── 📂 js/
│   │   └── 📄 main.js              # JavaScript ES6+ — API helper, utils, auth
│   ├── 📂 pages/
│   │   ├── 📄 login.html           # Đăng nhập → JWT Token
│   │   ├── 📄 register.html        # Đăng ký tài khoản mới
│   │   ├── 📄 lessons.html         # Dashboard bài học HSK 1-6
│   │   ├── 📄 vocabulary.html      # Flashcard từ vựng (Spaced Repetition)
│   │   ├── 📄 quiz.html            # Trắc nghiệm từ vựng
│   │   └── 📄 chatbot.html         # AI Tutor 小明 — Chat tiếng Trung
│   └── 📂 assets/img/              # Hình ảnh, favicon
│
├── 📂 backend/                     # RESTful API Server
│   ├── 📄 server.js                # Express app — entry point, middleware
│   ├── 📄 Dockerfile               # Docker image cho backend (Node 20 Alpine)
│   ├── 📄 package.json             # NPM dependencies
│   ├── 📄 .env.example             # Template biến môi trường
│   ├── 📂 config/
│   │   └── 📄 db.js                # Kết nối SQL Server 2022 (mssql pool)
│   ├── 📂 middleware/
│   │   └── 📄 auth.middleware.js   # JWT Bearer Token verification
│   └── 📂 routes/
│       ├── 📄 auth.routes.js       # POST /auth/login, /register, /refresh
│       ├── 📄 lessons.routes.js    # GET/POST /lessons
│       ├── 📄 vocabulary.routes.js # GET /vocabulary, /flashcard
│       ├── 📄 chatbot.routes.js    # POST /chatbot/chat (OpenAI/Anthropic)
│       └── 📄 progress.routes.js   # GET/POST /progress/xp
│
├── 📂 database/
│   └── 📄 init.sql                 # SQL Server 2022 — tạo DB, bảng, seed data
│
├── 📂 nginx/
│   └── 📄 nginx.conf               # Nginx reverse proxy config
│
├── 📄 docker-compose.yml           # Orchestrate: SQL Server + Backend + Frontend
└── 📄 README.md                    # Tài liệu này
```

---

## 🛠 Công Nghệ Sử Dụng

| Tầng             | Công nghệ                             | Mục đích                             |
| ---------------- | ------------------------------------- | ------------------------------------ |
| **Frontend**     | HTML5, CSS3                           | Cấu trúc & giao diện                 |
| **UI Framework** | Bootstrap 5.3                         | Grid, components, responsive         |
| **Animation**    | AOS (Animate On Scroll)               | Hiệu ứng cuộn trang                  |
| **Font**         | Google Fonts (Noto Serif SC)          | Hiển thị chữ Hán đẹp                 |
| **Icons**        | Font Awesome 6                        | Biểu tượng                           |
| **Backend**      | Node.js 20 + Express 4                | RESTful API server                   |
| **Database**     | Microsoft SQL Server 2022             | Lưu trữ dữ liệu                      |
| **SQL Driver**   | mssql (npm)                           | Kết nối SQL Server từ Node.js        |
| **Auth**         | JWT (jsonwebtoken) + bcryptjs         | Xác thực người dùng                  |
| **AI Chatbot**   | OpenAI GPT-4o-mini / Anthropic Claude | AI Tutor tiếng Trung                 |
| **Container**    | Docker + Docker Compose               | Đóng gói & deploy                    |
| **Web Server**   | Nginx (Alpine)                        | Serve frontend, reverse proxy        |
| **Speech**       | Web Speech API                        | Phát âm tiếng Trung, nhận dạng giọng |
| **Algorithm**    | Spaced Repetition SM-2                | Ôn tập từ vựng thông minh            |

---

## 🎨 Frontend Architecture (Vanilla ES6+ vs React)

### Why Vanilla JavaScript?

| Aspect              | Vanilla JS               | React                    |
| ------------------- | ------------------------ | ------------------------ |
| **Project Scope**   | Medium (6 pages)         | Better for large apps    |
| **Bundle Size**     | ~50KB (with helpers)     | ~150KB+ (React+ReactDOM) |
| **Learning Curve**  | Simpler for solo learner | More complex setup       |
| **Server Load**     | Static HTML → fast       | SPA rendering            |
| **API Integration** | Direct fetch()           | Added abstraction layer  |
| **This Project**    | ✅ Sufficient            | 🔄 See roadmap           |

**Decision**: Vanilla JS is **practical** for MVP + makes backend MVC shine (server not burdened with SPA re-renders).

### 🔄 React Migration Roadmap (Next Phase)

If this evolves to production or for **frontend engineer roles**, the plan is:

```
frontend/ (current Vanilla JS)
    └── migrate to →
frontend-react/
    ├── src/
    │   ├── components/
    │   │   ├── Auth/ (Login, Register, Profile)
    │   │   ├── Lessons/ (LessonList, LessonDetail)
    │   │   ├── Vocabulary/ (Flashcard, VocabList)
    │   │   ├── Quiz/
    │   │   └── Chatbot/
    │   ├── pages/
    │   ├── hooks/
    │   │   ├── useAuth.js (JWT token manage)
    │   │   ├── useFetch.js (API calls)
    │   │   └── useVocabReview.js (Spaced Repetition)
    │   ├── services/
    │   │   └── apiClient.js (centralized fetch + token refresh)
    │   └── App.jsx (React Router v6)
    ├── tailwind.config.js (or styled-components)
    └── Dockerfile (npm run build → static serve)
```

**📋 See [`REACT_MIGRATION.md`](REACT_MIGRATION.md) for phase-by-phase implementation guide.**

**Rationale**: Current backend API is **perfectly designed** for React SPA — no changes needed, just swap frontend!

---

## 🚀 Setup & Deployment

### 🌍 Cách Chạy Demo Ngay (Không Cần Backend)

**Chỉ cần mở file HTML bằng Live Server hoặc trực tiếp trình duyệt:**

```bash
# Cách 1: Dùng VS Code Live Server Extension
# Chuột phải vào frontend/index.html → "Open with Live Server"

# Cách 2: Python HTTP server
cd frontend
python -m http.server 5500
# Mở http://localhost:5500

# Cách 3: Node.js serve
npx serve frontend -p 5500
```

✅ **Demo mode** hoạt động 100% không cần backend:

- Đăng nhập: nhấn "Đăng nhập Demo"
- Chatbot: có demo replies mẫu
- Flashcard, Quiz: dùng data local

---

## 🐳 Development Setup

### Option A: Docker (Recommended)

**Fastest**: All services in one command.

```bash
# 1. Clone & enter project
git clone <repo>
cd chinese-learning

# 2. Copy env template
cp backend/.env.example backend/.env

# 3. Add ONE of these AI providers to backend/.env:
#    Option A1: OpenAI (GPT-4o-mini — cheapest)
echo "AI_PROVIDER=openai" >> backend/.env
echo "OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE" >> backend/.env

#    Option A2: Anthropic Claude (Claude 3.5 Haiku)
echo "AI_PROVIDER=anthropic" >> backend/.env
echo "ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE" >> backend/.env

# 4. Start all services (SQL Server + Backend + Frontend + Nginx)
docker compose up -d

# 5. Wait ~60sec for SQL Server to be ready, then init database:
docker exec hanyu-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "HanYu@2024!" \
  -i /docker-entrypoint-initdb.d/init.sql

# 6. Access:
#    - Frontend: http://localhost:8080
#    - API Health: http://localhost:3000/api/health
#    - Swagger Docs (if implemented): http://localhost:3000/api-docs
```

**Get API Keys:**

- **OpenAI**: Go to [platform.openai.com](https://platform.openai.com/account/api-keys) → Create API key
- **Anthropic**: Go to [console.anthropic.com](https://console.anthropic.com/account/keys) → Create API key

### Option B: Local Node.js (For Backend Development)

```bash
# 1. Ensure SQL Server 2022 is running (local or Docker)
docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=HanYu@2024!' \
  -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest

# 2. Backend setup
cd backend
npm install
cp .env.example .env
# (Edit .env with your AI provider key)

# 3. Run migrations (if applicable)
# node scripts/initDb.js  # if script exists

# 4. Start dev server
npm run dev  # Watches with nodemon

# 5. Frontend (in new terminal)
cd frontend
# Option 1: VS Code Live Server extension
# Option 2: Python
python -m http.server 8080
# Option 3: Node.js
npx serve -p 8080
```

---

## 🚀 Deploy Live (Railway.app — Free Tier)

---

## 🚀 Deploy Live (Railway.app — Free Tier)

**Zero-cost deployment with full-stack support.**

### Step 1: Prepare Repo

```bash
# Ensure docker-compose.yml exists at root
# .env vars are in production .env (Railway will provide)
git push origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select this repository
4. Railway auto-detects `docker-compose.yml` ✅

### Step 3: Configure Environment

In Railway dashboard:

```
ENVIRONMENT VARIABLES:
- AI_PROVIDER = openai (or anthropic)
- OPENAI_API_KEY = sk-proj-...
- ANTHROPIC_API_KEY = sk-ant-...
- SQL_PASSWORD = HanYu@2024! (or change)
- NODE_ENV = production
```

### Step 4: Deploy

Railway auto-deploys on `git push`. Check **Deployments** tab.

**Result:**

- Frontend live at: `https://your-project.railway.app`
- Backend API: `https://your-project.railway.app/api`
- Database: Managed by Railway

---

---

## 🔐 AI Chatbot Configuration

The chatbot is a **core feature** that demonstrates AI integration.

### Setting Up for Evaluators / Reviewers

If you want to **test the chatbot** locally or the evaluator wants to:

#### Option 1: Use Your Own API Key (Free Trial)

**OpenAI:**

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Add free $5 trial credits (auto-applied)
3. Get API key from dashboard
4. Add to `.env` or Railway variables:
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-proj-your-key
   ```
5. Chatbot now works in live demo!

**Anthropic (Alternative):**

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Get free $5 trial credits
3. Create API key
4. Add to `.env`:
   ```
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-your-key
   ```

#### Option 2: Offline Demo Mode (No API Needed)

If you just want to **demo without keys**, chatbot falls back to **mock replies**:

```javascript
// backend/controllers/chatbot.controller.js
// Falls back to offline demo if API fails
```

---

### Bước 1: Cài đặt (OLD — see above for better setup)

---

## � CV Highlight — Backend MVC Architecture

### Key Technical Decisions (Interview-Ready)

#### 1. **Clean MVC Separation**

- **Controllers** (`backend/controllers/`): Business logic, validation, response formatting
- **Models** (`backend/models/`): Data access layer, SQL transactions, error handling
- **Routes** (`backend/routes/`): Middleware chaining, authentication gating
- **Services** (`backend/services/`): Reusable logic (AI, Email, Payment APIs)

**Why it matters**: Scalable, testable, follows enterprise patterns.

#### 2. **JWT + Token Rotation (Security)**

- **Access Token**: 15 min (short-lived, used for API calls)
- **Refresh Token**: 30 days (long-lived, httpOnly cookie, rotated on each refresh)
- **Token Versioning**: Logout all devices by incrementing `token_version`
- **Protection**: CSRF via SameSite cookies, XSS via httpOnly

**Evidence**: [backend/models/refreshToken.model.js](backend/models/refreshToken.model.js#L50-L80) — `consumeAndRotate()` transaction.

#### 3. **Transaction-Based Database Operations**

```javascript
// Example: Updating user progress + XP + streak (atomic)
const transaction = new sql.Transaction(pool);
transaction.begin(async (err) => {
  if (err) ...
  const request = new sql.Request(transaction);
  // All 3 updates succeed or rollback together
});
```

#### 4. **OAuth Integration (Google/Facebook)**

- Stateless token exchange (in-memory auth code map)
- Automatic user provisioning (first-time login creates account)
- Duplicate account prevention (checks existing email)

**Local setup**

- `BASE_URL=http://localhost:5000`
- `FRONTEND_URL=http://localhost:8080`
- Add these redirect URIs in Meta Developer Console / Google Console:
  - `http://localhost:5000/api/auth/facebook/callback`
  - `http://localhost:5000/api/auth/google/callback`

**Production / ngrok setup**

- `BASE_URL` phải là domain public HTTPS của backend.
- `FRONTEND_URL` phải là domain public của frontend.
- Cập nhật lại redirect URI tương ứng trong Meta/Google dashboard.
- Nếu đổi domain, phải sửa lại `BASE_URL` trước khi test OAuth.

**Facebook OAuth debug checklist**

- Kiểm tra `FACEBOOK_APP_ID` và `FACEBOOK_APP_SECRET` trong env.
- Kiểm tra app Facebook đang ở Development hay Live mode.
- Thêm tài khoản Facebook của bạn vào Roles/Testers nếu app chưa public.
- Đảm bảo `Valid OAuth Redirect URIs` khớp tuyệt đối với callback URL.
- Nếu lỗi `Failed to obtain access token`, xem log backend để biết sai secret, sai callback hay app mode.

#### 5. **AI Provider Abstraction**

```javascript
// backend/services/ai.service.js
// Swappable: OpenAI → Anthropic → Gemini
// Single SYSTEM_PROMPT, provider-agnostic call method
```

#### 6. **Spaced Repetition Algorithm (SM-2)**

- Backend calculates next review date based on **quality** (0-5)
- VP intervals: 1d, 3d, 7d, 14d, 30d
- Prevents over-studying, optimizes retention

---

## �🔧 Chạy Backend Riêng (Không Docker)

```bash
cd backend
npm install
cp .env.example .env       # Chỉnh sửa .env
node scripts/initDb.js     # Khởi tạo database (nếu SQL Server đã chạy)
npm run dev                # Chạy với nodemon (auto-reload)
```

### Yêu cầu:

- Node.js >= 18
- SQL Server 2022 (local hoặc Docker)
- OpenAI / Anthropic API Key

---

## 📡 API Endpoints

### Auth

```
POST /api/auth/register    Body: {name, email, password}
POST /api/auth/login       Body: {email, password}  → {token, user}
GET  /api/auth/me          Header: Authorization: Bearer <token>
POST /api/auth/refresh     Body: {refreshToken}
```

### Lessons

```
GET  /api/lessons                   Query: ?hsk_level=1
GET  /api/lessons/:id
POST /api/lessons/:id/complete      Body: {score, time_spent}
```

### Vocabulary

```
GET  /api/vocabulary                Query: ?hsk_level=1&search=你好
GET  /api/vocabulary/flashcard      Query: ?hsk_level=1&count=10
POST /api/vocabulary/:id/review     Body: {quality}  (SM-2: 0-5)
```

### Chatbot

```
POST /api/chatbot/chat              Body: {message, history[], mode}
GET  /api/chatbot/history           Header: Bearer token
DELETE /api/chatbot/clear           Header: Bearer token
```

### Progress

```
GET  /api/progress                  Header: Bearer token
POST /api/progress/xp               Body: {amount, reason}
```

---

## 🤖 Cấu Hình AI Chatbot

Chatbot hỗ trợ 2 provider, chọn trong `.env`:

```env
# Dùng OpenAI (GPT-4o-mini — rẻ nhất)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# Hoặc Anthropic Claude (Claude 3.5 Haiku)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

Chatbot có 3 chế độ:

- **Tự do**: Hỏi bất kỳ điều gì
- **Bài học**: Học theo cấu trúc
- **Quiz**: Ra đề thi, chấm điểm

---

## 🗄️ Database Schema (SQL Server 2022)

```
Users          — Người dùng, XP, streak, HSK level
Lessons        — Bài học (có hsk_level, emoji, duration)
Vocabulary     — Từ vựng (hanzi NVARCHAR, pinyin, meaning)
UserProgress   — Tiến độ hoàn thành bài học (UPSERT với MERGE)
VocabReviews   — Spaced Repetition (SM-2 algorithm)
ChatHistory    — Lịch sử chat với AI
QuizResults    — Kết quả bài kiểm tra
```

> **Lưu ý**: Tất cả cột tiếng Trung dùng `NVARCHAR` (Unicode) thay vì `VARCHAR`

---

## 📱 Tính Năng

- ✅ **Responsive** — Mobile-first với Bootstrap 5
- ✅ **AI Chatbot** 小明 — Dạy tiếng Trung 24/7
- ✅ **Flashcard** — Spaced Repetition SM-2
- ✅ **Quiz** — Trắc nghiệm có đồng hồ đếm ngược
- ✅ **Text-to-Speech** — Web Speech API phát âm tiếng Trung
- ✅ **Speech Recognition** — Nhập liệu bằng giọng nói
- ✅ **XP & Streak** — Gamification giữ động lực
- ✅ **JWT Auth** — Đăng nhập an toàn
- ✅ **Demo Mode** — Chạy không cần backend
- ✅ **Docker** — Deploy 1 lệnh
- ✅ **SQL Server 2022** — Collation hỗ trợ chữ Hán

---

_Made with ❤️ in Hà Nội — HánYǔ Team 2026_
