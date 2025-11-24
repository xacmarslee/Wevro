#!/usr/bin/env pwsh
# Wevro 行動應用構建工具

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Wevro 行動應用構建工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步驟 1: 構建前端
Write-Host "[1/3] 構建前端應用..." -ForegroundColor Yellow
npm run build:mobile

if ($LASTEXITCODE -ne 0) {
    Write-Host "錯誤: 前端構建失敗" -ForegroundColor Red
    Read-Host "按 Enter 繼續"
    exit 1
}

# 步驟 2: 同步到原生平台
Write-Host ""
Write-Host "[2/3] 同步到原生平台..." -ForegroundColor Yellow
npx cap sync

if ($LASTEXITCODE -ne 0) {
    Write-Host "錯誤: Capacitor 同步失敗" -ForegroundColor Red
    Read-Host "按 Enter 繼續"
    exit 1
}

# 步驟 3: 完成
Write-Host ""
Write-Host "[3/3] 構建完成！" -ForegroundColor Green
Write-Host ""
Write-Host "接下來您可以：" -ForegroundColor Cyan
Write-Host "  1. 執行 'npm run cap:android' 開啟 Android Studio"
Write-Host "  2. 執行 'npm run cap:ios' 開啟 Xcode (僅限 Mac)"
Write-Host ""

# 選單
do {
    Write-Host "請選擇：" -ForegroundColor Cyan
    Write-Host "[1] 開啟 Android Studio"
    Write-Host "[2] 僅退出"
    Write-Host ""
    
    $choice = Read-Host "請輸入選項 (1-2)"
    
    switch ($choice) {
        "1" {
            Write-Host "正在開啟 Android Studio..." -ForegroundColor Yellow
            npm run cap:android
            $done = $true
        }
        "2" {
            $done = $true
        }
        default {
            Write-Host "無效的選項，請重試" -ForegroundColor Red
            Write-Host ""
        }
    }
} while (-not $done)

Write-Host ""
Write-Host "完成！" -ForegroundColor Green
Read-Host "按 Enter 退出"






