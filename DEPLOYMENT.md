# Deploy Vercel + Render

Repo nay dat ung dung that trong `chinese-learning-v2/chinese-learning`, vi vay khong nen de Vercel/Render tu doan root mac dinh.

## Render: backend

Render Web Service dung Blueprint o repo root:

- `render.yaml`
- `Dockerfile.railway`

Khi tao Blueprint, Render se tu sinh `JWT_SECRET`, `JWT_REFRESH_SECRET` va
`SESSION_SECRET`. Nhap cac bien con lai khi Render yeu cau:

```env
NODE_ENV=production
DB_SERVER=<sql-server-host>
DB_PORT=1433
DB_NAME=HanYuDB
DB_USER=<sql-user>
DB_PASSWORD=<sql-password>

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

Luu y: backend dang dung SQL Server (`mssql`), khong phai PostgreSQL. SQL Server
phai cho phep ket noi cong khai tu Render; Neon PostgreSQL khong tuong thich voi
backend hien tai.

## Vercel: frontend

Vercel dung `vercel.json` o repo root va output static tu:

```text
chinese-learning-v2/chinese-learning/frontend
```

Them bien moi truong tren Vercel:

```env
HANYU_API_BASE_URL=https://<render-backend-domain>
```

Gia tri tren co the co hoac khong co `/api`; frontend se tu them `/api` neu can.

Sau khi doi domain deploy, cap nhat OAuth callback tren Google/Facebook:

```text
https://<render-backend-domain>/api/auth/google/callback
https://<render-backend-domain>/api/auth/facebook/callback
```
