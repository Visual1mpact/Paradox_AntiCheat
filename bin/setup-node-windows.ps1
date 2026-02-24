# PowerShell script to bootstrap latest Node LTS on Windows
$ErrorActionPreference = "Stop"

Write-Host "🔎 Checking for Node..."

# Fetch latest LTS version once
$IndexJson = Invoke-RestMethod "https://nodejs.org/download/release/index.json"
$LatestLTS = ($IndexJson | Where-Object { $_.lts } | Select-Object -First 1).version
Write-Host "➡ Latest Node LTS: $LatestLTS"

$InstallNode = $true

if (Get-Command node -ErrorAction SilentlyContinue) {
    $CurrentVersion = (node -v).Trim()
    Write-Host "ℹ Current installed Node: $CurrentVersion"

    if ([version]$CurrentVersion.TrimStart("v") -ge [version]$LatestLTS.TrimStart("v")) {
        Write-Host "✅ Node is already latest LTS or newer."
        $InstallNode = $false
    }
    else {
        Write-Host "⬆ Updating Node to latest LTS..."
    }
}
else {
    Write-Host "📦 Node not found. Installing latest LTS..."
}

if (-not $InstallNode) {
    exit 0
}

# Determine architecture
$Arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }

# Installation directory
$InstallDir = "$env:USERPROFILE\nodejs"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}

# Download Node zip
$ZipUrl = "https://nodejs.org/download/release/$LatestLTS/node-$LatestLTS-win-$Arch.zip"
$ZipPath = "$InstallDir\node.zip"

Write-Host "📥 Downloading Node from $ZipUrl..."
Invoke-WebRequest $ZipUrl -OutFile $ZipPath

# Remove old extracted versions (clean upgrade)
Get-ChildItem $InstallDir -Directory -Filter "node-v*" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Extract Node
Write-Host "🗜 Extracting Node..."
Expand-Archive $ZipPath -DestinationPath $InstallDir -Force
Remove-Item $ZipPath

# Get extracted folder
$NodeFolder = Get-ChildItem $InstallDir -Directory -Filter "node-v*" | Select-Object -First 1
$NodeBin = $NodeFolder.FullName

# Update PATH for current session
$env:PATH = "$NodeBin;$env:PATH"

# Update user PATH permanently (avoid duplicates)
$UserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($UserPath -notlike "*$NodeBin*") {
    Write-Host "⚡ Updating user PATH permanently..."
    [Environment]::SetEnvironmentVariable("PATH", "$NodeBin;$UserPath", "User")
}

# Verify installation
Write-Host "✅ Node installed: $(node -v)"
Write-Host "✅ NPM installed: $(npm -v)"
Write-Host "🎉 Bootstrap complete! You can now run 'npm install'."
