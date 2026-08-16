param(
    [string]$PackagePath,
    [switch]$UseUpdateFeed
)

$ErrorActionPreference = "Stop"
$windowsRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $windowsRoot "..\..\.."))

if ($UseUpdateFeed -and -not $PackagePath) {
    $PackagePath = "https://github.com/CODEXSUN/cxapp/releases/latest/download/CXApp.Windows.appinstaller"
} elseif (-not $PackagePath) {
    $PackagePath = Join-Path $repositoryRoot "dist\releases\windows\CXApp.Windows.msix"
}

if ($PackagePath -match '^https://') {
    Start-Process $PackagePath
    Write-Host "Windows App Installer was opened. Complete the signed release installation in that window."
} else {
    $resolvedPackage = Resolve-Path -LiteralPath $PackagePath
    Add-AppxPackage -Path $resolvedPackage
    Write-Host "CXApp was installed for the current Windows user from the local MSIX."
}
