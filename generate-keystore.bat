@echo off
chcp 65001 >nul
echo ========================================
echo   Wevro Keystore Generator
echo ========================================
echo.

REM Check if Java is available
java -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Java is not installed or not in PATH
    echo Please install Java and ensure it's in your PATH
    pause
    exit /b 1
)

echo This script will generate a keystore file for signing your Android app.
echo.
echo IMPORTANT: Keep this keystore file and password safe!
echo You will need it for all future app updates.
echo.

set "KEYSTORE_PATH=android\wevro-release.keystore"

REM Check if keystore already exists
if exist "%KEYSTORE_PATH%" (
    echo ⚠️  WARNING: Keystore file already exists: %KEYSTORE_PATH%
    echo.
    set /p OVERWRITE="Do you want to overwrite it? (yes/no): "
    if /i not "%OVERWRITE%"=="yes" (
        echo Cancelled.
        pause
        exit /b 0
    )
    del "%KEYSTORE_PATH%"
    echo.
)

echo Generating keystore file...
echo.
echo You will be prompted to enter:
echo   1. Keystore password (use: wevro!2025 to match key.properties)
echo   2. Key password (use: wevro!2025 to match key.properties)
echo   3. Your name and organization information
echo.

keytool -genkey -v -keystore "%KEYSTORE_PATH%" -alias wevro -keyalg RSA -keysize 2048 -validity 10000

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Keystore generated successfully!
    echo.
    echo File location: %KEYSTORE_PATH%
    echo.
    echo ⚠️  IMPORTANT: 
    echo   - Keep this keystore file safe and backed up
    echo   - Remember your password (wevro!2025)
    echo   - You'll need this keystore for all future app updates
    echo.
) else (
    echo.
    echo ❌ Error: Failed to generate keystore
    echo.
)

pause

