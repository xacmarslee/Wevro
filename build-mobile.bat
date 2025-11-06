@echo off
chcp 65001 >nul
echo ========================================
echo   Wevro Mobile App Build Tool
echo ========================================
echo.

echo [1/3] Building frontend...
call npm run build:mobile
if %ERRORLEVEL% NEQ 0 (
    echo Error: Frontend build failed
    pause
    exit /b 1
)

echo.
echo [2/3] Syncing to native platforms...
call npx cap sync
if %ERRORLEVEL% NEQ 0 (
    echo Error: Capacitor sync failed
    pause
    exit /b 1
)

echo.
echo [3/3] Build complete!
echo.
echo Next steps:
echo   1. Run "npm run cap:android" to open Android Studio
echo   2. Run "npm run cap:ios" to open Xcode (Mac only)
echo.

:menu
echo Please choose:
echo [1] Open Android Studio
echo [2] Exit
echo.
set /p choice="Enter option (1-2): "

if "%choice%"=="1" (
    echo Opening Android Studio...
    call npm run cap:android
    goto end
)
if "%choice%"=="2" (
    goto end
)

echo Invalid option, please try again
goto menu

:end
echo.
echo Done!
pause

