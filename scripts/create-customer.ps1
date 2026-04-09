# ============================================
# Create Customer — PowerShell Script
# Scaffolds a new customer directory from the default template
# ============================================
# Usage:
#   .\scripts\create-customer.ps1 -CustomerId "ali-store" -AppName "Ali Store"
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$CustomerId,

    [Parameter(Mandatory=$true)]
    [string]$AppName,

    [string]$PrimaryColor = "#6C5CE7",
    [string]$AccentColor = "#00CEC9"
)

$ErrorActionPreference = "Stop"

$customersDir = Join-Path $PSScriptRoot "..\customers"
$templateDir = Join-Path $customersDir "default"
$targetDir = Join-Path $customersDir $CustomerId

# Check if already exists
if (Test-Path $targetDir) {
    Write-Error "Customer '$CustomerId' already exists at: $targetDir"
    exit 1
}

# Copy template
Write-Host ""
Write-Host "Creating customer: $CustomerId" -ForegroundColor Cyan
Copy-Item -Recurse $templateDir $targetDir
Write-Host "[OK] Copied template to: $targetDir" -ForegroundColor Green

# Update config.json
$configFile = Join-Path $targetDir "config.json"
$config = Get-Content $configFile -Raw | ConvertFrom-Json

$config.customerId = $CustomerId
$config.appName = $AppName
$config.appNameAr = $AppName
$config.slug = $CustomerId
$config.scheme = $CustomerId
$config.bundleId = "com.saas.$($CustomerId -replace '-','.')"
$config.packageName = "com.saas.$($CustomerId -replace '-','.')"
$config.theme.primary = $PrimaryColor
$config.theme.accent = $AccentColor
$config.supabase.url = "https://YOUR_PROJECT.supabase.co"
$config.supabase.anonKey = "YOUR_ANON_KEY"

$config | ConvertTo-Json -Depth 10 | Set-Content $configFile -Encoding UTF8
Write-Host "[OK] Updated config.json" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Customer '$CustomerId' created!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Edit config: $configFile" -ForegroundColor White
Write-Host "     - Set supabase.url and supabase.anonKey" -ForegroundColor White
Write-Host "     - Customize theme colors" -ForegroundColor White
Write-Host "  2. Replace assets in: $(Join-Path $targetDir 'assets')" -ForegroundColor White
Write-Host "     - icon.png (1024x1024)" -ForegroundColor White
Write-Host "     - splash.png (1242x2436)" -ForegroundColor White
Write-Host "     - adaptive-icon.png (1024x1024)" -ForegroundColor White
Write-Host "  3. Run the database schema on the new Supabase project" -ForegroundColor White
Write-Host "  4. Build: .\scripts\build-customer.ps1 -CustomerId '$CustomerId'" -ForegroundColor White
Write-Host ""
