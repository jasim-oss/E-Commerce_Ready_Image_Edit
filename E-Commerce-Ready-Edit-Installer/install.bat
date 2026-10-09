@echo off
title Installing E-Commerce Ready Edit Plugin...
echo ========================================================
echo   Installing E-Commerce Ready Edit Plugin to Photoshop...
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register.ps1"

echo.
echo Launching Photoshop...
start "" "photoshop.exe" >nul 2>&1

echo Done.
timeout /t 3
