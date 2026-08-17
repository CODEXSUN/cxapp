param(
    [ValidateSet("restore", "build", "run", "publish", "package", "install", "uninstall")]
    [string]$Action = "build"
)

$ErrorActionPreference = "Stop"
$windowsRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $windowsRoot "..\..\.."))
$manifestPath = Join-Path $windowsRoot "src-tauri\Cargo.toml"
$env:CARGO_TARGET_DIR = Join-Path $repositoryRoot "dist\.cargo\windows"

function Invoke-Checked([scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

switch ($Action) {
    "restore" {
        Invoke-Checked { cargo fetch --manifest-path $manifestPath }
    }
    "build" {
        Invoke-Checked { npm.cmd run build -w @cxapp/windows }
        Invoke-Checked { cargo build --manifest-path $manifestPath --release }
    }
    "run" {
        Push-Location $windowsRoot
        try {
            Invoke-Checked { node.exe "..\..\..\node_modules\@tauri-apps\cli\tauri.js" dev }
        } finally {
            Pop-Location
        }
    }
    "publish" {
        Invoke-Checked { npm.cmd run build -w @cxapp/windows }
        Invoke-Checked { cargo build --manifest-path $manifestPath --release }
    }
    "package" {
        & (Join-Path $PSScriptRoot "package.ps1")
    }
    "install" {
        & (Join-Path $PSScriptRoot "install.ps1")
    }
    "uninstall" {
        & (Join-Path $PSScriptRoot "uninstall.ps1")
    }
}
