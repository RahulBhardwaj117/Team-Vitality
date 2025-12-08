@echo off
title AgriUrbanAI Backend Server
color 0A

echo ========================================
echo   Starting AgriUrbanAI Backend Server
echo ========================================
echo.

:: Navigate to backend directory
cd /d "%~dp0backend\fastapi"

:: Check if we're in the right directory
if not exist "main.py" (
    echo [ERROR] Cannot find main.py in backend\fastapi folder
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo [INFO] Starting FastAPI server...
echo [INFO] Server will be available at: http://localhost:8000
echo [INFO] Server URL: http://127.0.0.1:3000/TeamVitality/AU/index.html
echo.
echo ========================================
echo   KEEP THIS WINDOW OPEN!
echo   The server is now running.
echo   Close this window to stop the server.
echo ========================================
echo.

:: Start Python server
python main.py

:: If Python exits, show error
if errorlevel 1 (
    echo.
    echo [ERROR] Server crashed! Check the error above.
    pause
)
