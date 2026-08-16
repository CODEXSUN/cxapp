param(
    [string]$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

$ErrorActionPreference = "Stop"
$packagingRoot = Split-Path -Parent $PSScriptRoot
$assetsRoot = Join-Path $packagingRoot "Packaging\Assets"
$sourcePath = Join-Path $assetsRoot "logo-source.svg"

if (-not (Test-Path -LiteralPath $EdgePath)) {
    throw "Microsoft Edge was not found at $EdgePath."
}

$sourceUri = ([System.Uri]$sourcePath).AbsoluteUri
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $packagingRoot "..\..\.."))
$renderRoot = Join-Path $repositoryRoot "dist\.package\windows-assets"
$renderPath = Join-Path $renderRoot "logo-512.png"
$assets = @(
    @{ Name = "Square44x44Logo.png"; Size = 44 },
    @{ Name = "StoreLogo.png"; Size = 50 },
    @{ Name = "Square150x150Logo.png"; Size = 150 }
)

New-Item -ItemType Directory -Path $renderRoot -Force | Out-Null
& $EdgePath `
    --headless=new `
    --disable-gpu `
    --hide-scrollbars `
    --run-all-compositor-stages-before-draw `
    --virtual-time-budget=1000 `
    --window-size=512,512 `
    "--screenshot=$renderPath" `
    $sourceUri | Out-Null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $renderPath)) {
    throw "Could not render the CXApp package logo."
}

Add-Type -AssemblyName System.Drawing
$sourceImage = [System.Drawing.Image]::FromFile($renderPath)
try {
    foreach ($asset in $assets) {
        $outputPath = Join-Path $assetsRoot $asset.Name
        $bitmap = [System.Drawing.Bitmap]::new($asset.Size, $asset.Size)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($sourceImage, 0, 0, $asset.Size, $asset.Size)
            } finally {
                $graphics.Dispose()
            }
            $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $bitmap.Dispose()
        }
    }
} finally {
    $sourceImage.Dispose()
}
