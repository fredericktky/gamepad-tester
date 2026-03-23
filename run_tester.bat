@echo off
TITLE Gamepad Tester - Launcher
SETLOCAL EnableDelayedExpansion

echo ========================================
echo   🎮 Gamepad Tester Launcher 🎮
echo ========================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install it from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] First-time setup: Installing dependencies...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [SUCCESS] Starting the Gamepad Tester server...
echo.
echo Once started, open: http://localhost:3000
echo.

call npm start

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] The server stopped unexpectedly.
    pause
)

ENDLOCAL
