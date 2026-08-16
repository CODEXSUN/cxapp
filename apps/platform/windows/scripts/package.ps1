param(
    [string]$Version,
    [string]$Publisher = "CN=CODEXSUN",
    [string]$SigningPfx,
    [string]$SigningPassword,
    [string]$PublicCertificatePath,
    [switch]$AllowSelfSignedCertificate,
    [string]$TimestampUrl = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"
$windowsRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $windowsRoot "..\..\.."))
$distRoot = Join-Path $repositoryRoot "dist"

function Resolve-Tool([string]$Name, [string]$Fallback) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    if (Test-Path -LiteralPath $Fallback) { return $Fallback }
    throw "$Name was not found."
}

function Resolve-SdkTool([string]$Name) {
    $sdkRoot = "C:\Program Files (x86)\Windows Kits\10\bin"
    $tool = Get-ChildItem -LiteralPath $sdkRoot -Directory |
        Where-Object Name -Match '^\d+\.\d+\.\d+\.\d+$' |
        Sort-Object { [version]$_.Name } -Descending |
        ForEach-Object { Join-Path $_.FullName "x64\$Name" } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
    if (-not $tool) { throw "$Name was not found in the Windows SDK." }
    return $tool
}

function Assert-DistPath([string]$Path) {
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $distPrefix = [System.IO.Path]::GetFullPath($distRoot) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($distPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Generated package path must stay below $distRoot."
    }
}

function Reset-Directory([string]$Path) {
    Assert-DistPath $Path
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Write-Template([string]$Source, [string]$Destination, [string]$TemplateVersion, [string]$TemplatePublisher) {
    $content = [System.IO.File]::ReadAllText($Source)
    $escapedPublisher = [System.Security.SecurityElement]::Escape($TemplatePublisher)
    $content = $content.Replace("__VERSION__", $TemplateVersion).Replace("__PUBLISHER__", $escapedPublisher)
    [System.IO.File]::WriteAllText($Destination, $content, [System.Text.UTF8Encoding]::new($false))
}

function Get-Sha256Hex([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            return [System.BitConverter]::ToString($sha256.ComputeHash($stream)).Replace("-", "").ToLowerInvariant()
        } finally {
            $sha256.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

$releaseRoot = Join-Path $distRoot "releases\windows"
$stagingRoot = Join-Path $distRoot ".package\windows"
$projectPath = Join-Path $windowsRoot "CXApp.Windows.csproj"
$dotnet = Resolve-Tool "dotnet.exe" "C:\Program Files\dotnet\dotnet.exe"
$signTool = Resolve-SdkTool "signtool.exe"

if (-not $Version) {
    $package = Get-Content -LiteralPath (Join-Path $repositoryRoot "package.json") -Raw | ConvertFrom-Json
    $Version = $package.version
}

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Version must use the X.Y.Z format."
}

$packageVersion = "$Version.0"
Write-Host "Packaging CXApp Windows $packageVersion."
Assert-DistPath $releaseRoot
Assert-DistPath $stagingRoot
Reset-Directory $releaseRoot
Reset-Directory $stagingRoot

& $dotnet publish $projectPath `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    -p:GenerateAppxPackageOnBuild=true `
    -p:AppxPackageSigningEnabled=false `
    -p:AppxBundle=Never `
    -p:AppxSymbolPackageEnabled=false `
    -p:UapAppxPackageBuildMode=SideloadOnly `
    -p:AppxPackageDir="$stagingRoot\"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$generatedMsix = Get-ChildItem -LiteralPath $stagingRoot -Recurse -File -Filter "*.msix" |
    Where-Object FullName -NotMatch "[\\/]Dependencies[\\/]" |
    Select-Object -First 1
if (-not $generatedMsix) {
    throw "The WinUI packaging target did not create an MSIX package."
}

$runtimeDependency = Get-ChildItem -LiteralPath $stagingRoot -Recurse -File -Filter "Microsoft.WindowsAppRuntime.2.msix" |
    Where-Object FullName -Match "[\\/]Dependencies[\\/]x64[\\/]" |
    Select-Object -First 1
if (-not $runtimeDependency) {
    throw "The Windows App SDK x64 runtime dependency was not generated."
}

$msixPath = Join-Path $releaseRoot "CXApp.Windows.msix"
$runtimeDependencyPath = Join-Path $releaseRoot "Microsoft.WindowsAppRuntime.2.msix"
Copy-Item -LiteralPath $generatedMsix.FullName -Destination $msixPath -Force
Copy-Item -LiteralPath $runtimeDependency.FullName -Destination $runtimeDependencyPath -Force

& $signTool verify /pa /all $runtimeDependencyPath
if ($LASTEXITCODE -ne 0) {
    throw "The generated Windows App SDK runtime dependency does not have a valid Microsoft signature."
}

if ($SigningPfx) {
    if (-not (Test-Path -LiteralPath $SigningPfx)) {
        throw "The signing PFX was not found."
    }
    $signArguments = @("sign", "/fd", "SHA256", "/f", $SigningPfx, "/p", $SigningPassword)
    if ($TimestampUrl) {
        $signArguments += @("/tr", $TimestampUrl, "/td", "SHA256")
    }
    $signArguments += $msixPath
    & $signTool @signArguments
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $signTool verify /pa /all $msixPath
    if ($LASTEXITCODE -ne 0) {
        if (-not $AllowSelfSignedCertificate -or -not $PublicCertificatePath) {
            exit $LASTEXITCODE
        }
        $expectedCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($PublicCertificatePath)
        $signature = Get-AuthenticodeSignature -LiteralPath $msixPath
        if (-not $signature.SignerCertificate -or
            $signature.SignerCertificate.Thumbprint -ne $expectedCertificate.Thumbprint -or
            $signature.Status -in @("HashMismatch", "NotSigned")) {
            throw "The self-signed MSIX signature did not match the release certificate."
        }
        Write-Warning "The MSIX signature matches the private release certificate. Public trust is not available."
        $global:LASTEXITCODE = 0
    }
} else {
    Write-Warning "The MSIX package is unsigned. It cannot be installed as a production release."
}

$appInstallerTemplate = Join-Path $windowsRoot "Packaging\CXApp.Windows.appinstaller.template"
$appInstallerPath = Join-Path $releaseRoot "CXApp.Windows.appinstaller"
Write-Template $appInstallerTemplate $appInstallerPath $packageVersion $Publisher

Copy-Item -LiteralPath (Join-Path $PSScriptRoot "install-release.ps1") -Destination (Join-Path $releaseRoot "Install-CXApp.ps1")
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "uninstall.ps1") -Destination (Join-Path $releaseRoot "Uninstall-CXApp.ps1")
if ($PublicCertificatePath) {
    if (-not (Test-Path -LiteralPath $PublicCertificatePath)) {
        throw "The public signing certificate was not found."
    }
    Copy-Item -LiteralPath $PublicCertificatePath -Destination (Join-Path $releaseRoot "CXApp.Windows.cer")
}

$hashPath = Join-Path $releaseRoot "SHA256SUMS.txt"
$hashes = Get-ChildItem -LiteralPath $releaseRoot -File |
    Where-Object Name -ne "SHA256SUMS.txt" |
    Sort-Object Name |
    ForEach-Object { "{0}  {1}" -f (Get-Sha256Hex $_.FullName), $_.Name }
[System.IO.File]::WriteAllLines($hashPath, $hashes)

Write-Host "Windows release assets are ready at $releaseRoot"
