@echo off
title Uninstalling E-Commerce Ready Edit Plugin...
echo ======================================================
echo    E-Commerce Ready Edit - Uninstaller
echo ======================================================
echo.

tasklist /FI "IMAGENAME eq Photoshop.exe" 2>NUL | find /I /N "Photoshop.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [*] Closing running Photoshop...
    taskkill /F /IM Photoshop.exe >nul 2>&1
    timeout /t 2 /nobreak >nul 2>&1
)

echo [*] Removing plugin files and unregistering...

powershell -NoProfile -ExecutionPolicy Bypass -Command "
$appData = $env:APPDATA;
$targetDir = Join-Path $appData 'Adobe\UXP\Plugins\External\com.ecommerce.photoshop.panel_1.0.0';
if (Test-Path $targetDir) { Remove-Item -Path $targetDir -Recurse -Force -ErrorAction SilentlyContinue };
$legacyDir = Join-Path $appData 'Adobe\UXP\Plugins\External\com.ecommerce.photoshop.panel';
if (Test-Path $legacyDir) { Remove-Item -Path $legacyDir -Recurse -Force -ErrorAction SilentlyContinue };

$psJsonPath = Join-Path $appData 'Adobe\UXP\PluginsInfo\v1\PS.json';
if (Test-Path $psJsonPath) {
    try {
        $json = Get-Content -Path $psJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json;
        if ($json.plugins) {
            $json.plugins = @($json.plugins | Where-Object { $_.pluginId -ne 'com.ecommerce.photoshop.panel' });
            $json | ConvertTo-Json -Depth 5 | Set-Content -Path $psJsonPath -Encoding UTF8;
        }
    } catch {}
}
"

echo.
echo ======================================================
echo   Plugin uninstalled successfully.
echo ======================================================
echo.
pause
