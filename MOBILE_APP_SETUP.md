# Wevro 行動應用設置指南

本指南將協助您完成 Wevro 應用的 Android 和 iOS 版本設置，並準備上架到 Google Play 和 App Store。

## 目錄
1. [開發環境設置](#開發環境設置)
2. [應用圖標和啟動畫面](#應用圖標和啟動畫面)
3. [構建和測試](#構建和測試)
4. [上架準備](#上架準備)

---

## 開發環境設置

### Android 開發環境

#### 必要軟體
1. **Android Studio** (最新穩定版)
   - 下載：https://developer.android.com/studio
   - 安裝時確保選擇 "Android Virtual Device"

2. **Java Development Kit (JDK) 17**
   - 下載：https://www.oracle.com/java/technologies/downloads/

#### 環境變數設定 (Windows)
```batch
ANDROID_HOME=C:\Users\你的用戶名\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17
```

將以下路徑加入 PATH：
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%JAVA_HOME%\bin
```

### iOS 開發環境（僅限 Mac）

#### 必要軟體
1. **Xcode** (最新穩定版)
   - 從 Mac App Store 下載
   - 安裝後執行一次以接受授權條款

2. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

3. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

---

## 應用圖標和啟動畫面

### 圖標規格

#### Android 圖標
需要準備以下尺寸的 PNG 圖標（建議使用 1024x1024 原圖）：

**放置位置：** `android/app/src/main/res/`

| 資料夾 | 尺寸 | 用途 |
|--------|------|------|
| `mipmap-mdpi/` | 48x48 | 低密度螢幕 |
| `mipmap-hdpi/` | 72x72 | 中密度螢幕 |
| `mipmap-xhdpi/` | 96x96 | 高密度螢幕 |
| `mipmap-xxhdpi/` | 144x144 | 超高密度螢幕 |
| `mipmap-xxxhdpi/` | 192x192 | 超超高密度螢幕 |

檔案名稱：`ic_launcher.png` 和 `ic_launcher_round.png`

#### iOS 圖標
**放置位置：** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

需要在 Xcode 中設定，或使用工具自動生成。

**推薦尺寸：**
- 1024x1024 (App Store)
- 180x180 (iPhone)
- 167x167 (iPad Pro)
- 152x152 (iPad)
- 120x120 (iPhone 小尺寸)
- 87x87 (iPhone 設定)
- 80x80 (iPad 設定)
- 76x76 (iPad)
- 60x60 (iPhone 通知)
- 58x58 (iPad 設定)
- 40x40 (iPad 通知)
- 29x29 (設定)
- 20x20 (通知)

### 啟動畫面（Splash Screen）

#### Android 啟動畫面
**放置位置：** `android/app/src/main/res/drawable/`

1. 創建 `splash.png` (建議 1080x1920)
2. 編輯 `android/app/src/main/res/values/styles.xml`：

```xml
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
```

#### iOS 啟動畫面
**放置位置：** `ios/App/App/Assets.xcassets/Splash.imageset/`

在 Xcode 中配置 Launch Screen 或使用 Storyboard。

### 自動生成工具（推薦）

使用 **Capacitor Assets** 插件自動生成所有尺寸的圖標和啟動畫面：

```bash
npm install -g @capacitor/assets
```

**使用步驟：**

1. 在專案根目錄創建 `resources` 資料夾
2. 放置以下文件：
   - `icon.png` (1024x1024，應用圖標原圖)
   - `splash.png` (2732x2732，啟動畫面原圖)

3. 執行生成命令：
```bash
npx @capacitor/assets generate
```

這會自動生成所有需要的圖標和啟動畫面尺寸。

---

## 構建和測試

### 本地開發流程

1. **構建前端應用**
   ```bash
   npm run build:mobile
   ```

2. **同步到原生平台**
   ```bash
   npm run cap:sync
   ```

3. **開啟 Android Studio**
   ```bash
   npm run cap:android
   ```

4. **開啟 Xcode (Mac)**
   ```bash
   npm run cap:ios
   ```

### 即時重載開發（推薦）

在開發階段，可以讓手機連接到開發伺服器：

1. 找到你的本機 IP 位址：
   ```bash
   # Windows
   ipconfig
   # 查找 IPv4 位址，例如 192.168.1.100
   ```

2. 修改 `capacitor.config.ts`：
   ```typescript
   const config: CapacitorConfig = {
     // ... 其他配置
     server: {
       url: 'http://192.168.1.100:5000', // 替換為你的 IP
       cleartext: true
     }
   };
   ```

3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

4. 重新同步並在手機上測試：
   ```bash
   npm run cap:sync
   ```

**注意：** 上架前必須移除 `server.url` 配置！

### 在實體裝置上測試

#### Android
1. 在手機上啟用「開發者選項」和「USB 偵錯」
2. 使用 USB 連接手機到電腦
3. 在 Android Studio 中選擇你的裝置
4. 點擊 Run 按鈕

#### iOS
1. 使用 USB 連接 iPhone 到 Mac
2. 在 Xcode 中：
   - 選擇你的團隊（需要 Apple Developer Account）
   - 選擇你的裝置
   - 點擊 Play 按鈕
3. 首次安裝可能需要在手機上信任開發者

---

## 上架準備

### Android (Google Play)

#### 1. 更新應用資訊

編輯 `android/app/build.gradle`：

```gradle
android {
    namespace "com.wevro.app"
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.wevro.app"  // 你的唯一應用 ID
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1         // 每次更新遞增
        versionName "1.0.0"   // 顯示給用戶的版本號
    }
    // ...
}
```

#### 2. 生成簽名金鑰

```bash
cd android
# 生成 keystore
keytool -genkey -v -keystore wevro-release.keystore -alias wevro -keyalg RSA -keysize 2048 -validity 10000

# 將 keystore 移到安全位置
move wevro-release.keystore C:\your-secure-location\
```

**重要：** 妥善保管 keystore 文件和密碼！遺失將無法更新應用！

#### 3. 配置簽名

創建 `android/key.properties`：
```properties
storePassword=你的密碼
keyPassword=你的密碼
keyAlias=wevro
storeFile=C:/your-secure-location/wevro-release.keystore
```

編輯 `android/app/build.gradle`，在 `android` 區塊前添加：

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 4. 構建 Release APK/AAB

```bash
cd android
# 生成 AAB (推薦用於 Google Play)
./gradlew bundleRelease

# 或生成 APK
./gradlew assembleRelease
```

輸出位置：
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

#### 5. Google Play Console 上架

1. 前往 https://play.google.com/console
2. 創建應用
3. 填寫應用資訊：
   - 應用名稱、描述
   - 截圖（最少 2 張）
   - 應用圖標（512x512）
   - 功能圖片（1024x500）
4. 上傳 AAB 文件
5. 設定定價和分發區域
6. 填寫內容分級問卷
7. 提交審核

### iOS (App Store)

#### 1. Apple Developer Account
- 需要付費的 Apple Developer Account ($99/年)
- 註冊：https://developer.apple.com

#### 2. 在 Xcode 中配置

1. 開啟 `ios/App/App.xcworkspace`
2. 選擇專案 -> 簽名與功能
3. 選擇你的團隊
4. 配置 Bundle Identifier: `com.wevro.app`
5. 確保自動管理簽名已啟用

#### 3. 更新版本號

在 Xcode 中：
- General -> Identity -> Version: `1.0.0`
- General -> Identity -> Build: `1`

#### 4. 創建 App Store 檔案

1. 在 Xcode 中：Product -> Archive
2. 等待封存完成
3. 在 Organizer 中選擇封存
4. 點擊 "Distribute App"
5. 選擇 "App Store Connect"
6. 點擊 "Upload"

#### 5. App Store Connect 上架

1. 前往 https://appstoreconnect.apple.com
2. 創建新 App
3. 填寫應用資訊：
   - 名稱、副標題
   - 描述、關鍵字
   - 截圖（各種裝置尺寸）
   - 應用圖標（1024x1024）
4. 選擇剛上傳的構建版本
5. 填寫 App 審核資訊
6. 提交審核

---

## 更新應用配置

### 更新應用 ID

如果需要更改應用 ID（例如使用你自己的域名）：

1. 編輯 `capacitor.config.ts`：
   ```typescript
   appId: 'com.yourcompany.wevro',
   ```

2. 更新 Android：
   - 編輯 `android/app/build.gradle` 中的 `applicationId`
   - 重命名 `android/app/src/main/java/com/wevro/app/` 資料夾結構

3. 更新 iOS：
   - 在 Xcode 中更新 Bundle Identifier

### 更新應用名稱

1. Android: 編輯 `android/app/src/main/res/values/strings.xml`
   ```xml
   <string name="app_name">Your App Name</string>
   ```

2. iOS: 在 Xcode 中更新 Display Name

---

## 常見問題

### 構建錯誤

**Q: Android Gradle 同步失敗**
```bash
cd android
./gradlew clean
./gradlew build
```

**Q: iOS Pod 安裝失敗**
```bash
cd ios/App
pod repo update
pod install
```

### 性能優化

1. **啟用 ProGuard（Android）**
   - 減小 APK 大小
   - 混淆程式碼

2. **優化圖片資源**
   - 使用 WebP 格式
   - 壓縮圖片

3. **程式碼分割**
   - 使用動態 import
   - 延遲載入非關鍵功能

### 測試清單

在上架前確保測試：

- [ ] 登入/註冊功能
- [ ] 所有主要功能
- [ ] 不同螢幕尺寸
- [ ] 旋轉螢幕
- [ ] 網路連接中斷處理
- [ ] 權限請求（如需要）
- [ ] 應用圖標正確顯示
- [ ] 啟動畫面正常
- [ ] 返回鍵行為（Android）
- [ ] 深色模式支援

---

## 有用的命令

```bash
# 構建前端
npm run build:mobile

# 同步到原生平台
npm run cap:sync

# 開啟 Android Studio
npm run cap:android

# 開啟 Xcode
npm run cap:ios

# 更新 Capacitor
npm run cap:update

# 添加 Capacitor 插件
npm install @capacitor/[plugin-name]
npx cap sync

# 檢視設備日誌
# Android
adb logcat

# iOS
# 在 Xcode 中查看 Console
```

---

## 相關資源

- [Capacitor 官方文檔](https://capacitorjs.com/docs)
- [Android Developer 指南](https://developer.android.com/guide)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Google Play Console 幫助](https://support.google.com/googleplay/android-developer)
- [App Store Connect 幫助](https://developer.apple.com/help/app-store-connect/)

---

## 支援

如遇到問題，請參考：
- Capacitor Discord: https://discord.gg/UPYYRhtyzp
- Stack Overflow: 搜尋 `capacitor` 標籤

---

祝您上架順利！🚀

