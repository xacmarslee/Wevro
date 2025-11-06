# Capacitor 快速開始指南

快速將 Wevro 轉換為行動應用並開始開發。

## 🚀 快速開始（5 分鐘）

### 1. 構建並同步

最簡單的方式：
```bash
# Windows
build-mobile.bat

# 或手動執行
npm run build:mobile
npm run cap:sync
```

### 2. 開啟原生 IDE

**Android:**
```bash
npm run cap:android
```

**iOS (僅 Mac):**
```bash
npm run cap:ios
```

### 3. 運行應用

- **Android Studio:** 點擊綠色的 ▶️ Run 按鈕
- **Xcode:** 點擊 ▶️ 播放按鈕

完成！您的應用現在應該在模擬器或實體裝置上運行了。

---

## 💡 開發工作流程

### 方式一：標準流程（推薦初學者）

每次修改程式碼後：

```bash
npm run build:mobile  # 重新構建
npm run cap:sync      # 同步更改
# 在 IDE 中重新運行應用
```

### 方式二：即時重載（推薦進階用戶）

1. 找到你的本機 IP：
   ```bash
   ipconfig  # Windows
   # 找到 IPv4，例如 192.168.1.100
   ```

2. 編輯 `capacitor.config.ts`：
   ```typescript
   const config: CapacitorConfig = {
     // ...
     server: {
       url: 'http://192.168.1.100:5000',  // 你的 IP
       cleartext: true
     }
   };
   ```

3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

4. 同步並運行：
   ```bash
   npm run cap:sync
   # 在 IDE 中運行
   ```

現在修改程式碼會自動重載！

**⚠️ 重要：上架前必須移除 `server.url` 配置！**

---

## 📱 測試在實體裝置

### Android

1. 在手機上啟用「開發者選項」：
   - 設定 → 關於手機 → 連點「版本號碼」7 次

2. 啟用「USB 偵錯」：
   - 開發者選項 → USB 偵錯

3. 使用 USB 連接手機到電腦

4. 在 Android Studio 中選擇你的裝置並運行

### iOS

1. 使用 USB 連接 iPhone 到 Mac

2. 在 Xcode 中：
   - 選擇你的團隊（Signing & Capabilities）
   - 選擇你的裝置
   - 點擊運行

3. 在手機上信任開發者：
   - 設定 → 一般 → VPN 與裝置管理 → 信任

---

## 🎨 添加應用圖標和啟動畫面

### 快速方法（推薦）

1. 準備兩張圖片：
   - `resources/icon.png` (1024x1024)
   - `resources/splash.png` (2732x2732)

2. 執行命令：
   ```bash
   npm install -g @capacitor/assets
   npx @capacitor/assets generate
   ```

3. 同步更改：
   ```bash
   npm run cap:sync
   ```

完成！所有尺寸的圖標和啟動畫面已自動生成。

詳細說明請查看 `resources/README.md`。

---

## 📦 準備上架

### Android (Google Play)

1. **生成簽名金鑰：**
   ```bash
   cd android
   keytool -genkey -v -keystore wevro-release.keystore -alias wevro -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **配置簽名**（參考 `MOBILE_APP_SETUP.md`）

3. **構建 AAB：**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

4. **上傳到 Google Play Console**

### iOS (App Store)

1. **在 Xcode 中配置簽名**

2. **封存應用：**
   - Product → Archive

3. **上傳到 App Store：**
   - Organizer → Distribute App → App Store Connect

4. **在 App Store Connect 中提交審核**

---

## 📚 完整文檔

- **`MOBILE_APP_SETUP.md`** - 完整設置和上架指南
- **`APP_STORE_CHECKLIST.md`** - 上架前檢查清單
- **`resources/README.md`** - 資源準備說明

---

## ❓ 常見問題

**Q: 構建失敗怎麼辦？**
```bash
# 清理並重新構建
npm run build:mobile
npm run cap:sync
```

**Q: Android Gradle 錯誤？**
```bash
cd android
./gradlew clean
./gradlew build
```

**Q: iOS Pod 錯誤？**
```bash
cd ios/App
pod repo update
pod install
```

**Q: 如何更新 Capacitor？**
```bash
npm run cap:update
```

**Q: 如何添加 Capacitor 插件？**
```bash
npm install @capacitor/[plugin-name]
npm run cap:sync
```

---

## 🎯 下一步

1. ✅ 已完成基本設置
2. 📱 在裝置上測試應用
3. 🎨 添加應用圖標和啟動畫面
4. 🔧 根據需要調整配置
5. 📋 使用 `APP_STORE_CHECKLIST.md` 準備上架
6. 🚀 提交到應用商店

---

## 🆘 需要幫助？

- [Capacitor 官方文檔](https://capacitorjs.com/docs)
- [Capacitor Discord](https://discord.gg/UPYYRhtyzp)
- 查看完整的 `MOBILE_APP_SETUP.md`

---

**開始構建您的行動應用吧！** 📱✨

