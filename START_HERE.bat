@echo off
chcp 65001 > nul
title Wevro Dev Server
color 0A
cls

echo.
echo ============================================
echo        Wevro 開發伺服器
echo ============================================
echo.
echo 正在啟動...
echo.

cd /d "%~dp0"

set NODE_ENV=development

echo 伺服器運行在: http://localhost:5000
echo.
echo 要停止伺服器請按 Ctrl+C
echo.
echo ============================================
echo.

npx tsx server/index.ts

echo.
echo ============================================
echo 伺服器已停止
echo ============================================
pause

