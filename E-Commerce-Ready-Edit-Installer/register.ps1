# E-Commerce Ready Edit - Adobe UXP Registration Helper
$ErrorActionPreference = "SilentlyContinue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Installing E-Commerce Ready Edit Plugin...          " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Close Photoshop if running to ensure smooth registry write
$psProcesses = Get-Process -Name "Photoshop" -ErrorAction SilentlyContinue
if ($psProcesses) {
    Write-Host "[*] Closing Photoshop to register plugin..." -ForegroundColor Yellow
    $psProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

$appData = $env:APPDATA
$pluginId = "com.ecommerce.photoshop.panel"
$version = "1.0.0"
$folderName = "${pluginId}_${version}"

$targetDir = Join-Path $appData "Adobe\UXP\Plugins\External\$folderName"
$ccxFile = Join-Path $PSScriptRoot "E-Commerce-Ready-Edit.ccx"
$sourceDir = Join-Path $PSScriptRoot "uxp_plugin"

# 2. Ensure target directory exists
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
}

# 3. Extract CCX or copy plugin files into target directory
if (Test-Path $ccxFile) {
    Write-Host "[*] Extracting CCX plugin package..." -ForegroundColor Yellow
    $tempZip = Join-Path $env:TEMP "ecom_ccx_tmp.zip"
    Copy-Item -Path $ccxFile -Destination $tempZip -Force | Out-Null
    Expand-Archive -Path $tempZip -DestinationPath $targetDir -Force | Out-Null
    Remove-Item -Path $tempZip -Force | Out-Null
} elseif (Test-Path "$sourceDir\manifest.json") {
    Write-Host "[*] Copying plugin directory..." -ForegroundColor Yellow
    Copy-Item -Path "$sourceDir\*" -Destination $targetDir -Recurse -Force | Out-Null
}

# 4. Register in Adobe PS.json registry
Write-Host "[*] Registering plugin in Adobe UXP PS.json..." -ForegroundColor Yellow
$psJsonDir = Join-Path $appData "Adobe\UXP\PluginsInfo\v1"
$psJsonPath = Join-Path $psJsonDir "PS.json"

if (!(Test-Path $psJsonDir)) {
    New-Item -ItemType Directory -Force -Path $psJsonDir | Out-Null
}

$pluginsList = @()
if (Test-Path $psJsonPath) {
    try {
        $raw = Get-Content -Path $psJsonPath -Raw -Encoding UTF8
        $jsonObj = $raw | ConvertFrom-Json
        if ($jsonObj.plugins) {
            $pluginsList = @($jsonObj.plugins | Where-Object { $_.pluginId -ne $pluginId })
        }
    } catch {
        $pluginsList = @()
    }
}

$entry = [ordered]@{
    hostMinVersion = "23.0.0"
    name = "E-Commerce Ready Edit"
    path = "`$localPlugins\External\$folderName"
    pluginId = $pluginId
    status = "enabled"
    type = "uxp"
    versionString = $version
}

$pluginsList += [PSCustomObject]$entry

$outputObj = [ordered]@{
    plugins = $pluginsList
}

$outputObj | ConvertTo-Json -Depth 5 | Set-Content -Path $psJsonPath -Encoding UTF8

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  [OK] SUCCESS! Plugin permanently registered in Photoshop." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

# 5. Find and launch Photoshop safely
Write-Host "`n[*] Looking for Adobe Photoshop..." -ForegroundColor Cyan

$psExePath = $null

$regPath = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Photoshop.exe' -ErrorAction SilentlyContinue).'(default)'
if ($regPath -and (Test-Path $regPath)) {
    $psExePath = $regPath
}

if (!$psExePath) {
    $found = Get-ChildItem -Path "C:\Program Files\Adobe" -Filter "Photoshop.exe" -Recurse -Depth 2 -ErrorAction SilentlyContinue |
             Sort-Object FullName -Descending | Select-Object -First 1
    if ($found) {
        $psExePath = $found.FullName
    }
}

if ($psExePath) {
    Write-Host "[*] Launching Photoshop: $psExePath" -ForegroundColor Green
    Start-Process -FilePath $psExePath
} else {
    Write-Host "[i] Installation complete! Please open Adobe Photoshop manually." -ForegroundColor Yellow
}

