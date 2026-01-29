# Download Release Script for LiuMo
# Usage: .\scripts\download-release.ps1
# Author: Antigravity

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Error-Exit { param($msg) Write-Host "`n[ERROR] $msg" -ForegroundColor Red; exit 1 }

# 1. Get Latest Tag
Write-Step "Checking for latest tag..."
try {
    $latestTag = git describe --tags --abbrev=0
} catch {
    Write-Error-Exit "Failed to get git tag. Are you in a git repo?"
}
Write-Host "   Target Version: $latestTag" -ForegroundColor Yellow

# 2. Find Workflow Run ID (with Retry)
Write-Step "Waiting for workflow to appear for $latestTag..."
$runId = $null
$maxRetries = 120 # Wait up to 10 minutes (120 * 5s)

for ($i = 1; $i -le $maxRetries; $i++) {
    # Check specifically for this tag
    # json parsing depends on gh cli output
    try {
        $json = gh run list --workflow release.yml --branch "$latestTag" --limit 1 --json databaseId
        if ($json) {
            $data = $json | ConvertFrom-Json
            if ($data -and $data.databaseId) {
                $runId = $data.databaseId
                break
            }
        }
    } catch {
        # Ignore json parse errors during polling
    }
    
    Write-Host "   ... run not found yet, retrying in 5s ($i/$maxRetries)..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
}

if (-not $runId) {
    Write-Error-Exit "Timeout: Could not find a workflow run for tag $latestTag after 60 seconds."
}

Write-Success "Found Run ID: $runId"

# 3. Watch Build
Write-Step "Watching build process (Run ID: $runId)..."
gh run watch "$runId" --exit-status
if ($LASTEXITCODE -ne 0) {
    Write-Error-Exit "Build Failed. Check GitHub Actions logs."
}
Write-Success "Build Successful!"

# 4. Download Asset
Write-Step "Downloading Portable executable..."
$distDir = "dist_release"
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }

# Download
gh release download "$latestTag" --pattern "*portable.exe" --dir $distDir --clobber

Write-Success "Download complete! Check '$distDir' folder."
Get-ChildItem $distDir
