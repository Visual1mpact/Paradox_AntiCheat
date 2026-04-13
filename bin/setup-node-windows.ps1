$ErrorActionPreference = "Stop"

Write-Host "=== SYSTEM NODE INSTALLER ===" -ForegroundColor Cyan

# Self-elevate to Administrator if not already running as admin
$IsAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Write-Host "Restarting as Administrator..." -ForegroundColor Yellow

    Start-Process powershell -Verb RunAs -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy Bypass",
        "-File `"$PSCommandPath`""
    )

    exit
}

# Fetch latest LTS
$IndexJson = Invoke-RestMethod "https://nodejs.org/download/release/index.json"

$LatestLTS = (
    $IndexJson |
    Where-Object { $_.lts } |
    Sort-Object { [version]$_.version.TrimStart("v") } -Descending |
    Select-Object -First 1
).version

Write-Host "Latest LTS: $LatestLTS" -ForegroundColor Green

# Detect architecture
$Arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }

# SYSTEM install location
$InstallDir = "C:\Program Files\nodejs"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Download
$ZipUrl = "https://nodejs.org/download/release/$LatestLTS/node-$LatestLTS-win-$Arch.zip"
$ZipPath = "$env:TEMP\node.zip"

Write-Host "Downloading Node..." -ForegroundColor Cyan
Invoke-WebRequest $ZipUrl -OutFile $ZipPath

# Clean old system Node install
Write-Host "Cleaning old system Node install..." -ForegroundColor Yellow
Get-ChildItem $InstallDir -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Extract
Write-Host "Installing to Program Files..." -ForegroundColor Cyan
Expand-Archive $ZipPath -DestinationPath $InstallDir -Force
Remove-Item $ZipPath

# Get extracted folder (Node ZIP contains versioned folder)
$NodeFolder = Get-ChildItem $InstallDir -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

$NodeBin = $NodeFolder.FullName

Write-Host "Installed Node path: $NodeBin" -ForegroundColor Green

# -----------------------------
# SYSTEM PATH UPDATE (CRITICAL)
# -----------------------------

Write-Host "Updating SYSTEM PATH..." -ForegroundColor Cyan

$MachinePath = [Environment]::GetEnvironmentVariable("PATH", "Machine") -split ";"

# Remove old Node entries
$CleanMachinePath = $MachinePath | Where-Object {
    $_ -and ($_ -notmatch "nodejs") -and ($_ -notmatch "node-v")
}

# Ensure new Node is first
$NewMachinePath = @($NodeBin) + $CleanMachinePath

[Environment]::SetEnvironmentVariable(
    "PATH",
    ($NewMachinePath -join ";"),
    "Machine"
)

# Also update session PATH immediately
$env:PATH = "$NodeBin;" + ($CleanMachinePath -join ";")

# -----------------------------
# VERIFY SYSTEM RESOLUTION
# -----------------------------

Write-Host "`nVerifying installation..." -ForegroundColor Cyan

$NodePaths = where.exe node

Write-Host "Node resolution order:"
$NodePaths | ForEach-Object { Write-Host " - $_" }

$Expected = Join-Path $NodeBin "node.exe"

if ($NodePaths[0] -ne $Expected) {
    Write-Host "ERROR: Wrong Node is still being resolved!" -ForegroundColor Red
    Write-Host "Expected: $Expected"
    Write-Host "Actual:   $($NodePaths[0])"
    exit 1
}

Write-Host "`nNode version: $(node -v)" -ForegroundColor Green
Write-Host "npm version : $(npm -v)" -ForegroundColor Green

Write-Host "`nSYSTEM NODE INSTALL COMPLETE" -ForegroundColor Green
Write-Host "Restart VS Code and terminals for full effect." -ForegroundColor Yellow
