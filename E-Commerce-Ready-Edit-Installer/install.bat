@echo off
title Installing E-Commerce Ready Edit Plugin...
echo ========================================================
echo   Installing E-Commerce Ready Edit Plugin to Photoshop...
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register.ps1"
if %ERRORLEVEL% NEQ 0 (
    powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0register.ps1\"\"' -Verb RunAs"
)

echo.
echo ========================================================
echo   Done! You can close this window.
echo ========================================================
timeout /t 5

