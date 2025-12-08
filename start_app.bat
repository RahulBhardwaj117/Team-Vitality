
@echo off
echo ===================================================
echo   AgriUrbanAI - All-in-One Startup Script
echo ===================================================
echo.

:: 1. Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b
)

:: 2. Start Backend Server
echo [INFO] Starting Backend Server (FastAPI)...
start "AgriUrbanAI Backend" cmd /k "cd /d d:\Python\change5\TeamVitality\AU\backend\fastapi && python main.py"

:: 3. Launch Frontend
echo [INFO] Launching Dashboard...
:: Wait a few seconds for backend to initialize
timeout /t 5 /nobreak >nul
start "" "d:\Python\change5\TeamVitality\AU\index.html"

echo.
echo [SUCCESS] System started! 
echo - Backend running in new window
echo - Dashboard opened in browser
echo.
pause
