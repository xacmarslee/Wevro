@echo off
chcp 65001 >nul
echo ========================================
echo Wevro Android 簽名金鑰生成工具
echo ========================================
echo.

REM 嘗試常見的 Eclipse Adoptium 安裝位置
set KEYTOOL_PATH=

if exist "C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot\bin\keytool.exe" (
    set "KEYTOOL_PATH=C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot\bin\keytool.exe"
    goto :found
)

if exist "C:\Program Files\Eclipse Adoptium\jdk-25\bin\keytool.exe" (
    set "KEYTOOL_PATH=C:\Program Files\Eclipse Adoptium\jdk-25\bin\keytool.exe"
    goto :found
)

REM 搜尋所有可能的 JDK 版本
for /d %%i in ("C:\Program Files\Eclipse Adoptium\jdk-*") do (
    if exist "%%i\bin\keytool.exe" (
        set "KEYTOOL_PATH=%%i\bin\keytool.exe"
        goto :found
    )
)

REM 檢查其他常見位置
if exist "C:\Program Files\Java\jdk-*\bin\keytool.exe" (
    for /d %%i in ("C:\Program Files\Java\jdk-*") do (
        if exist "%%i\bin\keytool.exe" (
            set "KEYTOOL_PATH=%%i\bin\keytool.exe"
            goto :found
        )
    )
)

echo 找不到 keytool.exe
echo.
echo 請手動找到 Java 安裝位置，通常位於：
echo   C:\Program Files\Eclipse Adoptium\jdk-XX\bin\keytool.exe
echo.
echo 或者重新啟動終端後再執行此腳本
pause
exit /b 1

:found
echo 找到 keytool: %KEYTOOL_PATH%
echo.

set KEYSTORE_NAME=wevro-release.keystore
set ALIAS=wevro

REM 檢查是否已存在
if exist "%KEYSTORE_NAME%" (
    echo 警告：%KEYSTORE_NAME% 已存在！
    set /p OVERWRITE=是否要覆蓋？(y/N): 
    if /i not "%OVERWRITE%"=="y" (
        echo 已取消
        pause
        exit /b 0
    )
    del "%KEYSTORE_NAME%"
)

echo 將使用以下設定：
echo   金鑰庫名稱: %KEYSTORE_NAME%
echo   別名: %ALIAS%
echo   演算法: RSA
echo   金鑰大小: 2048
echo   有效期: 10000 天（約 27 年）
echo.
echo 請按照提示輸入資訊：
echo   - 金鑰庫密碼：請記住此密碼！
echo   - 姓名/組織：例如 Wevro
echo   - 城市：例如 Taipei
echo   - 省份：例如 Taiwan
echo   - 國家代碼：輸入 TW
echo.

"%KEYTOOL_PATH%" -genkey -v -keystore %KEYSTORE_NAME% -alias %ALIAS% -keyalg RSA -keysize 2048 -validity 10000

if %ERRORLEVEL% == 0 (
    echo.
    echo ✅ 簽名金鑰生成成功！
    echo.
    echo 重要資訊：
    echo   金鑰庫檔案: %KEYSTORE_NAME%
    echo   別名: %ALIAS%
    echo.
    echo ⚠️  請務必：
    echo   1. 將 %KEYSTORE_NAME% 備份到安全位置
    echo   2. 記住密碼（建議使用密碼管理器）
    echo   3. 備份到至少 3 個地方
    echo   4. 遺失金鑰將無法更新應用！
    echo.
    echo 下一步：請編輯 key.properties 並填入密碼
) else (
    echo.
    echo ❌ 生成失敗，請檢查錯誤訊息
)

pause

