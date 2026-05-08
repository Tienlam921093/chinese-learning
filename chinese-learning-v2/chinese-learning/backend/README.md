# HánYǔ Backend v2.1.0

## Kiến trúc MVC
```
backend/
├── config/          ← DB, Passport, Env validation
├── models/          ← Tầng Data (DB queries)
├── services/        ← Tầng Business Logic
├── controllers/     ← Tầng xử lý request/response
├── routes/          ← Định tuyến (không có logic)
├── middleware/      ← Auth, Rate limit
└── server.js        ← Entry point
```

## Setup
1. Copy `secrets/backend.env.example` → `secrets/backend.env`
2. Điền đầy đủ các key
3. Chạy SQL migrations trong `/sql/`
4. `docker compose up -d`

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- POST /api/auth/logout-all
- GET  /api/auth/me
- POST /api/auth/change-password
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET  /api/auth/leaderboard
- GET  /api/lessons
- POST /api/payment/vnpay/create
- POST /api/payment/momo/create
- POST /api/chatbot/chat
