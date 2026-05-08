@echo off
title HanYu - Khoi dong website hoc tieng Trung
color 0A

echo.
echo  =========================================
echo    HanYu - Website Hoc Tieng Trung
echo  =========================================
echo.

:: Kiểm tra Docker Desktop có đang chạy không
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Docker Desktop chua chay!
    echo      Dang mo Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo      Vui long doi Docker khoi dong (30-60 giay)...
    timeout /t 30 /nobreak >nul
)

echo  [1/3] Dang khoi dong containers...
cd /d "%~dp0"
docker compose up -d

if %errorlevel% neq 0 (
    echo.
    echo  [!] Loi khi chay docker compose!
    echo      Kiem tra lai Docker Desktop va thu lai.
    pause
    exit /b 1
)

echo.
echo  [2/3] Doi cac services san sang...
timeout /t 5 /nobreak >nul

echo  [3/3] Mo trinh duyet...
start "" "http://localhost:8080"

echo.
echo  =========================================
echo    Website da chay tai: http://localhost:8080
echo    API dang chay tai:   http://localhost:5000
echo.
echo    De dung website: docker compose down
echo  =========================================
echo.
pause
