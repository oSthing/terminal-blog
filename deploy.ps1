<#
.SYNOPSIS
    Build the terminal blog and deploy to oSthing/terminal-blog (source) and
    oSthing/oSthing.github.io (site).

.DESCRIPTION
    End-to-end pipeline:

        [1/4] Build                 npm run build
        [2/4] Source commit + push   -> oSthing/terminal-blog
        [3/4] Sync dist -> site      clear oSthing.github.io clone, copy dist/
        [4/4] Site commit + push     -> oSthing/oSthing.github.io

    The dev-only docs (CLAUDE.md, DEPLOY.md, DESIGN.md, FEATURES.md, PROJECT.md)
    are explicitly excluded from source commits via "git add -A" + restore --staged.

    Assumes the site clone is a sibling of this script's directory
    (../oSthing.github.io). Override with -SiteDir.

.PARAMETER Message
    Commit message for both repos. Defaults to "deploy: <UTC ISO8601 timestamp>".

.PARAMETER SkipBuild
    Reuse the existing dist/. The script will NOT touch the site clone in this case.

.PARAMETER SkipSource
    Don't commit/push the source repo (oSthing/terminal-blog).

.PARAMETER SkipDeploy
    Don't sync or commit/push the site repo (oSthing/oSthing.github.io).
    Use this when GitHub Actions handles the deploy (option A in DEPLOY.md).

.PARAMETER SkipSource
    Don't commit/push the source repo.

.PARAMETER SiteDir
    Path to the local clone of oSthing/oSthing.github.io.
    Defaults to <srcDir>/../oSthing.github.io.

.PARAMETER DryRun
    Print what would happen without modifying files, running npm, or invoking git.

.EXAMPLE
    .\deploy.ps1
    Full pipeline. Build + push both repos with a timestamped message.

.EXAMPLE
    .\deploy.ps1 -Message "fix: typo on about page"
    Full pipeline with a custom commit message.

.EXAMPLE
    .\deploy.ps1 -SkipBuild
    Skip the rebuild, use the existing dist/, then commit + push both repos.

.EXAMPLE
    .\deploy.ps1 -SkipDeploy
    Build + push source only. The site is deployed by GitHub Actions.

.EXAMPLE
    .\deploy.ps1 -SkipSource
    Use the latest committed source as-is; only sync + push the site.

.EXAMPLE
    .\deploy.ps1 -DryRun
    Show every command that would run, without doing anything.

.EXAMPLE
    .\deploy.ps1 -SiteDir "D:\repos\oSthing.github.io"
    Override the auto-detected site clone location.

.NOTES
    Author : oSthing
    Repo   : https://github.com/oSthing/terminal-blog
    See    : DEPLOY.md (sections 4, 5, 10)
#>
[CmdletBinding()]
param(
    [string]$Message = "",
    [switch]$SkipBuild,
    [switch]$SkipSource,
    [switch]$SkipDeploy,
    [string]$SiteDir = "",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$srcDir = $PSScriptRoot
$devDocs = @("CLAUDE.md", "DEPLOY.md", "DESIGN.md", "FEATURES.md", "PROJECT.md")

if ([string]::IsNullOrEmpty($Message)) {
    $Message = "deploy: " + [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
}

if ([string]::IsNullOrEmpty($SiteDir)) {
    $parent = Split-Path -Path $srcDir -Parent
    $SiteDir = Join-Path -Path $parent -ChildPath "oSthing.github.io"
}

# --- helpers ---------------------------------------------------------------

function Run-Step {
    param(
        [string]$Label,
        [scriptblock]$Action
    )
    if ($DryRun) {
        Write-Host "  [DRY-RUN] $Label" -ForegroundColor Yellow
        return
    }
    Write-Host "  $Label" -ForegroundColor DarkGray
    & $Action
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

function Get-StageList {
    if ($DryRun) { return @() }
    $out = git diff --cached --name-only 2>$null
    if ($LASTEXITCODE -ne 0) { return @() }
    return @($out)
}

function Show-StageList {
    param([string]$RepoName)
    $staged = Get-StageList
    if ($staged.Count -eq 0) {
        Write-Host "  no changes to commit in $RepoName." -ForegroundColor DarkGray
        return $false
    }
    Write-Host "  staged in ${RepoName}: $($staged.Count) file(s)" -ForegroundColor DarkGray
    foreach ($f in $staged) { Write-Host "    $f" -ForegroundColor DarkGray }
    return $true
}

function Write-Header {
    param([string]$Step, [string]$Title, [string]$Status = "")
    Write-Host ""
    Write-Host "[$Step] $Title" -ForegroundColor Cyan -NoNewline
    if ($Status) { Write-Host "  $Status" -ForegroundColor DarkGray }
}

# --- preflight -------------------------------------------------------------

Write-Host "Blog deploy script" -ForegroundColor Green
Write-Host "  source: $srcDir"
Write-Host "  site:   $SiteDir"
$flagList = @()
if ($SkipBuild)  { $flagList += "-SkipBuild" }
if ($SkipSource) { $flagList += "-SkipSource" }
if ($SkipDeploy) { $flagList += "-SkipDeploy" }
if ($DryRun)     { $flagList += "-DryRun" }
if ($flagList.Count -gt 0) {
    Write-Host "  flags:  $($flagList -join ' ')"
}

if (!(Test-Path -Path (Join-Path $srcDir "package.json") -PathType Leaf)) {
    throw "package.json not found in $srcDir — run this script from the source repo root."
}

if (!$SkipSource) {
    Push-Location $srcDir
    try {
        $branch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($branch -ne "main") {
            Write-Warning "Source branch is '$branch', expected 'main'."
        }
    } finally { Pop-Location }
}

if (!$SkipDeploy) {
    if (!(Test-Path -Path (Join-Path $SiteDir ".git") -PathType Container)) {
        throw "Site dir $SiteDir is not a git repo. Clone it first:`n  git clone https://github.com/oSthing/oSthing.github.io.git `"$SiteDir`""
    }
    if (!$SkipBuild -and !(Test-Path -Path (Join-Path $srcDir "dist/index.html") -PathType Leaf)) {
        throw "dist/index.html not found. Run without -SkipBuild first."
    }
}

# --- [1/4] build -----------------------------------------------------------

if ($SkipBuild) {
    Write-Header "1/4" "Build" "skipped (using existing dist/)"
} else {
    Write-Header "1/4" "Build"
    Push-Location $srcDir
    try {
        Run-Step "npm run build" { npm run build }
    } finally { Pop-Location }
}

# --- [2/4] source commit + push -------------------------------------------

if ($SkipSource) {
    Write-Header "2/4" "Source commit + push" "skipped"
} else {
    Write-Header "2/4" "Source commit + push"
    Push-Location $srcDir
    try {
        Run-Step "git add -A" { git add -A }
        foreach ($doc in $devDocs) {
            # If a dev doc got swept in by -A, unstage it. No-op if not staged.
            Run-Step "git restore --staged $doc (dev doc, skip)" { git restore --staged $doc }
        }
        if (Show-StageList -RepoName "terminal-blog") {
            Run-Step "git commit -m `"$Message`"" { git commit -m $Message }
            Run-Step "git push" { git push }
        }
    } finally { Pop-Location }
}

# --- [3/4] sync dist -> site clone ----------------------------------------

if ($SkipDeploy) {
    Write-Header "3/4" "Sync dist -> site" "skipped"
} elseif ($SkipBuild) {
    Write-Header "3/4" "Sync dist -> site" "skipped (build was skipped; re-run without -SkipBuild to refresh)"
} else {
    Write-Header "3/4" "Sync dist -> site"
    $distDir = Join-Path $srcDir "dist"

    if ($DryRun) {
        Get-ChildItem -Path $SiteDir -Force | Where-Object { $_.Name -ne ".git" } | ForEach-Object {
            Write-Host "  [DRY-RUN] remove $($_.FullName)" -ForegroundColor Yellow
        }
    } else {
        Get-ChildItem -Path $SiteDir -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
    }

    if ($DryRun) {
        Get-ChildItem -Path $distDir -Force | ForEach-Object {
            Write-Host "  [DRY-RUN] copy $($_.Name) -> $SiteDir" -ForegroundColor Yellow
        }
    } else {
        # Copy-Item -Force includes hidden files (.nojekyll, etc.) on Windows PowerShell.
        Get-ChildItem -Path $distDir -Force | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $SiteDir -Recurse -Force
        }
    }
}

# --- [4/4] site commit + push ---------------------------------------------

if ($SkipDeploy) {
    Write-Header "4/4" "Site commit + push" "skipped"
} else {
    Write-Header "4/4" "Site commit + push"
    Push-Location $SiteDir
    try {
        Run-Step "git add -A" { git add -A }
        if (Show-StageList -RepoName "oSthing.github.io") {
            Run-Step "git commit -m `"$Message`"" { git commit -m $Message }
            Run-Step "git push" { git push }
        }
    } finally { Pop-Location }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
