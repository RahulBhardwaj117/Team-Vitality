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

:: 2. Start Python Backend Server (FastAPI)
echo [INFO] Starting Backend Server (FastAPI)...
start "AgriUrbanAI FastAPI Backend" cmd /k "cd /d ""%~dp0backend\fastapi"" && python main.py"

:: 3. Start Node Backend Server
echo [INFO] Starting Node Backend Server...
start "AgriUrbanAI Node Backend" cmd /k "cd /d ""%~dp0backend"" && npm start"

:: 4. Launch Frontend
echo [INFO] Launching Dashboard...
:: Wait a few seconds for backends to initialize
timeout /t 5 /nobreak >nul
start "" "%~dp0index.html"

echo.
echo [SUCCESS] System started! 
echo - Backends running in new windows
echo - Dashboard opened in browser
echo.
pause
