# Wevro 開發伺服器啟動腳本
# =================================

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Wevro 開發伺服器啟動中..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 設定工作目錄
Set-Location $PSScriptRoot

# 檢查 .env 檔案
if (!(Test-Path ".env")) {
    Write-Host "❌ 錯誤: 找不到 .env 檔案！" -ForegroundColor Red
    Write-Host "請確認 .env 檔案存在於專案根目錄" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✓ .env 檔案已找到" -ForegroundColor Green

# 檢查 node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "❌ 錯誤: 找不到 node_modules！" -ForegroundColor Red
    Write-Host "正在安裝依賴套件..." -ForegroundColor Yellow
    npm install
}

Write-Host "✓ 依賴套件已就緒" -ForegroundColor Green
Write-Host ""

# 設定環境變數
$env:NODE_ENV = "development"

# 清理舊的進程
Write-Host "清理舊的 Node 進程..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  啟動伺服器..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "如果啟動成功，伺服器將運行在:" -ForegroundColor Cyan
Write-Host "http://localhost:5000" -ForegroundColor Yellow
Write-Host ""
Write-Host "按 Ctrl+C 可以停止伺服器" -ForegroundColor Gray
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# 啟動開發伺服器
npm run dev

