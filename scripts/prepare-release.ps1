$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $repoRoot "release"
$packageRoot = Join-Path $releaseRoot "edge-store"
$zipPath = Join-Path $releaseRoot "gpt-dialogue-extractor-edge.zip"

if (Test-Path $releaseRoot) {
  Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "src") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "src\\background") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot "src\\content") | Out-Null

Copy-Item -LiteralPath (Join-Path $repoRoot "manifest.json") -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $repoRoot "src\\background\\index.js") -Destination (Join-Path $packageRoot "src\\background\\index.js")
Copy-Item -LiteralPath (Join-Path $repoRoot "src\\content\\index.js") -Destination (Join-Path $packageRoot "src\\content\\index.js")
Copy-Item -LiteralPath (Join-Path $repoRoot "src\\content\\styles.css") -Destination (Join-Path $packageRoot "src\\content\\styles.css")
Copy-Item -LiteralPath (Join-Path $repoRoot "PRIVACY_POLICY.md") -Destination (Join-Path $packageRoot "PRIVACY_POLICY.md")

Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipPath -Force

Write-Host "Release package created:"
Write-Host "  Folder: $packageRoot"
Write-Host "  Zip:    $zipPath"
