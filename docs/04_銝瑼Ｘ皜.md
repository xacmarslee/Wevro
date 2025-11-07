# Wevro 應用上架檢查清單

使用此檢查清單確保您的應用已準備好上架到 Google Play 和 App Store。

---

## 📋 開發準備

### 環境設置
- [ ] 已安裝 Node.js 和 npm
- [ ] 已安裝 Android Studio（Android）
- [ ] 已安裝 Xcode（iOS，僅 Mac）
- [ ] 已配置環境變數

### 帳號準備
- [ ] 已註冊 Google Play Developer Account ($25 一次性費用)
- [ ] 已註冊 Apple Developer Account ($99/年，iOS)

---

## 🎨 資源準備

### 應用圖標
- [ ] 準備 1024x1024 PNG 圖標 (`resources/icon.png`)
- [ ] 圖標設計簡潔、易識別
- [ ] 圖標在白色和深色背景下都清晰
- [ ] 已執行 `npx @capacitor/assets generate`

### 啟動畫面
- [ ] 準備 2732x2732 PNG 啟動畫面 (`resources/splash.png`)
- [ ] 主要內容在安全區域內
- [ ] 與應用主題一致

### 應用截圖
需要準備不同裝置的截圖：

**Android:**
- [ ] 手機截圖 (至少 2 張，最多 8 張)
- [ ] 7 英寸平板截圖 (可選)
- [ ] 10 英寸平板截圖 (可選)

**iOS:**
- [ ] 6.7" iPhone 截圖 (至少 3 張)
- [ ] 6.5" iPhone 截圖 (至少 3 張)
- [ ] 5.5" iPhone 截圖 (至少 3 張)
- [ ] 12.9" iPad Pro 截圖 (可選)

### 推廣素材

**Android (Google Play):**
- [ ] 功能圖片 (1024x500)
- [ ] 高解析度圖標 (512x512)

**iOS (App Store):**
- [ ] App 預覽影片（可選）
- [ ] 推廣文字

---

## 🔧 應用配置

### 基本資訊
- [ ] 已設定正確的 App ID (`capacitor.config.ts`)
- [ ] 已設定應用名稱
- [ ] 已設定應用版本號

### Android 配置
- [ ] 更新 `android/app/build.gradle`：
  - [ ] `applicationId`
  - [ ] `versionCode`
  - [ ] `versionName`
  - [ ] `minSdkVersion` 和 `targetSdkVersion`

### iOS 配置
- [ ] 在 Xcode 中設定 Bundle Identifier
- [ ] 設定 Version 和 Build 號
- [ ] 選擇開發團隊
- [ ] 配置簽名證書

### 權限配置
檢查應用需要的權限並在配置中聲明：

**Android (`android/app/src/main/AndroidManifest.xml`):**
- [ ] INTERNET（默認已有）
- [ ] 其他需要的權限

**iOS (`ios/App/App/Info.plist`):**
- [ ] 相機（如需要）
- [ ] 相簿（如需要）
- [ ] 位置（如需要）
- [ ] 其他需要的權限，並提供使用說明

---

## 🏗️ 構建和測試

### 構建檢查
- [ ] 前端應用成功構建 (`npm run build:mobile`)
- [ ] 已同步到原生平台 (`npm run cap:sync`)
- [ ] 移除開發用的 `server.url` 配置

### 功能測試
- [ ] 所有主要功能正常運作
- [ ] 登入/註冊流程
- [ ] 數據載入和保存
- [ ] 錯誤處理正確
- [ ] 離線行為（如適用）

### 裝置測試
- [ ] 在實體 Android 手機上測試
- [ ] 在實體 iPhone 上測試（iOS）
- [ ] 在不同螢幕尺寸上測試
- [ ] 測試螢幕旋轉
- [ ] 測試深色模式

### 效能測試
- [ ] 應用啟動速度合理
- [ ] 沒有明顯的記憶體洩漏
- [ ] 動畫流暢
- [ ] 網路請求正常

---

## 🔐 Android 簽名和構建

### 生成金鑰
- [ ] 已生成 release keystore
- [ ] 妥善保管 keystore 文件和密碼
- [ ] 創建 `android/key.properties` 文件
- [ ] 配置 `android/app/build.gradle` 的簽名設定

### 構建 Release 版本
- [ ] 成功生成 AAB (`./gradlew bundleRelease`)
- [ ] 或成功生成 APK (`./gradlew assembleRelease`)
- [ ] 測試 release 版本運行正常

---

## 🍎 iOS 構建和簽名

### 證書和配置
- [ ] 在 Apple Developer Center 創建 App ID
- [ ] 創建開發證書
- [ ] 創建生產證書
- [ ] 創建配置描述文件
- [ ] 在 Xcode 中配置簽名

### 構建和上傳
- [ ] 成功創建 Archive
- [ ] 通過 Xcode 上傳到 App Store Connect
- [ ] 處理完成後顯示在 App Store Connect

---

## 📝 應用商店資訊

### 基本資訊（兩個平台）
- [ ] 應用名稱（30 字元以內）
- [ ] 簡短描述
- [ ] 完整描述
- [ ] 關鍵字/類別
- [ ] 支援網址
- [ ] 隱私政策網址（必需）

### Google Play 特定
- [ ] 應用類型和類別
- [ ] 內容分級問卷
- [ ] 目標受眾
- [ ] 資料安全表單
- [ ] 商店頁面資訊完整

### App Store 特定
- [ ] 副標題（30 字元）
- [ ] 推廣文字（170 字元）
- [ ] 年齡分級
- [ ] 評論資訊（測試帳號等）
- [ ] App 隱私詳情

---

## 📜 法律和政策

### 隱私政策
- [ ] 已創建隱私政策頁面
- [ ] 隱私政策網址可訪問
- [ ] 說明收集哪些數據
- [ ] 說明如何使用數據
- [ ] 說明第三方服務（如 Firebase、OpenAI）

### 使用條款
- [ ] 已創建使用條款（如需要）
- [ ] 條款網址可訪問

### 合規性
- [ ] 符合 GDPR（如適用）
- [ ] 符合 COPPA（如目標包含兒童）
- [ ] 符合當地法律法規

---

## 🚀 提交審核

### Google Play
- [ ] 已上傳 AAB
- [ ] 已填寫所有必填資訊
- [ ] 已設定定價和分發區域
- [ ] 已完成內容分級
- [ ] 已審閱所有資訊
- [ ] 已提交審核

### App Store
- [ ] 已上傳構建版本
- [ ] 已選擇構建版本
- [ ] 已填寫所有必填資訊
- [ ] 已提供審核資訊（如測試帳號）
- [ ] 已選擇發布方式
- [ ] 已提交審核

---

## ⏰ 審核後

### 監控
- [ ] 定期檢查審核狀態
- [ ] 準備好回應審核問題
- [ ] 設定郵件通知

### 發布後
- [ ] 監控崩潰報告
- [ ] 查看用戶評論和評分
- [ ] 收集用戶反饋
- [ ] 規劃更新和改進

### 行銷
- [ ] 準備發布公告
- [ ] 在社交媒體分享
- [ ] 通知現有用戶
- [ ] 考慮付費推廣（可選）

---

## 🔄 更新流程

每次更新應用時：

### 準備更新
- [ ] 更新版本號 (versionCode/Build 遞增)
- [ ] 更新 versionName/Version（如適用）
- [ ] 準備更新說明
- [ ] 測試新版本

### 構建和上傳
- [ ] 構建新的 release 版本
- [ ] 上傳到相應的商店
- [ ] 填寫「本次更新內容」
- [ ] 提交審核

---

## 📞 支援資源

### 文檔
- `MOBILE_APP_SETUP.md` - 完整設置指南
- `resources/README.md` - 資源準備說明

### 開發者控制台
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

### 幫助中心
- [Google Play 幫助](https://support.google.com/googleplay/android-developer)
- [App Store Connect 幫助](https://developer.apple.com/help/app-store-connect/)

### 社群
- [Capacitor Discord](https://discord.gg/UPYYRhtyzp)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/capacitor)

---

## ✅ 最終檢查

在點擊「提交審核」前：

- [ ] 所有功能已測試
- [ ] 在實體裝置上運行正常
- [ ] 所有截圖和資源已上傳
- [ ] 所有資訊準確無誤
- [ ] 隱私政策和使用條款可訪問
- [ ] 版本號正確
- [ ] 已備份簽名金鑰（Android）
- [ ] 準備好回應審核問題

---

**祝您上架順利！** 🎉

如果您在任何步驟遇到問題，請參考 `MOBILE_APP_SETUP.md` 獲取詳細說明。

