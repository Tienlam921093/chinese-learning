# HanYu - Script khoi dong tu dong
# Chay bang: Right-click -> Run with PowerShell

Write-Host ""
Write-Host " =========================================" -ForegroundColor Cyan
Write-Host "   HanYu - Website Hoc Tieng Trung" -ForegroundColor Cyan
Write-Host " =========================================" -ForegroundColor Cyan
Write-Host ""

# Chuyen den thu muc chua script nay
Set-Location $PSScriptRoot

# Kiem tra Docker co dang chay khong
$dockerRunning = $false
try {
    docker info 2>$null | Out-Null
    $dockerRunning = $LASTEXITCODE -eq 0
} catch {}

if (-not $dockerRunning) {
    Write-Host " [!] Docker Desktop chua chay. Dang mo..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "     Doi 40 giay cho Docker khoi dong..." -ForegroundColor Gray
    Start-Sleep -Seconds 40
}

# Khoi dong containers (toan bo stack)
Write-Host " [1/3] Khoi dong full stack (sqlserver, backend, frontend)..." -ForegroundColor Green
# Dùng force-recreate để nạp lại env và image nếu cần
docker compose up -d --force-recreate

if ($LASTEXITCODE -ne 0) {
    Write-Host " [!] Loi! Kiem tra Docker Desktop va thu lai." -ForegroundColor Red
    Read-Host " Nhan Enter de thoat"
    exit 1
}

# Doi services san sang (tăng thời gian để SQL Server có thể khởi động)
Write-Host " [2/3] Doi services khoi dong (15 giay)..." -ForegroundColor Green
Start-Sleep -Seconds 15

# Mo trinh duyet (frontend)
Write-Host " [3/3] Mo trinh duyet..." -ForegroundColor Green
Start-Process "http://localhost:8080"

Write-Host ""
Write-Host " =========================================" -ForegroundColor Cyan
Write-Host "   Website: http://localhost:8080" -ForegroundColor White
Write-Host "   API:     http://localhost:5000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "   De dung: docker compose down" -ForegroundColor Gray
Write-Host " =========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host " Nhan Enter de thoat cua so nay"
