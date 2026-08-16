param(
    [string]$ReleaseBaseUrl = "https://github.com/CODEXSUN/cxapp/releases/latest/download",
    [switch]$Elevated
)

$ErrorActionPreference = "Stop"
$packageName = "CODEXSUN.CXApp.Windows"
$downloadRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("cxapp-install-" + [guid]::NewGuid().ToString("N"))
$certificatePath = Join-Path $downloadRoot "CXApp.Windows.cer"
$appInstallerPath = Join-Path $downloadRoot "CXApp.Windows.appinstaller"
$msixPath = Join-Path $downloadRoot "CXApp.Windows.msix"
$runtimeDependencyPath = Join-Path $downloadRoot "Microsoft.WindowsAppRuntime.2.msix"

function Test-Administrator {
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    if ($Elevated) {
        throw "Administrator access is required to trust the private CXApp release certificate."
    }
    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", "`"$PSCommandPath`"",
        "-ReleaseBaseUrl", "`"$ReleaseBaseUrl`"",
        "-Elevated"
    )
    $process = Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments -Wait -PassThru
    exit $process.ExitCode
}

function Add-ReleaseCertificate(
    [System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate,
    [string]$CertificatePath
) {
    $store = [System.Security.Cryptography.X509Certificates.X509Store]::new(
        [System.Security.Cryptography.X509Certificates.StoreName]::TrustedPeople,
        [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine
    )
    try {
        $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
        $store.Add($Certificate)
    } finally {
        $store.Close()
    }
    & certutil.exe -f -addstore Root $CertificatePath | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Windows could not trust the CXApp release certificate."
    }
}

try {
    New-Item -ItemType Directory -Path $downloadRoot | Out-Null
    Invoke-WebRequest -Uri "$ReleaseBaseUrl/CXApp.Windows.cer" -OutFile $certificatePath
    Invoke-WebRequest -Uri "$ReleaseBaseUrl/CXApp.Windows.appinstaller" -OutFile $appInstallerPath
    Invoke-WebRequest -Uri "$ReleaseBaseUrl/CXApp.Windows.msix" -OutFile $msixPath
    Invoke-WebRequest -Uri "$ReleaseBaseUrl/Microsoft.WindowsAppRuntime.2.msix" -OutFile $runtimeDependencyPath

    $certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($certificatePath)
    if ($certificate.Subject -ne "CN=CODEXSUN") {
        throw "The release certificate publisher is not CODEXSUN."
    }
    if ((Get-Date) -lt $certificate.NotBefore -or (Get-Date) -gt $certificate.NotAfter) {
        throw "The release certificate is not valid at the current time."
    }
    $codeSigningOid = "1.3.6.1.5.5.7.3.3"
    $hasCodeSigningUsage = $certificate.Extensions |
        Where-Object { $_ -is [System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension] } |
        ForEach-Object { $_.EnhancedKeyUsages } |
        Where-Object Value -eq $codeSigningOid
    if (-not $hasCodeSigningUsage) {
        throw "The release certificate cannot sign application code."
    }

    Add-ReleaseCertificate $certificate $certificatePath

    $signature = Get-AuthenticodeSignature -LiteralPath $msixPath
    if (-not $signature.SignerCertificate -or
        $signature.SignerCertificate.Thumbprint -ne $certificate.Thumbprint -or
        $signature.Status -ne "Valid") {
        throw "The CXApp package signature does not match the trusted release certificate."
    }

    $runtimeSignature = Get-AuthenticodeSignature -LiteralPath $runtimeDependencyPath
    if (-not $runtimeSignature.SignerCertificate -or
        $runtimeSignature.SignerCertificate.Subject -notmatch "CN=Microsoft Corporation" -or
        $runtimeSignature.Status -ne "Valid") {
        throw "The Windows App SDK runtime dependency is not signed by Microsoft."
    }

    [xml]$appInstaller = Get-Content -LiteralPath $appInstallerPath -Raw
    $expectedVersion = [version]$appInstaller.AppInstaller.MainPackage.Version
    Add-AppxPackage -Path $runtimeDependencyPath -ForceUpdateFromAnyVersion
    Add-AppxPackage -Path $msixPath -ForceApplicationShutdown -ForceUpdateFromAnyVersion

    $package = Get-AppxPackage -Name $packageName
    if (-not $package) {
        throw "Windows did not register the CXApp package."
    }
    if ([version]$package.Version -ne $expectedVersion) {
        throw "Windows registered CXApp $($package.Version), but the release requires $expectedVersion."
    }

    $appInstallerUri = $appInstaller.AppInstaller.Uri
    if (Get-Command Set-AppxPackageAutoUpdateSettings -ErrorAction SilentlyContinue) {
        Set-AppxPackageAutoUpdateSettings `
            -PackageFamilyName $package.PackageFamilyName `
            -AppInstallerUri $appInstallerUri `
            -ClearPreviousSettings `
            -EnableAutomaticBackgroundTask $true `
            -CheckOnLaunch $true `
            -HoursBetweenUpdateChecks 0 `
            -ShowPrompt $false `
            -UpdateBlocksActivation $false `
            -Version $expectedVersion.ToString() `
            -Confirm:$false
        $updateSettings = Get-AppxPackageAutoUpdateSettings -PackageFamilyName $package.PackageFamilyName
        if ($updateSettings.AppInstallerUri -ne $appInstallerUri -or
            -not $updateSettings.CheckForUpdatesOnLaunch -or
            -not $updateSettings.AutomaticBackgroundTaskUpdatesEnabled) {
            throw "Windows did not preserve the CXApp automatic update settings."
        }
    } else {
        Add-AppxPackage -Path $appInstallerPath -AppInstallerFile
    }
    Write-Host "CXApp $($package.Version) was installed for the current Windows user."
} finally {
    if (Test-Path -LiteralPath $downloadRoot) {
        Remove-Item -LiteralPath $downloadRoot -Recurse -Force
    }
}
