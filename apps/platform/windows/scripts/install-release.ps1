#Requires -RunAsAdministrator

param(
    [string]$Repository = "CODEXSUN/cxapp"
)

$ErrorActionPreference = "Stop"
$releaseBase = "https://github.com/$Repository/releases/latest/download"
$downloadRoot = Join-Path ([IO.Path]::GetTempPath()) ("cxapp-tauri-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $downloadRoot | Out-Null

try {
    $installerPath = Join-Path $downloadRoot "CXApp.Windows.Setup.exe"
    $certificatePath = Join-Path $downloadRoot "CXApp.Windows.cer"
    Invoke-WebRequest "$releaseBase/CXApp.Windows.Setup.exe" -OutFile $installerPath
    Invoke-WebRequest "$releaseBase/CXApp.Windows.cer" -OutFile $certificatePath

    $certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new($certificatePath)
    $store = [Security.Cryptography.X509Certificates.X509Store]::new(
        [Security.Cryptography.X509Certificates.StoreName]::TrustedPeople,
        [Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine
    )
    try {
        $store.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
        $store.Add($certificate)
    } finally {
        $store.Close()
    }

    $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
    if (-not $signature.SignerCertificate -or
        $signature.SignerCertificate.Thumbprint -ne $certificate.Thumbprint -or
        $signature.Status -in @("HashMismatch", "NotSigned")) {
        throw "The CXApp installer signature does not match the release certificate."
    }

    Get-Process -Name "cxapp-windows" -ErrorAction SilentlyContinue | Stop-Process -Force
    $legacyPackage = Get-AppxPackage -Name "CODEXSUN.CXApp.Windows"
    if ($legacyPackage) {
        $legacyPackage | Remove-AppxPackage
    }

    $process = Start-Process -FilePath $installerPath -ArgumentList "/S" -PassThru -Wait
    if ($process.ExitCode -ne 0) {
        throw "The CXApp installer exited with code $($process.ExitCode)."
    }
    Write-Host "CXApp was installed. Signed updates will be checked against the GitHub release feed."
} finally {
    if (Test-Path -LiteralPath $downloadRoot) {
        Remove-Item -LiteralPath $downloadRoot -Recurse -Force
    }
}
