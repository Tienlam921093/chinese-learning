# Deploy Render + Neon

Ứng dụng nằm tại `chinese-learning-v2/chinese-learning`.

## Database: Neon PostgreSQL

1. Tạo project PostgreSQL trên Neon.
2. Chạy `chinese-learning-v2/chinese-learning/database/postgres-init.sql` trong Neon SQL Editor.
3. Lưu connection string làm biến `DATABASE_URL` trên Render.

## Backend: Render Web Service

```text
Root Directory: chinese-learning-v2/chinese-learning/backend
Runtime: Docker
Dockerfile Path: ./Dockerfile
Health Check Path: /api/health
```

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<random>
JWT_REFRESH_SECRET=<random>
SESSION_SECRET=<random>
BASE_URL=https://<backend>.onrender.com
PUBLIC_URL=https://<backend>.onrender.com
FRONTEND_URL=https://<frontend>.onrender.com
CORS_ORIGINS=https://<frontend>.onrender.com
```

## Frontend: Render Static Site

```text
Root Directory: chinese-learning-v2/chinese-learning/frontend
Build Command: (empty)
Publish Directory: .
```

Set `window.HANYU_API_BASE_URL` in `frontend/js/deploy-config.js` to the backend URL.
Register these OAuth callbacks after receiving the backend domain:

```text
https://<backend>.onrender.com/api/auth/google/callback
https://<backend>.onrender.com/api/auth/facebook/callback
```
