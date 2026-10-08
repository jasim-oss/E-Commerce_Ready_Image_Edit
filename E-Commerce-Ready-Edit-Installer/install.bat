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

:: 2. Setup paths
set "PLUGIN_ID=com.ecommerce.photoshop.panel"
set "USER_UXP_DIR1=%APPDATA%\Adobe\UXP\Plugins\External\%PLUGIN_ID%"
set "USER_UXP_DIR2=%APPDATA%\Adobe\UXP\PluginsExternal\%PLUGIN_ID%"
set "SOURCE_DIR=%~dp0uxp-plugin"
set "CCX_FILE=%~dp0E-Commerce-Ready-Edit.ccx"
set "UPIA_EXE=%CommonProgramFiles%\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe"

echo [*] Installing plugin to Adobe UXP directory...

:: Create target directories and copy
if not exist "%USER_UXP_DIR1%" mkdir "%USER_UXP_DIR1%" >nul 2>&1
if not exist "%USER_UXP_DIR2%" mkdir "%USER_UXP_DIR2%" >nul 2>&1

if exist "%SOURCE_DIR%\manifest.json" (
    xcopy /E /I /Y /Q "%SOURCE_DIR%\*" "%USER_UXP_DIR1%\" >nul 2>&1
    xcopy /E /I /Y /Q "%SOURCE_DIR%\*" "%USER_UXP_DIR2%\" >nul 2>&1
    echo     [+] Files copied to user profile successfully!
) else if exist "%CCX_FILE%" (
    powershell -Command "$tmp = Join-Path $env:TEMP 'ecom_tmp.zip'; Copy-Item '%CCX_FILE%' $tmp -Force; Expand-Archive -Path $tmp -DestinationPath '%USER_UXP_DIR1%' -Force; Expand-Archive -Path $tmp -DestinationPath '%USER_UXP_DIR2%' -Force; Remove-Item $tmp -Force" >nul 2>&1
    echo     [+] Package extracted successfully!
)

:: If UPIA exists, also register with Adobe UPIA silently
if exist "%UPIA_EXE%" (
    if exist "%CCX_FILE%" (
        echo [*] Registering plugin with Adobe Creative Cloud...
        start "" /B "%UPIA_EXE%" /install "%CCX_FILE%" >nul 2>&1
    )
)

echo.
echo ======================================================
echo   SUCCESS! Installation Complete!
echo ======================================================
echo.
echo   How to use:
echo   1. Open Adobe Photoshop (2022 or newer)
echo   2. Go to the top menu: Plugins -^> E-Commerce Ready Edit
echo   3. The panel will open and ready to use!
echo.
echo ======================================================
echo.
pause
