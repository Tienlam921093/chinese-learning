# setup-secrets.ps1
# Run: powershell -ExecutionPolicy ByPass -File setup-secrets.ps1

$secretsDir = "D:\chinese learning web\chinese-learning-v2\chinese-learning\secrets"

if (-not (Test-Path $secretsDir)) {
    New-Item -ItemType Directory -Path $secretsDir | Out-Null
    Write-Host "[OK] Created secrets folder" -ForegroundColor Green
}

function New-RandomHex {
    param([int]$bytes = 64)
    $arr = New-Object byte[] $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($arr)
    return ($arr | ForEach-Object { $_.ToString("x2") }) -join ""
}

function New-StrongPassword {
    param([int]$length = 24)
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-='
    $bytes = New-Object byte[] ($length)
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $password = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
    return $password
}

$sqlFile = "$secretsDir\sqlserver.env"
if (-not (Test-Path $sqlFile)) {
    $saPassword = New-StrongPassword 28
    $content = "MSSQL_SA_PASSWORD=$saPassword"
    [System.IO.File]::WriteAllText($sqlFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "[OK] Created secrets\sqlserver.env" -ForegroundColor Green
} else {
    Write-Host "[SKIP] secrets\sqlserver.env already exists" -ForegroundColor Yellow
}

$backendFile = "$secretsDir\backend.env"
if (-not (Test-Path $backendFile)) {
    $dbPassword = New-StrongPassword 28
    $jwt     = New-RandomHex 64
    $refresh = New-RandomHex 64
    $session = New-RandomHex 32

    $lines = @(
        "# HanYu Backend Secrets - DO NOT COMMIT",
        "",
        "# DATABASE",
        "DB_USER=sa",
        "DB_PASSWORD=$dbPassword",
        "",
        "# JWT - auto generated",
        "JWT_SECRET=$jwt",
        "JWT_REFRESH_SECRET=$refresh",
        "JWT_EXPIRES=15m",
        "JWT_EXPIRES_SECONDS=900",
        "",
        "# SESSION - auto generated",
        "SESSION_SECRET=$session",
        "",
        "# AI - fill in your key",
        "AI_PROVIDER=openai",
        "OPENAI_API_KEY=REPLACE_WITH_REAL_KEY",
        "OPENAI_MODEL=gpt-4o-mini",
        "ANTHROPIC_API_KEY=REPLACE_WITH_REAL_KEY",
        "",
        "# OAUTH - fill in your keys",
        "GOOGLE_CLIENT_ID=REPLACE_WITH_REAL_ID",
        "GOOGLE_CLIENT_SECRET=REPLACE_WITH_REAL_SECRET",
        "FACEBOOK_APP_ID=REPLACE_WITH_REAL_ID",
        "FACEBOOK_APP_SECRET=REPLACE_WITH_REAL_SECRET",
        "",
        "# VNPAY - fill in your keys",
        "VNPAY_TMN_CODE=REPLACE_WITH_REAL_CODE",
        "VNPAY_HASH_SECRET=REPLACE_WITH_REAL_SECRET",
        "VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        "",
        "# MOMO - fill in your keys",
        "MOMO_PARTNER_CODE=MOMO",
        "MOMO_ACCESS_KEY=REPLACE_WITH_REAL_KEY",
        "MOMO_SECRET_KEY=REPLACE_WITH_REAL_SECRET",
        "MOMO_API_URL=https://test-payment.momo.vn/v2/gateway/api/create",
        "",
        "# EMAIL",
        "SMTP_HOST=smtp.gmail.com",
        "SMTP_PORT=587",
        "SMTP_SECURE=false",
        "SMTP_USER=REPLACE_WITH_GMAIL",
        "SMTP_PASS=REPLACE_WITH_APP_PASSWORD",
        "",
        "# URLS",
        "BASE_URL=http://localhost:5000",
        "PUBLIC_URL=https://REPLACE_WITH_NGROK_URL.ngrok-free.app"
    )

    $text = $lines -join "`r`n"
    [System.IO.File]::WriteAllText($backendFile, $text, [System.Text.Encoding]::UTF8)
    Write-Host "[OK] Created secrets\backend.env" -ForegroundColor Green
    Write-Host "     JWT, REFRESH, SESSION secrets auto-generated" -ForegroundColor Cyan
} else {
    Write-Host "[SKIP] secrets\backend.env already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open secrets\backend.env"
Write-Host "  2. Fill in: OPENAI_API_KEY, GOOGLE_*, FACEBOOK_*, VNPAY_*, MOMO_*, SMTP_*"
Write-Host "  3. docker compose down"
Write-Host "  4. docker compose up -d"
Write-Host ""
Write-Host "WARNING: Rotate all exposed keys!" -ForegroundColor Red
Write-Host "  OpenAI:   platform.openai.com -> API Keys"
Write-Host "  Google:   console.cloud.google.com -> Credentials"
Write-Host "  Facebook: developers.facebook.com -> Settings"
