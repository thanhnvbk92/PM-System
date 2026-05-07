@echo off
title PM System Starter
color 0b

echo ==========================================
echo    KHOI DONG PM SYSTEM (BACKEND ^& WEB)
echo ==========================================
echo.

:: Khoi dong Backend
echo [1/2] Dang khoi dong Backend...
start "PM Backend" cmd /k "cd /d %~dp0backend && echo --- BACKEND LOGS --- && python main.py"

:: Doi mot chut de backend khoi dong truoc (tuy chon)
timeout /t 2 /nobreak > nul

:: Khoi dong Frontend (Web)
echo [2/2] Dang khoi dong Web Frontend...
start "PM Web Frontend" cmd /k "cd /d %~dp0web && echo --- WEB FRONTEND LOGS --- && npm start"

echo.
echo ==========================================
echo    DA KHOI DONG THANH CONG!
echo    Vui long kiem tra cac cua so terminal rieng biet.
echo ==========================================
echo.
pause
