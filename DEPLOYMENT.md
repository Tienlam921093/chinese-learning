# Deploy Vercel + Render + Neon

Ung dung nam tai `chinese-learning-v2/chinese-learning`.

## Neon PostgreSQL

1. Tao project PostgreSQL tren Neon.
2. Chay `chinese-learning-v2/chinese-learning/database/postgres-init.sql` trong Neon SQL Editor.
3. Dat connection string pooled cua Neon vao bien `DATABASE_URL` tren Render.

## Render: backend

Render Web Service dung Blueprint tai `render.yaml` va Docker image duoc build boi
`Dockerfile.railway`.

Khi tao Blueprint, Render se tu sinh `JWT_SECRET`, `JWT_REFRESH_SECRET` va
`SESSION_SECRET`. Nhap cac bien con lai khi Render yeu cau:

```env
DATABASE_URL=postgresql://...
BASE_URL=https://<render-backend-domain>
PUBLIC_URL=https://<render-backend-domain>
FRONTEND_URL=https://<vercel-frontend-domain>
```

Optional:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=<key>
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
FACEBOOK_APP_ID=<id>
FACEBOOK_APP_SECRET=<secret>
SMTP_HOST=<host>
SMTP_USER=<user>
SMTP_PASS=<pass>
```

## Vercel: frontend

Vercel dung `vercel.json` o repo root va output static tu:

```text
chinese-learning-v2/chinese-learning/frontend
```

Them bien moi truong tren Vercel:

```env
HANYU_API_BASE_URL=https://<render-backend-domain>
```

Sau khi co domain production, cap nhat OAuth callback tren Google/Facebook:

```text
https://<render-backend-domain>/api/auth/google/callback
https://<render-backend-domain>/api/auth/facebook/callback
```
