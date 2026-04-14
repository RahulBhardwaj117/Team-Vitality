@echo off
set PYTHONIOENCODING=utf-8
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

:: 2. Start Python Backend Server 
if exist "%~dp0backend\fastapi\main.py" (
    echo [INFO] Starting Backend Server - FastAPI 
    start "AgriUrbanAI FastAPI Backend" cmd /k "cd /d ""%~dp0backend\fastapi"" && python main.py"
) else (
    echo [WARNING] FastAPI backend not found at %~dp0backend\fastapi\main.py
)

:: 3. Start Node Backend Server
if exist "%~dp0backend\server.js" (
    echo [INFO] Starting Node Backend Server...
    start "AgriUrbanAI Node Backend" cmd /k "cd /d ""%~dp0backend"" && node server.js"
) else (
    echo [WARNING] Node backend not found at %~dp0backend\server.js
)

:: 4. Launch Frontend
echo [INFO] Starting Frontend Server...
if exist "%~dp0frontend\index.html" (
    start "AgriUrbanAI Frontend" cmd /k "cd /d ""%~dp0frontend"" && python -m http.server 3000"
    :: Wait a few seconds for backends and frontend server to initialize
    timeout /t 5 /nobreak >nul
    start "" "http://localhost:3000"
) else (
    echo [ERROR] Frontend index.html not found!
)

echo.
echo [SUCCESS] System started! 
echo - Backends running in new windows
echo - Dashboard opened in browser
echo.
pause
