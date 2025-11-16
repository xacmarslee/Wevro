# Android 簽名與構建指南

## 📋 目錄
1. [生成簽名金鑰](#生成簽名金鑰)
2. [配置簽名設定](#配置簽名設定)
3. [構建 Release AAB](#構建-release-aab)
4. [常見問題](#常見問題)

---

## 🔑 生成簽名金鑰

### 方法 1：使用 keytool 命令（推薦）

在 `android` 目錄下執行：

```powershell
keytool -genkey -v -keystore wevro-release.keystore -alias wevro -keyalg RSA -keysize 2048 -validity 10000
```

**會詢問以下資訊：**
- 金鑰庫密碼：**請記住此密碼！**
- 重新輸入密碼
- 姓名/組織名稱：例如 `Wevro`
- 組織單位：可選，直接按 Enter
- 組織：例如 `Wevro`
- 城市：例如 `Taipei`
- 省份/州：例如 `Taiwan`
- 國家代碼：輸入 `TW`（兩個字母）

### 方法 2：使用完整路徑

如果 keytool 不在 PATH 中，使用完整路徑：

```powershell
"C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot\bin\keytool.exe" -genkey -v -keystore wevro-release.keystore -alias wevro -keyalg RSA -keysize 2048 -validity 10000
```

### 完成後

1. 確認 `wevro-release.keystore` 檔案已生成
2. 複製 `key.properties.example` 為 `key.properties`
3. 編輯 `key.properties` 填入密碼和路徑

---

## ⚙️ 配置簽名設定

### 步驟 1：創建 key.properties

1. 複製範例檔案：
```powershell
cd android
Copy-Item key.properties.example key.properties
```

2. 編輯 `key.properties`，填入：
   - `storePassword`：你的金鑰庫密碼
   - `keyPassword`：你的金鑰密碼（通常與金鑰庫密碼相同）
   - `keyAlias`：`wevro`
   - `storeFile`：`wevro-release.keystore`

### 步驟 2：確認 build.gradle 配置

`android/app/build.gradle` 應該已經配置好簽名設定。如果沒有，請參考 `01_上架步驟指南.md`。

---

## 🏗️ 構建 Release AAB

### 前置步驟

1. **構建前端**：
```bash
npm run build:mobile
```

2. **同步到 Capacitor**：
```bash
npm run cap:sync
```

### 在 Android Studio 中構建

1. **選單**：`Build` > `Generate Signed Bundle / APK`

2. **選擇類型**：
   - 選擇 `Android App Bundle`（不是 APK）
   - 點擊 `Next`

3. **選擇簽名配置**：
   - 應該會自動讀取 `key.properties`
   - 如果沒有，手動選擇：
     - Key store path: `android/wevro-release.keystore`
     - Key store password: 你的密碼
     - Key alias: `wevro`
     - Key password: 你的密碼
   - 點擊 `Next`

4. **選擇構建類型**：
   - 選擇 `release`
   - 點擊 `Create` 或 `Finish`

5. **等待構建完成**

6. **AAB 檔案位置**：
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```

### 驗證檔案

- 檔案大小應該約 10-30 MB
- 檔案類型應該是 `.aab`
- 檔案應該在 `bundle/release/` 目錄下

---

## ❓ 常見問題

### Java 版本不兼容

**問題**：Java 25 太新，Gradle 不支持

**解決方案**：使用 Android Studio 構建（自帶 Java），或安裝 Java 17/21（LTS 版本）

### AAB 檔案沒有生成

**解決方案**：
1. 使用 Android Studio 的 GUI 構建（不是命令行）
2. 確認選擇的是 `Android App Bundle`（不是 APK）
3. 檢查 Build 視窗是否有錯誤訊息

### 檢查 Gradle 同步狀態

- 查看底部狀態列：`Gradle sync finished` = 完成
- 查看 Build 視窗：`BUILD SUCCESSFUL` = 完成
- 手動同步：`File` > `Sync Project with Gradle Files`

---

## 🔒 安全提醒

- **務必備份 `wevro-release.keystore` 到安全位置**
- **記住密碼（建議使用密碼管理器）**
- **備份到至少 3 個地方**
- **遺失金鑰將永遠無法更新應用！**
- `key.properties` 和 `*.keystore` 已在 `.gitignore` 中，不會被提交

