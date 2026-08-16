$ErrorActionPreference = "Stop"
$packages = Get-AppxPackage -Name "CODEXSUN.CXApp.Windows"

if (-not $packages) {
    Write-Host "CXApp is not installed for the current Windows user."
    exit 0
}

foreach ($package in $packages) {
    Remove-AppxPackage -Package $package.PackageFullName
}

Write-Host "CXApp was uninstalled for the current Windows user. Local application data was preserved."
