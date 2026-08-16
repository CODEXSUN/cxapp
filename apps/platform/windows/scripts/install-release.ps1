param(
    [string]$ReleaseBaseUrl = "https://github.com/CODEXSUN/cxapp/releases/latest/download"
)

$ErrorActionPreference = "Stop"
$packageName = "CODEXSUN.CXApp.Windows"
$downloadRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("cxapp-install-" + [guid]::NewGuid().ToString("N"))
$certificatePath = Join-Path $downloadRoot "CXApp.Windows.cer"
$appInstallerPath = Join-Path $downloadRoot "CXApp.Windows.appinstaller"

try {
    New-Item -ItemType Directory -Path $downloadRoot | Out-Null
    Invoke-WebRequest -Uri "$ReleaseBaseUrl/CXApp.Windows.cer" -OutFile $certificatePath
    Invoke-WebRequest -Uri "$ReleaseBaseUrl/CXApp.Windows.appinstaller" -OutFile $appInstallerPath

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

    $store = [System.Security.Cryptography.X509Certificates.X509Store]::new(
        [System.Security.Cryptography.X509Certificates.StoreName]::TrustedPeople,
        [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
    )
    try {
        $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
        $store.Add($certificate)
    } finally {
        $store.Close()
    }

    Add-AppxPackage -Path $appInstallerPath -AppInstallerFile
    $package = Get-AppxPackage -Name $packageName
    if (-not $package) {
        throw "Windows did not register the CXApp package."
    }
    Write-Host "CXApp $($package.Version) was installed for the current Windows user."
} finally {
    if (Test-Path -LiteralPath $downloadRoot) {
        Remove-Item -LiteralPath $downloadRoot -Recurse -Force
    }
}
