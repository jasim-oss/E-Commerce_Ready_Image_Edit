# E-Commerce Ready Edit - Adobe UXP Registration Helper
$ErrorActionPreference = "SilentlyContinue"

$appData = $env:APPDATA
$pluginId = "com.ecommerce.photoshop.panel"
$version = "1.0.0"
$folderName = "${pluginId}_${version}"

$targetDir = Join-Path $appData "Adobe\UXP\Plugins\External\$folderName"
$ccxFile = Join-Path $PSScriptRoot "E-Commerce-Ready-Edit.ccx"
$sourceDir = Join-Path $PSScriptRoot "uxp-plugin"

# 1. Ensure target directory exists
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
}

# 2. Extract or Copy files into target directory
if (Test-Path "$sourceDir\manifest.json") {
    Copy-Item -Path "$sourceDir\*" -Destination $targetDir -Recurse -Force | Out-Null
} elseif (Test-Path $ccxFile) {
    $tempZip = Join-Path $env:TEMP "ecom_ccx_tmp.zip"
    Copy-Item -Path $ccxFile -Destination $tempZip -Force | Out-Null
    Expand-Archive -Path $tempZip -DestinationPath $targetDir -Force | Out-Null
    Remove-Item -Path $tempZip -Force | Out-Null
}

# 3. Register in Adobe PS.json
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

Write-Host "Plugin registered in Adobe Photoshop UXP successfully!"
