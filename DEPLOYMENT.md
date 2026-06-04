# Deploy Vercel + Railway

Repo nay dat ung dung that trong `chinese-learning-v2/chinese-learning`, vi vay khong nen de Vercel/Railway tu doan root mac dinh.

## Railway: backend

Railway service backend dung cau hinh o repo root:

- `railway.json`
- `Dockerfile.railway`

Bien moi truong bat buoc tren Railway:

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=<random-64-byte-secret>
JWT_REFRESH_SECRET=<random-64-byte-secret>
SESSION_SECRET=<random-session-secret>

DB_SERVER=<sql-server-host>
DB_PORT=1433
DB_NAME=HanYuDB
DB_USER=<sql-user>
DB_PASSWORD=<sql-password>

BASE_URL=https://<railway-backend-domain>
PUBLIC_URL=https://<railway-backend-domain>
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

Luu y: backend dang dung SQL Server (`mssql`), khong phai PostgreSQL. Neu dung Railway database mac dinh PostgreSQL thi app se khong ket noi duoc. Can SQL Server reachable tu Railway hoac mot Railway service rieng chay image SQL Server co volume.

## Vercel: frontend

Vercel dung `vercel.json` o repo root va output static tu:

```text
chinese-learning-v2/chinese-learning/frontend
```

Them bien moi truong tren Vercel:

```env
HANYU_API_BASE_URL=https://<railway-backend-domain>
```

Gia tri tren co the co hoac khong co `/api`; frontend se tu them `/api` neu can.

Sau khi doi domain deploy, cap nhat OAuth callback tren Google/Facebook:

```text
https://<railway-backend-domain>/api/auth/google/callback
https://<railway-backend-domain>/api/auth/facebook/callback
```
