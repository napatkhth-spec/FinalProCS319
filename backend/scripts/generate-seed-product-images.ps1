$ErrorActionPreference = 'Stop'

if (-not $env:OPENAI_API_KEY) {
  throw 'OPENAI_API_KEY is not set in this PowerShell session.'
}

$python = Get-Command python -ErrorAction Stop
$backendDirectory = Split-Path -Parent $PSScriptRoot
$repositoryDirectory = Split-Path -Parent $backendDirectory
$assetsDirectory = Join-Path $backendDirectory 'assets/product-images'
$jobsPath = Join-Path $assetsDirectory 'jobs.jsonl'
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$imageGenerator = Join-Path $codexHome 'skills/.system/imagegen/scripts/image_gen.py'

if (-not (Test-Path -LiteralPath $imageGenerator -PathType Leaf)) {
  throw "Image generation CLI not found at the configured Codex skills path: $imageGenerator"
}

$jobs = @(Get-Content -LiteralPath $jobsPath | ForEach-Object { $_ | ConvertFrom-Json })
$pendingJobs = @($jobs | Where-Object { -not (Test-Path -LiteralPath (Join-Path $assetsDirectory $_.out)) })

if ($pendingJobs.Count -eq 0) {
  Write-Output "All $($jobs.Count) product image files already exist; nothing to generate."
  exit 0
}

$temporaryDirectory = Join-Path $backendDirectory 'tmp/imagegen'
New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
$temporaryJobsPath = Join-Path $temporaryDirectory 'pending-product-image-jobs.jsonl'
$jobLines = @($pendingJobs | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 10 })
[System.IO.File]::WriteAllLines($temporaryJobsPath, $jobLines, [System.Text.UTF8Encoding]::new($false))

Push-Location $repositoryDirectory
try {
  & $python.Source $imageGenerator generate-batch `
    --input $temporaryJobsPath `
    --out-dir $assetsDirectory `
    --concurrency 2 `
    --fail-fast `
    --no-augment

  if ($LASTEXITCODE -ne 0) {
    throw "Image generation CLI exited with code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}

Write-Output "Generated $($pendingJobs.Count) product image(s) in $assetsDirectory."
