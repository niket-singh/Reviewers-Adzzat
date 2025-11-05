#!/usr/bin/env pwsh
# PowerShell Script to Fix Tailwind CSS Issue on Windows
# Run this in PowerShell in your project directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AdzzatXperts - Tailwind CSS Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from your AdzzatXperts project directory" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host "  cd C:\Users\niket\Downloads\New folder\AdzzatXperts" -ForegroundColor Yellow
    Write-Host "  .\fix-tailwind.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/6] Cleaning up old build files..." -ForegroundColor Yellow
# Remove .next folder
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "  ✓ Removed .next folder" -ForegroundColor Green
}

# Remove node_modules/.cache
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force node_modules\.cache
    Write-Host "  ✓ Removed node_modules\.cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/6] Uninstalling Tailwind CSS v4..." -ForegroundColor Yellow
npm uninstall tailwindcss
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Uninstalled successfully" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Uninstall had warnings (this is okay)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/6] Installing Tailwind CSS v3.4.1..." -ForegroundColor Yellow
npm install -D tailwindcss@3.4.1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Installed successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Installation failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/6] Reinstalling all dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Installation failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[5/6] Verifying Tailwind CSS version..." -ForegroundColor Yellow
$tailwindVersion = npm list tailwindcss --depth=0 2>$null | Select-String "tailwindcss@"
if ($tailwindVersion -match "3\.4\.1") {
    Write-Host "  ✓ Tailwind CSS v3.4.1 confirmed" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Version check unclear, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/6] Checking environment file..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "  ✓ .env.local exists" -ForegroundColor Green
    Write-Host ""
    Write-Host "    Make sure it contains:" -ForegroundColor Cyan
    Write-Host "    - DATABASE_URL" -ForegroundColor White
    Write-Host "    - JWT_SECRET" -ForegroundColor White
    Write-Host "    - SUPABASE_URL" -ForegroundColor White
    Write-Host "    - SUPABASE_SERVICE_KEY" -ForegroundColor White
    Write-Host "    - NEXT_PUBLIC_APP_URL" -ForegroundColor White
} else {
    Write-Host "  ⚠ .env.local not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    Create .env.local with your credentials:" -ForegroundColor Cyan
    Write-Host "    Copy from .env.example and fill in your values" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure .env.local is configured with your credentials" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor Yellow
Write-Host "3. Open: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "If you see any errors, copy the full error message and let me know!" -ForegroundColor White
Write-Host ""
