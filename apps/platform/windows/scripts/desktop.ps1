param(
    [ValidateSet("restore", "build", "run", "publish", "package", "install", "uninstall")]
    [string]$Action = "build"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $projectRoot "CXApp.Windows.csproj"
$dotnet = (Get-Command dotnet -ErrorAction SilentlyContinue).Source

if (-not $dotnet) {
    $dotnet = "C:\Program Files\dotnet\dotnet.exe"
}

if (-not (Test-Path -LiteralPath $dotnet)) {
    throw ".NET 10 SDK was not found. Install Microsoft.DotNet.SDK.10 before building CXApp Windows."
}

switch ($Action) {
    "restore" { & $dotnet restore $projectPath }
    "build" { & $dotnet build $projectPath --configuration Release }
    "run" { & $dotnet run --project $projectPath --configuration Debug }
    "publish" { & $dotnet publish $projectPath --configuration Release --self-contained true }
    "package" {
        $repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "..\..\.."))
        $package = Get-Content -LiteralPath (Join-Path $repositoryRoot "package.json") -Raw | ConvertFrom-Json
        & (Join-Path $PSScriptRoot "package.ps1") -Version $package.version
    }
    "install" { & (Join-Path $PSScriptRoot "install.ps1") }
    "uninstall" { & (Join-Path $PSScriptRoot "uninstall.ps1") }
}

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
