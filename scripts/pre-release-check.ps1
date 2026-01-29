# Pre-Release Check Script for LiuMo
# Usage: .\scripts\pre-release-check.ps1
# Author: Antigravity

$ErrorActionPreference = "Stop"

function Write-Step {
    param($msg)
    Write-Host "`n[STEP] $msg" -ForegroundColor Cyan
}

function Write-Success {
    param($msg)
    Write-Host "  OK: $msg" -ForegroundColor Green
}

function Write-Error-Exit {
    param($msg)
    Write-Host "`n[ERROR] $msg" -ForegroundColor Red
    exit 1
}

# 1. Git Status Check
Write-Step "Checking Git Status..."
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host $gitStatus
    Write-Error-Exit "Git working directory is not clean. Please commit or stash changes first."
}
Write-Success "Git working directory is clean."

# 2. Version Consistency Check
Write-Step "Checking Version Consistency..."
if (-not (Test-Path "package.json")) { Write-Error-Exit "package.json not found!" }
if (-not (Test-Path "src-tauri/Cargo.toml")) { Write-Error-Exit "src-tauri/Cargo.toml not found!" }

$pkgJson = Get-Content "package.json" | ConvertFrom-Json
$pkgVersion = $pkgJson.version

$cargoContent = Get-Content "src-tauri/Cargo.toml" -Raw
if ($cargoContent -match 'version\s*=\s*"([^"]+)"') {
    $cargoVersion = $matches[1]
} else {
    Write-Error-Exit "Could not parse version from Cargo.toml"
}

if ($pkgVersion -ne $cargoVersion) {
    Write-Error-Exit "Version mismatch! package.json: $pkgVersion, Cargo.toml: $cargoVersion"
}
Write-Success "Versions match: v$pkgVersion"

# 3. Changelog Check
Write-Step "Checking CHANGELOG.md..."
$changelogPath = "CHANGELOG.md"
if (-not (Test-Path $changelogPath)) { Write-Error-Exit "CHANGELOG.md not found!" }
$changelogContent = Get-Content $changelogPath -Raw

# Flexible matching: "## [v1.6.0]" or "## v1.6.0"
$pattern = "## \[?v$pkgVersion\]?"

if ($changelogContent -notmatch $pattern) {
    Write-Error-Exit "CHANGELOG.md does not contain header for current version: ## v$pkgVersion"
}
Write-Success "CHANGELOG.md contains entry for v$pkgVersion"

# 4. Local Build Test
Write-Step "Running Local Build Test (npm run build)..."
# Using cmd /c to ensure npm is found and executed correctly
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Error-Exit "Build failed! Please fix build errors before releasing."
}
Write-Success "Local build successful."

# 5. Success Summary
Write-Host "`n--------------------------------------------------" -ForegroundColor Green
Write-Host "✅ ALL CHECKS PASSED for v$pkgVersion" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "You are ready to push. Run these commands:" -ForegroundColor Yellow
Write-Host "  git add ."
Write-Host "  git commit -m `"chore(release): bump version to v$pkgVersion`""
Write-Host "  git tag v$pkgVersion"
Write-Host "  git push origin main"
Write-Host "  git push origin v$pkgVersion"
