@echo off
REM Batch Script to Fix Tailwind CSS Issue on Windows
REM Run this in Command Prompt in your project directory

echo ========================================
echo AdzzatXperts - Tailwind CSS Fix Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist package.json (
    echo ERROR: package.json not found!
    echo Please run this script from your AdzzatXperts project directory
    echo.
    echo Example:
    echo   cd C:\Users\niket\Downloads\New folder\AdzzatXperts
    echo   fix-tailwind.bat
    pause
    exit /b 1
)

echo [1/6] Cleaning up old build files...
if exist .next (
    rmdir /s /q .next
    echo   - Removed .next folder
)
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo   - Removed cache folder
)

echo.
echo [2/6] Uninstalling Tailwind CSS v4...
call npm uninstall tailwindcss
echo   - Uninstalled

echo.
echo [3/6] Installing Tailwind CSS v3.4.1...
call npm install -D tailwindcss@3.4.1
if errorlevel 1 (
    echo   - ERROR: Installation failed!
    pause
    exit /b 1
)
echo   - Installed successfully

echo.
echo [4/6] Reinstalling all dependencies...
call npm install
if errorlevel 1 (
    echo   - ERROR: Installation failed!
    pause
    exit /b 1
)
echo   - Dependencies installed

echo.
echo [5/6] Clearing npm cache...
call npm cache clean --force
echo   - Cache cleared

echo.
echo [6/6] Checking environment file...
if exist .env.local (
    echo   - .env.local exists
    echo.
    echo   Make sure it contains:
    echo     - DATABASE_URL
    echo     - JWT_SECRET
    echo     - SUPABASE_URL
    echo     - SUPABASE_SERVICE_KEY
    echo     - NEXT_PUBLIC_APP_URL
) else (
    echo   - WARNING: .env.local not found
    echo.
    echo   Create .env.local with your credentials
    echo   Copy from .env.example and fill in your values
)

echo.
echo ========================================
echo Fix Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure .env.local is configured
echo 2. Run: npm run dev
echo 3. Open: http://localhost:3000
echo.
pause
