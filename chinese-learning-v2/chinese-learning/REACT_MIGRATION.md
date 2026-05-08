# React Migration Roadmap

**Status**: Vanilla JS MVP Complete ✅ → Ready for React Port 🚀

## Why Port to React?

1. **Production Scalability**: Component reusability, state management
2. **Interview Appeal**: Modern frontend stack (React, TypeScript optional)
3. **Backend Integration**: Existing API is **already perfect** for React SPA
4. **Zero Backend Changes**: API contracts stay the same, only swap frontend

---

## Architecture (Frontend-React)

```
frontend-react/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── index.jsx
│   ├── App.jsx (Router setup)
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── LoginPage.jsx (form → POST /api/auth/login)
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ProfilePage.jsx (update profile, change password)
│   │   │   └── OAuth/GoogleCallback.jsx
│   │   ├── Lessons/
│   │   │   ├── LessonList.jsx (GET /api/lessons)
│   │   │   ├── LessonDetail.jsx (interactive lesson page)
│   │   │   └── LessonCard.jsx
│   │   ├── Vocabulary/
│   │   │   ├── FlashcardDeck.jsx (Spaced Repetition logic)
│   │   │   ├── VocabList.jsx
│   │   │   └── ReviewForm.jsx (SM-2 quality selection)
│   │   ├── Quiz/
│   │   │   ├── QuizPage.jsx
│   │   │   ├── QuestionCard.jsx
│   │   │   └── QuizResults.jsx
│   │   ├── Chatbot/
│   │   │   ├── ChatbotPanel.jsx (message UI)
│   │   │   ├── MessageBubble.jsx
│   │   │   └── ChatHistory.jsx
│   │   ├── Common/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   └── Layout/
│   │       └── MainLayout.jsx
│   ├── hooks/
│   │   ├── useAuth.js (auth state, login/logout)
│   │   ├── useFetch.js (GET/POST wrapper with error handling)
│   │   ├── useVocabReview.js (Spaced Repetition logic)
│   │   └── useLocalStorage.js (persist user data)
│   ├── services/
│   │   ├── apiClient.js (centralized fetch + token refresh)
│   │   ├── authService.js (login, register, refresh)
│   │   ├── lessonService.js (fetch lessons, complete)
│   │   └── vocabService.js (fetch vocab, submit reviews)
│   ├── context/
│   │   ├── AuthContext.jsx (global auth state)
│   │   └── NotificationContext.jsx (toast messages)
│   ├── styles/
│   │   ├── tailwind.css (or styled-components)
│   │   └── globals.css
│   └── utils/
│       ├── constants.js (API endpoints, HSK levels)
│       └── helpers.js (format date, score calculation)
├── package.json
├── vite.config.js (or Create React App)
├── tailwind.config.js (or remove if using other CSS)
└── Dockerfile (npm run build → production serve)
```

---

## Step-by-Step Migration Plan

### Phase 1: Setup (1 hour)

```bash
# Option A: Vite (recommended — faster)
npm create vite@latest frontend-react -- --template react
cd frontend-react
npm install
npm run dev

# Option B: Create React App
npx create-react-app frontend-react
```

### Phase 2: API Integration Layer (2 hours)

```javascript
// src/services/apiClient.js
export const apiClient = {
  async get(endpoint) {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API_BASE}/api${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      // Refresh token logic
      await this.refreshToken();
      return this.get(endpoint); // Retry
    }
    return res.json();
  },

  async post(endpoint, body) {
    // Similar to GET with POST method
  },
};
```

### Phase 3: Auth System (2 hours)

```javascript
// src/hooks/useAuth.js
export const useAuth = () => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const res = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", res.token);
    setUser(res.user);
  };

  useEffect(() => {
    // Restore session on mount (like helpers.js restoreAuthSession)
    const token = localStorage.getItem("accessToken");
    if (token) {
      apiClient.get("/auth/me").then(setUser);
    }
  }, []);

  return { user, login, logout, isLoading };
};
```

### Phase 4: Page Components (4-6 hours)

- Convert each vanilla HTML page → React component
- Replace DOM manipulation with React state/hooks
- Keep API calls identical (backend unchanged)

**Example: Lessons → LessonList.jsx**

```javascript
export const LessonList = () => {
  const [lessons, setLessons] = useState([]);
  const [hskLevel, setHskLevel] = useState(1);

  useEffect(() => {
    apiClient.get(`/lessons?hsk_level=${hskLevel}`).then(setLessons);
  }, [hskLevel]);

  return (
    <div>
      <select onChange={(e) => setHskLevel(e.target.value)}>
        {[1, 2, 3, 4, 5, 6].map((l) => (
          <option>{l}</option>
        ))}
      </select>
      <div className="grid">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
};
```

### Phase 5: Advanced Features (2-4 hours)

- Chatbot message streaming (with `fetch(..., { signal }))`)
- Spaced Repetition logic (SM-2 algorithm in `useVocabReview`)
- Error boundaries + retry logic

### Phase 6: Testing & Deployment (1-2 hours)

- Jest unit tests for hooks
- E2E tests (Playwright/Cypress)
- Build: `npm run build`
- Docker image using React build output

---

## Estimated Timeline

- **Part-time (3-4 hours/day)**: 5-7 days
- **Full-time (8 hours/day)**: 2-3 days
- **With testing & polish**: Add 1-2 days

---

## Key Points for Evaluator

1. **No Backend Changes**: All API contracts remain identical
   - Backend is already optimized (proved in Vanilla version)
   - React just replaces UI layer

2. **Code Quality Preserved**:
   - Same error handling patterns
   - Same security (JWT, httpOnly cookies)
   - Same performance considerations

3. **Demonstrates**:
   - Modern React patterns (hooks, context, custom hooks)
   - API integration knowledge
   - Frontend architecture thinking
   - Ability to migrate between tech stacks

---

## Current Status

- ✅ Vanilla JS MVP complete + tested
- ✅ Backend API production-ready
- 🔄 React port ready to begin
- 📋 Structure planned above

**To Start React Migration**:

```bash
npm create vite@latest frontend-react -- --template react
cd frontend-react && npm install
# Copy structure from REACT_MIGRATION.md → start Phase 1
```
