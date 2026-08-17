param(
    [string]$Version,
    [string]$CertificateThumbprint,
    [string]$PublicCertificatePath,
    [switch]$CreateUpdaterArtifacts
)

$ErrorActionPreference = "Stop"
$windowsRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $windowsRoot "..\..\.."))
$releaseRoot = Join-Path $repositoryRoot "dist\releases\windows"
$cargoTarget = Join-Path $repositoryRoot "dist\.cargo\windows"
$overrideRoot = Join-Path $repositoryRoot "dist\.package\windows"
$overridePath = Join-Path $overrideRoot "tauri.override.json"
$env:CARGO_TARGET_DIR = $cargoTarget

function Get-Sha256Hex([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    try {
        $sha256 = [Security.Cryptography.SHA256]::Create()
        try {
            return [BitConverter]::ToString($sha256.ComputeHash($stream)).Replace("-", "").ToLowerInvariant()
        } finally {
            $sha256.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

if (-not $Version) {
    $Version = (Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot "package.json") | ConvertFrom-Json).version
}
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Version must use the X.Y.Z format."
}

$resolvedReleaseRoot = [IO.Path]::GetFullPath($releaseRoot)
$resolvedDistRoot = [IO.Path]::GetFullPath((Join-Path $repositoryRoot "dist"))
if (-not $resolvedReleaseRoot.StartsWith($resolvedDistRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Windows release output must stay below the repository dist directory."
}
if (Test-Path -LiteralPath $releaseRoot) {
    Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
New-Item -ItemType Directory -Path $overrideRoot -Force | Out-Null

npm.cmd run build -w @cxapp/windows
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$bundleOverride = @{ bundle = @{ createUpdaterArtifacts = [bool]$CreateUpdaterArtifacts } }
if ($CertificateThumbprint) {
    $bundleOverride.bundle.windows = @{
        certificateThumbprint = $CertificateThumbprint
        digestAlgorithm = "sha256"
        timestampUrl = "http://timestamp.digicert.com"
    }
}
$configJson = $bundleOverride | ConvertTo-Json -Depth 5 -Compress
[IO.File]::WriteAllText($overridePath, $configJson, [Text.UTF8Encoding]::new($false))

Push-Location $windowsRoot
try {
    node.exe "..\..\..\node_modules\@tauri-apps\cli\tauri.js" build --bundles nsis --config $overridePath
    $buildExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($buildExitCode -ne 0) { exit $buildExitCode }

$generatedInstaller = Get-ChildItem -LiteralPath (Join-Path $cargoTarget "release\bundle\nsis") -File -Filter "*-setup.exe" |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
if (-not $generatedInstaller) {
    throw "The Tauri build did not create an NSIS installer."
}

$installerPath = Join-Path $releaseRoot "CXApp.Windows.Setup.exe"
Copy-Item -LiteralPath $generatedInstaller.FullName -Destination $installerPath -Force

if ($CreateUpdaterArtifacts) {
    $signatureSource = "$($generatedInstaller.FullName).sig"
    if (-not (Test-Path -LiteralPath $signatureSource)) {
        throw "The signed Tauri updater artifact is missing."
    }
    $signaturePath = Join-Path $releaseRoot "CXApp.Windows.Setup.exe.sig"
    Copy-Item -LiteralPath $signatureSource -Destination $signaturePath -Force
    $signature = (Get-Content -Raw -LiteralPath $signaturePath).Trim()
    $latest = @{
        version = $Version
        notes = "CXApp Windows $Version"
        pub_date = [DateTimeOffset]::UtcNow.ToString("O")
        platforms = @{
            "windows-x86_64" = @{
                signature = $signature
                url = "https://github.com/CODEXSUN/cxapp/releases/latest/download/CXApp.Windows.Setup.exe"
            }
        }
    } | ConvertTo-Json -Depth 5
    [IO.File]::WriteAllText((Join-Path $releaseRoot "latest.json"), $latest, [Text.UTF8Encoding]::new($false))
}

Copy-Item -LiteralPath (Join-Path $PSScriptRoot "install-release.ps1") -Destination (Join-Path $releaseRoot "Install-CXApp.ps1")
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "uninstall.ps1") -Destination (Join-Path $releaseRoot "Uninstall-CXApp.ps1")
if ($PublicCertificatePath) {
    Copy-Item -LiteralPath $PublicCertificatePath -Destination (Join-Path $releaseRoot "CXApp.Windows.cer") -Force
}

$hashLines = Get-ChildItem -LiteralPath $releaseRoot -File |
    Where-Object Name -ne "SHA256SUMS.txt" |
    Sort-Object Name |
    ForEach-Object { "{0}  {1}" -f (Get-Sha256Hex $_.FullName), $_.Name }
[IO.File]::WriteAllLines((Join-Path $releaseRoot "SHA256SUMS.txt"), $hashLines)
Write-Host "CXApp Tauri release assets are ready at $releaseRoot"
