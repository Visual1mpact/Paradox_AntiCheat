# PowerShell script to bootstrap Node LTS on Windows
$ErrorActionPreference = "Stop"

Write-Host "🔎 Checking for Node..."

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "✅ Node is already installed: $(node -v)"
    Write-Host "💡 You can run 'npm install' to install dependencies."
    exit 0
}

Write-Host "📦 Node not found. Installing latest Node LTS..."

# Fetch Node release index and find latest LTS
$IndexJson = Invoke-RestMethod "https://nodejs.org/download/release/index.json"
$LatestLTS = ($IndexJson | Where-Object { $_.lts } | Select-Object -Last 1).version
Write-Host "➡ Latest Node LTS: $LatestLTS"

# Determine architecture
$Arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }

# Installation directory
$InstallDir = "$env:USERPROFILE\nodejs"
if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir | Out-Null }

# Download Node zip
$ZipUrl = "https://nodejs.org/download/release/$LatestLTS/node-$LatestLTS-win-$Arch.zip"
$ZipPath = "$InstallDir\node.zip"

Write-Host "📥 Downloading Node from $ZipUrl..."
Invoke-WebRequest $ZipUrl -OutFile $ZipPath

# Extract Node
Write-Host "🗜 Extracting Node..."
Expand-Archive $ZipPath -DestinationPath $InstallDir -Force
Remove-Item $ZipPath

# Find extracted folder
$NodeFolder = Get-ChildItem $InstallDir | Where-Object { $_.Name -like "node-v*" } | Select-Object -First 1
$NodeBin = Join-Path $NodeFolder.FullName ""

# Update PATH temporarily for current session
$env:PATH = "$NodeBin;$env:PATH"

# Update user PATH permanently
try {
    Write-Host "⚡ Updating user PATH permanently..."
    setx PATH "$NodeBin;%PATH%" | Out-Null
} catch {
    Write-Warning "⚠ Failed to update user PATH permanently. Node will work in this session only."
}

# Verify installation
Write-Host "✅ Node installed: $(node -v)"
Write-Host "✅ NPM installed: $(npm -v)"
Write-Host "🎉 Bootstrap complete! You can now run 'npm install'."
