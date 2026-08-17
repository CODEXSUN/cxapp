$ErrorActionPreference = "Stop"
$windowsRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $windowsRoot "..\..\.."))
$source = Join-Path $windowsRoot "Packaging\Assets\logo-source.svg"
$output = Join-Path $windowsRoot "src-tauri\icons"

Push-Location $repositoryRoot
try {
    node.exe "node_modules\@tauri-apps\cli\tauri.js" icon $source --output $output
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
