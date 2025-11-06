@echo off
chcp 65001 > nul
cls

echo =====================================
echo   Wevro 開發伺服器啟動中...
echo =====================================
echo.

cd /d "%~dp0"

if not exist ".env" (
    echo ❌ 錯誤: 找不到 .env 檔案！
    echo 請確認 .env 檔案存在於專案根目錄
    pause
    exit /b 1
)

echo ✓ .env 檔案已找到
echo.

if not exist "node_modules" (
    echo ❌ 錯誤: 找不到 node_modules！
    echo 正在安裝依賴套件...
    call npm install
)

echo ✓ 依賴套件已就緒
echo.

echo =====================================
echo   啟動伺服器...
echo =====================================
echo.
echo 如果啟動成功，伺服器將運行在:
echo http://localhost:5000
echo.
echo 按 Ctrl+C 可以停止伺服器
echo.
echo =====================================
echo.

set NODE_ENV=development
tsx server/index.ts

pause

