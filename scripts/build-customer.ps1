# ============================================
# Build Customer — PowerShell Script
# Sets the CUSTOMER_ID env var and runs an Expo build
# ============================================
# Usage:
#   .\scripts\build-customer.ps1 -CustomerId "my-customer"
#   .\scripts\build-customer.ps1 -CustomerId "my-customer" -Platform "android"
#   .\scripts\build-customer.ps1 -CustomerId "my-customer" -DevMode
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$CustomerId,

    [ValidateSet("android", "ios", "all")]
    [string]$Platform = "all",

    [switch]$DevMode
)

$ErrorActionPreference = "Stop"

# Verify customer directory exists
$customerDir = Join-Path $PSScriptRoot "..\customers\$CustomerId"
if (-not (Test-Path $customerDir)) {
    Write-Error "Customer directory not found: $customerDir"
    Write-Host "Available customers:" -ForegroundColor Yellow
    Get-ChildItem -Path (Join-Path $PSScriptRoot "..\customers") -Directory | ForEach-Object { Write-Host "  - $($_.Name)" }
    exit 1
}

# Verify config.json exists
$configFile = Join-Path $customerDir "config.json"
if (-not (Test-Path $configFile)) {
    Write-Error "Config file not found: $configFile"
    exit 1
}

# Read and validate config
$config = Get-Content $configFile | ConvertFrom-Json
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Building: $($config.appName)" -ForegroundColor Cyan
Write-Host "  Customer: $CustomerId" -ForegroundColor Cyan
Write-Host "  Platform: $Platform" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variable
$env:CUSTOMER_ID = $CustomerId
Write-Host "[OK] CUSTOMER_ID set to: $CustomerId" -ForegroundColor Green

if ($DevMode) {
    Write-Host "[DEV] Starting Expo dev server..." -ForegroundColor Yellow
    npx expo start -c
} else {
    Write-Host "[BUILD] Starting EAS Build..." -ForegroundColor Yellow
    if ($Platform -eq "all") {
        eas build --platform all
    } else {
        eas build --platform $Platform
    }
}
