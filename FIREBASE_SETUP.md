# Firebase Authentication Setup Guide

這份文檔說明如何設置 Firebase Authentication 來啟用登入功能。

## 步驟 1：創建 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」
3. 輸入專案名稱（例如：`wevro-app`）
4. 按照提示完成專案創建

## 步驟 2：啟用 Authentication

1. 在 Firebase Console 中，選擇你的專案
2. 點擊左側選單的「Authentication」
3. 點擊「開始使用」
4. 在「登入方法」標籤中，啟用以下方法：
   - **Google**：點擊 Google → 啟用 → 設定專案公開名稱和支援電子郵件 → 儲存
   - **電子郵件/密碼**：點擊電子郵件/密碼 → 啟用 → 儲存

## 步驟 3：註冊 Web 應用程式

1. 在專案總覽頁面，點擊「</> Web」圖示
2. 輸入應用程式暱稱（例如：`Wevro Web App`）
3. 複製 Firebase Config 物件中的值（稍後會用到）

## 步驟 4：設置環境變數（客戶端）

在專案根目錄的 `.env` 檔案中添加以下變數：

```bash
# Firebase Configuration (Frontend)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

將 `your_*` 替換為您從 Firebase Console 複製的實際值。

## 步驟 5：設置 Service Account（後端）

### 方法 A：使用 Service Account Key（生產環境推薦）

1. 在 Firebase Console 中，點擊「專案設定」（齒輪圖示）
2. 選擇「服務帳戶」標籤
3. 點擊「產生新的私密金鑰」
4. 下載 JSON 檔案
5. 將整個 JSON 檔案內容複製並壓縮成單行
6. 在 `.env` 中添加：

```bash
# Firebase Admin SDK (Backend)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...完整的JSON內容...}'
```

### 方法 B：僅使用 Project ID（開發環境）

如果只是本地測試，可以只設置 Project ID：

```bash
# Firebase Admin SDK (Backend) - Development only
FIREBASE_PROJECT_ID=your_project_id
```

**注意**：這種方法在生產環境中不夠安全，僅適用於開發測試。

## 步驟 6：更新授權網域

1. 在 Firebase Console 的 Authentication → 設定 → 授權網域
2. 添加您的網域，例如：
   - `localhost`（開發）
   - `your-app-domain.com`（生產）

## 步驟 7：重啟應用程式

設置完成後，重啟開發伺服器：

```bash
npm run dev
```

## 測試登入功能

1. 訪問應用程式首頁
2. 您應該看到登入頁面
3. 嘗試使用 Google 或 Email/Password 登入
4. 成功登入後應該能看到應用程式主頁

## 環境變數總覽

完整的 `.env` 檔案應包含：

```bash
# Database
DATABASE_URL=your_database_url

# OpenAI API
AI_INTEGRATIONS_OPENAI_API_KEY=your_openai_key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# Firebase Configuration (Frontend)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Backend)
FIREBASE_SERVICE_ACCOUNT_KEY='{"complete json here"}'
# OR (development only)
# FIREBASE_PROJECT_ID=your_project_id
```

## 疑難排解

### 錯誤：「Firebase: Error (auth/configuration-not-found)」
- 檢查所有 `VITE_FIREBASE_*` 環境變數是否正確設置
- 確保已重啟開發伺服器

### 錯誤：「Firebase Admin: Error initializing」
- 檢查 `FIREBASE_SERVICE_ACCOUNT_KEY` 格式是否正確
- 確保 JSON 是有效的並且正確轉義了引號

### Google 登入失敗
- 確保在 Firebase Console 中已啟用 Google 登入
- 檢查授權網域是否包含您的應用程式網域

### 電子郵件登入失敗
- 確保在 Firebase Console 中已啟用「電子郵件/密碼」登入
- 檢查密碼是否至少 6 個字元

## 安全建議

1. **不要將 `.env` 檔案提交到 Git**
   - 確保 `.env` 在 `.gitignore` 中

2. **保護 Service Account Key**
   - Service Account Key 有完整的 Firebase Admin 權限
   - 僅在伺服器端使用，不要暴露給客戶端

3. **設置 Firebase Security Rules**
   - 在 Firestore/Storage 中設置適當的安全規則

4. **定期輪換密鑰**
   - 定期更新 Service Account Key
   - 刪除不再使用的舊密鑰

## 更多資源

- [Firebase Authentication 文檔](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK 設置](https://firebase.google.com/docs/admin/setup)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules)

