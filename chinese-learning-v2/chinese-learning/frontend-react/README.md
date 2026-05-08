# Frontend React — HánYǔ

**Status**: 🚧 Scaffolding Phase

This folder contains the **React migration** of the frontend, maintaining 100% API compatibility with the existing backend.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (Vite — fast!)
npm run dev

# 3. Open http://localhost:5173
```

## What's Included

✅ **Scaffolded Structure**:

- `src/App.jsx` — React Router setup
- `src/context/AuthContext.jsx` — Global auth state (login/logout)
- `src/services/apiClient.js` — Token refresh + centralized API calls
- `src/hooks/useAuth.js`, `useFetch.js` — Custom hooks
- `src/pages/LessonList.jsx` — Example page showing pattern

🔄 **Next Steps** (see [../REACT_MIGRATION.md](../REACT_MIGRATION.md)):

- Phase 2: Complete API services layer
- Phase 3: Build remaining pages (Vocabulary, Quiz, Chatbot, Profile)
- Phase 4: Add Spaced Repetition logic
- Phase 5: Testing + deployment

## Architecture Highlights

### Auth Flow

```
User clicks Login
  ↓
LoginPage.jsx → apiClient.post('/auth/login')
  ↓
Backend returns { token, user }
  ↓
AuthContext updates global user state
  ↓
useAuth() hook provides to all components
```

### API Integration

```
Component calls useFetch('/lessons')
  ↓
useFetch hook uses apiClient.get()
  ↓
apiClient adds Authorization header + handles 401 refresh
  ↓
Returns { data, loading, error }
```

### Page Protection

```
MainLayout requires AuthProvider
  ↓
Protected routes check useAuth().isAuthenticated
  ↓
Unauthenticated users redirected to /login
```

## Key Differences from Vanilla JS

| Vanilla                       | React                         |
| ----------------------------- | ----------------------------- |
| jQuery/DOM manipulation       | React state/hooks             |
| Global `helpers.js` functions | Context + custom hooks        |
| Inline event handlers         | Component props + handlers    |
| Page reloads                  | SPA navigation (React Router) |

## Deployment

```bash
# Build for production
npm run build

# Output: dist/ folder (static files)
# Deploy to: same Docker container as vanilla frontend
```

---

**See [../REACT_MIGRATION.md](../REACT_MIGRATION.md) for detailed implementation plan.**
