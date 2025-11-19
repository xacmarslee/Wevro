# 修復 Google 登入錯誤代碼 10 完整指南

## 🔍 問題診斷

你遇到的錯誤：
- **錯誤代碼 10 (DEVELOPER_ERROR)**
- 原因：Android 應用程式的 SHA-1 指紋與 Firebase Console 設定不匹配

## ✅ 已完成的步驟

### 第一步：已獲取 SHA-1 指紋

你的 **Debug Keystore SHA-1** 指紋是：

```
38:71:36:4A:57:4E:5C:E0:E8:BA:A3:6F:55:B0:6E:12:43:D0:A9:A6
```

## 📋 接下來需要你手動操作的步驟

### 第二步：在 Firebase Console 新增 SHA-1 指紋

1. **打開 Firebase Console**
   - 前往：https://console.firebase.google.com/
   - 選擇專案：`wevro-5330b`

2. **進入專案設定**
   - 點擊左上角的 **⚙️ 專案設定** (Project Settings)
   - 或直接前往：https://console.firebase.google.com/project/wevro-5330b/settings/general

3. **找到 Android App**
   - 滾動到最下方的 **"Your apps"** 區塊
   - 找到你的 Android App（應用程式 ID: `com.wevro.app`）
   - 如果沒有 Android App，點擊 **"Add app"** > **"Android"** 創建一個

4. **新增 SHA-1 指紋**
   - 在 Android App 的設定中，找到 **"SHA certificate fingerprints"** 區塊
   - 點擊 **"Add fingerprint"** 按鈕
   - 貼上以下 SHA-1 指紋：
     ```
     38:71:36:4A:57:4E:5C:E0:E8:BA:A3:6F:55:B0:6E:12:43:D0:A9:A6
     ```
   - 點擊 **"Save"** 儲存

5. **等待生效**
   - 通常需要 **5-10 分鐘** 讓 Google 伺服器同步配置
   - 可以先去喝杯咖啡 ☕

### 第三步：檢查 OAuth Client ID 配置

確認你使用的是 **Web Client ID**，不是 Android Client ID：

1. **在 Firebase Console 中檢查**
   - 前往：Firebase Console > Authentication > Sign-in method
   - 點擊 **Google** 登入方式
   - 查看 **"Web SDK configuration"** 區塊
   - 複製 **"Web client ID"**（格式：`xxxxx.apps.googleusercontent.com`）

2. **確認 .env 檔案中的配置**
   - 打開專案根目錄的 `.env` 檔案
   - 確認 `VITE_GOOGLE_CLIENT_ID` 的值是 **Web Client ID**，不是 Android Client ID
   - 格式應該是：`995716307996-0qn22tmvad781j2pj10nlg7lvirfrhcc.apps.googleusercontent.com`

3. **為什麼要用 Web Client ID？**
   - `@codetrix-studio/capacitor-google-auth` 插件會自動讀取 `google-services.json` 處理 Android 驗證
   - 程式碼中的 `clientId` 是用來告訴 Google 要回傳哪個後端的 Token
   - 所以必須使用 **Web Client ID**

### 第四步：下載並更新 google-services.json（可選但建議）

雖然原生插件可能不需要 `google-services.json`，但為了確保配置正確，建議下載最新的：

1. **在 Firebase Console 下載**
   - 在 Android App 設定頁面
   - 點擊 **"Download google-services.json"** 按鈕
   - 下載檔案

2. **放置到專案中**
   - 將下載的 `google-services.json` 檔案
   - 放到 `android/app/` 目錄下
   - 覆蓋舊檔案（如果有的話）

3. **重新同步**
   ```bash
   npx cap sync android
   ```

## 🧪 測試修復結果

完成以上步驟後：

1. **等待 5-10 分鐘**（讓 Firebase 配置生效）

2. **重新構建應用**
   ```bash
   npm run build:mobile
   npx cap sync android
   ```

3. **在 Android Studio 中重新運行**
   - 或使用：`npx cap run android`

4. **測試 Google 登入**
   - 點擊 "Continue with Google" 按鈕
   - 應該會彈出系統原生的 Google 帳號選擇視窗
   - **不會再開啟瀏覽器**
   - **不會再出現錯誤代碼 10**

## ⚠️ 重要提醒

### 如果還是有問題，檢查：

1. **是否同時新增了 Debug 和 Release 的 SHA-1？**
   - Debug SHA-1：`38:71:36:4A:57:4E:5C:E0:E8:BA:A3:6F:55:B0:6E:12:43:D0:A9:A6` ✅ 已獲取
   - Release SHA-1：需要從 `wevro-release.keystore` 獲取（用於生產環境）

2. **是否使用了正確的 Client ID？**
   - ✅ 必須是 **Web Client ID**（格式：`xxxxx.apps.googleusercontent.com`）
   - ❌ 不要使用 Android Client ID

3. **是否等待了足夠的時間？**
   - Firebase 配置同步需要 5-10 分鐘
   - 如果立即測試可能還是會失敗

## 📝 獲取 Release SHA-1（用於生產環境）

當你要發布到 Google Play 時，也需要新增 Release keystore 的 SHA-1：

```powershell
cd android
keytool -list -v -keystore wevro-release.keystore -alias wevro -storepass 你的密碼
```

在輸出中找到 SHA1 指紋，然後同樣新增到 Firebase Console。

## 🎯 總結

修復步驟很簡單：
1. ✅ 已獲取 SHA-1：`38:71:36:4A:57:4E:5C:E0:E8:BA:A3:6F:55:B0:6E:12:43:D0:A9:A6`
2. ⏳ **你需要在 Firebase Console 新增這個 SHA-1**
3. ⏳ 確認使用 Web Client ID
4. ⏳ 等待 5-10 分鐘讓配置生效
5. ⏳ 重新構建並測試

完成後，錯誤代碼 10 就會消失，Google 登入就能正常工作了！

