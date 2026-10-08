@echo off
setlocal enabledelayedexpansion
title E-Commerce Ready Edit - Uninstaller

echo ======================================================
echo    E-Commerce Ready Edit - Uninstaller
echo ======================================================
echo.

set "PLUGIN_ID=com.ecommerce.photoshop.panel"
set "USER_UXP_DIR1=%APPDATA%\Adobe\UXP\Plugins\External\%PLUGIN_ID%"
set "USER_UXP_DIR2=%APPDATA%\Adobe\UXP\PluginsExternal\%PLUGIN_ID%"

echo [*] Removing plugin files...

if exist "%USER_UXP_DIR1%" (
    rmdir /S /Q "%USER_UXP_DIR1%" >nul 2>&1
)

if exist "%USER_UXP_DIR2%" (
    rmdir /S /Q "%USER_UXP_DIR2%" >nul 2>&1
)

echo.
echo ======================================================
echo   SUCCESS! Plugin has been uninstalled.
echo ======================================================
echo.
pause
