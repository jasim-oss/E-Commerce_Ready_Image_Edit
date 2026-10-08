@echo off
setlocal enabledelayedexpansion
title E-Commerce Ready Edit - Installer

echo ======================================================
echo    E-Commerce Ready Edit - Photoshop Panel Installer
echo ======================================================
echo.

:: 1. Check and close Photoshop if running
tasklist /FI "IMAGENAME eq Photoshop.exe" 2>NUL | find /I /N "Photoshop.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [*] Closing running Photoshop to update files...
    taskkill /F /IM Photoshop.exe >nul 2>&1
    timeout /t 2 /nobreak >nul 2>&1
    echo     Done.
)

echo [*] Installing plugin and registering in Adobe Photoshop...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register.ps1"

echo.
echo ======================================================
echo   SUCCESS! Installation Complete!
echo ======================================================
echo.
echo   How to open in Photoshop:
echo   1. Open Adobe Photoshop (2022 or newer)
echo   2. Go to the top menu: Plugins -^> E-Commerce Ready Edit
echo   3. The panel will open and be ready to use!
echo.
echo ======================================================
echo.
pause
