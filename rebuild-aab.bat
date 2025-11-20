@echo off
setlocal enabledelayedexpansion

chcp 65001 >nul 2>&1

echo ========================================
echo   Wevro AAB Rebuild Tool
echo ========================================
echo.

cd /d "%~dp0"
if errorlevel 1 (
    echo Error: Cannot change to script directory
    pause
    exit /b 1
)

echo Current directory: %CD%
echo.

echo [0/5] Checking Java version...
java -version >nul 2>&1
if errorlevel 1 (
    echo Error: Java is not installed or not in PATH
    echo Please install Java 17 or Java 21
    pause
    exit /b 1
)

set "FOUND_JAVA_HOME="
set "REQUIRED_JAVA="

echo Checking for Java 17 or 21 installation...

if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\java.exe" (
        for /f "tokens=*" %%v in ('"%JAVA_HOME%\bin\java.exe" -version 2^>^&1') do (
            echo %%v | findstr /i /c:"version" >nul
            if !errorlevel! equ 0 (
                echo %%v | findstr /r /c:"\"1[789]\." /c:"\"21\." /c:"1[789]-" /c:"21-" >nul
                if !errorlevel! equ 0 (
                    set "REQUIRED_JAVA=%JAVA_HOME%"
                    goto :java_verified
                )
            )
        )
    )
)

for /d %%d in ("C:\Program Files\Eclipse Adoptium\jdk-17*") do (
    if exist "%%d\bin\java.exe" (
        set "FOUND_JAVA_HOME=%%d"
        goto :java_found
    )
)
for /d %%d in ("C:\Program Files\Eclipse Adoptium\jdk-21*") do (
    if exist "%%d\bin\java.exe" (
        set "FOUND_JAVA_HOME=%%d"
        goto :java_found
    )
)
for /d %%d in ("C:\Program Files\Java\jdk-17*") do (
    if exist "%%d\bin\java.exe" (
        set "FOUND_JAVA_HOME=%%d"
        goto :java_found
    )
)
for /d %%d in ("C:\Program Files\Java\jdk-21*") do (
    if exist "%%d\bin\java.exe" (
        set "FOUND_JAVA_HOME=%%d"
        goto :java_found
    )
)

:java_found
if defined FOUND_JAVA_HOME (
    set "REQUIRED_JAVA=!FOUND_JAVA_HOME!"
)

:java_verified
if not defined REQUIRED_JAVA (
    echo.
    echo ERROR: Java 17 or Java 21 is required but not found!
    echo.
    echo Please install Java 17 or 21 from: https://adoptium.net/temurin/releases/?version=17
    echo Or set JAVA_HOME environment variable
    echo.
    echo Current JAVA_HOME: %JAVA_HOME%
    pause
    exit /b 1
)

set "JAVA_HOME=!REQUIRED_JAVA!"
echo Found compatible Java: %JAVA_HOME%
set "PATH=%JAVA_HOME%\bin;%PATH%"

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo ERROR: Java not found at: %JAVA_HOME%
    pause
    exit /b 1
)

echo Verifying Java version...
"%JAVA_HOME%\bin\java.exe" -version
echo.

echo [1/5] Cleaning old builds...
if exist "dist" (
    echo Cleaning dist directory...
    rmdir /s /q dist 2>nul
)
if exist "android\app\build" (
    echo Cleaning Android build directory...
    cd android
    call gradlew clean 2>nul
    cd ..
)
echo Clean complete
echo.

echo [2/5] Building frontend...
call npm run build:mobile
if errorlevel 1 (
    echo.
    echo Error: Frontend build failed
    pause
    exit /b 1
)
echo Frontend build complete
echo.

echo [3/5] Syncing to Capacitor...
call npx cap sync
if errorlevel 1 (
    echo.
    echo Error: Capacitor sync failed
    pause
    exit /b 1
)
echo Capacitor sync complete
echo.

echo [4/5] Cleaning Android build before AAB...
cd android
call gradlew clean 2>nul
cd ..
echo Android clean complete
echo.

echo [5/5] Building Android AAB...
cd android

if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\java.exe" (
        echo Using Java from: %JAVA_HOME%
        set "GRADLE_OPTS=-Dfile.encoding=UTF-8"
    ) else (
        set "GRADLE_OPTS=-Dfile.encoding=UTF-8"
    )
) else (
    set "GRADLE_OPTS=-Dfile.encoding=UTF-8"
)

set "JAVA_HOME=%JAVA_HOME%"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Executing Gradle with Java: %JAVA_HOME%
call gradlew bundleRelease --no-daemon
if errorlevel 1 (
    echo.
    echo Error: AAB build failed
    echo.
    echo Troubleshooting:
    echo 1. Ensure Java 17 or Java 21 is installed
    echo 2. Set JAVA_HOME environment variable
    echo 3. Check keystore configuration
    echo.
    cd ..
    pause
    exit /b 1
)
cd ..
echo AAB build complete
echo.

echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo AAB file locations:
if exist "android\app\build\outputs\bundle\release\app-release.aab" (
    echo   Found: android\app\build\outputs\bundle\release\app-release.aab
) else (
    echo   Not found: android\app\build\outputs\bundle\release\app-release.aab
)
if exist "android\app\release\app-release.aab" (
    echo   Found: android\app\release\app-release.aab
) else (
    echo   Not found: android\app\release\app-release.aab
)
echo.
pause
