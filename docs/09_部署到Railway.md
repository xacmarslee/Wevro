# Wevro 部署到 Railway 指南

> Railway 比 Vercel 更適合全棧應用（前端+後端）

---

## 為什麼用 Railway？

- ✅ 支持 Express 後端（Vercel 不支持）
- ✅ 免費額度：$5/月（夠用很久）
- ✅ 自動偵測並部署
- ✅ 支持環境變數
- ✅ 可設定自訂網域 wevro.co
- ✅ 部署超簡單

---

## 🚀 部署步驟（15 分鐘）

### 步驟 1：註冊 Railway

1. 前往 https://railway.app
2. 點擊 "Login"
3. 用 GitHub 帳號登入
4. 授權 Railway 訪問你的倉庫

### 步驟 2：創建新專案

1. 點擊 "New Project"
2. 選擇 "Deploy from GitHub repo"
3. 找到並選擇 `Wevro` 倉庫
4. 點擊 "Deploy Now"

Railway 會自動：
- ✅ 偵測 Node.js 專案
- ✅ 執行 `npm install`
- ✅ 執行 `npm run build`
- ✅ 啟動 `npm run start`

### 步驟 3：設定環境變數

在 Railway 專案中：

1. 點擊你的服務（Service）
2. 前往 "Variables" 標籤
3. 點擊 "Raw Editor"
4. 貼上以下內容（從你的 `.env` 複製）：

```env
NODE_ENV=production
PORT=5000

# 資料庫
DATABASE_URL=你的Neon資料庫連接字串

# OpenAI
AI_INTEGRATIONS_OPENAI_API_KEY=你的OpenAI金鑰
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# Firebase 前端
VITE_FIREBASE_API_KEY=你的Firebase金鑰
VITE_FIREBASE_AUTH_DOMAIN=你的專案.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=你的專案ID
VITE_FIREBASE_STORAGE_BUCKET=你的專案.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=你的發送者ID
VITE_FIREBASE_APP_ID=你的應用ID

# Firebase 後端（整個 JSON）
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

5. 點擊 "Deploy" 重新部署

### 步驟 4：等待部署完成

- 查看 "Deployments" 標籤
- 等待狀態變成 "Success"（約 3-5 分鐘）
- 點擊部署查看日誌，確認沒有錯誤

### 步驟 5：取得網址並測試

1. 在 "Settings" 標籤找到 "Domains"
2. Railway 會自動生成一個網址（例如：`wevro-production.up.railway.app`）
3. 複製這個網址
4. 在瀏覽器打開測試：
   - 首頁能否載入
   - 能否登入
   - Token 是否顯示

### 步驟 6：設定自訂網域

1. 在 "Settings" → "Domains"
2. 點擊 "Custom Domain"
3. 輸入：`wevro.co`
4. Railway 會提供 CNAME 記錄

5. 前往你的網域提供商（GoDaddy、Namecheap 等）
6. 新增 CNAME 記錄：
   ```
   Type: CNAME
   Name: @
   Value: wevro-production.up.railway.app（Railway 提供的）
   ```

7. 等待 DNS 生效（10 分鐘到 24 小時）

---

## ✅ 完成後

你就有：
- ✅ `https://wevro.co` - 完整的網頁版（前端+後端）
- ✅ `https://wevro.co/privacy-policy` - 隱私政策
- ✅ `https://wevro.co/terms-of-service` - 使用條款
- ✅ Token 顯示正常
- ✅ 所有功能都能用

---

## 💰 費用

**Railway 免費額度：**
- $5 美元/月的免費額度
- 對於小型應用足夠了
- 超過才收費

**預估使用：**
- 你的應用很輕量
- 應該用不到 $5
- 完全免費！

---

## 🆚 Railway vs Vercel

| 項目 | Railway | Vercel |
|------|---------|--------|
| 全棧應用 | ✅ 支持 | ❌ 不支持 |
| Express 後端 | ✅ 支持 | ❌ 需改造 |
| 設定難度 | ⭐⭐ 簡單 | ⭐⭐⭐⭐ 複雜 |
| 免費額度 | $5/月 | 有限制 |
| 自訂網域 | ✅ 支持 | ✅ 支持 |

**結論：Railway 更適合！**

---

## ⚠️ 刪除 Vercel 專案

如果你已經在 Vercel 部署了：

1. 前往 Vercel Dashboard
2. 選擇 Wevro 專案
3. Settings → Delete Project

---

## 🎯 下一步

1. **立即前往 Railway** → https://railway.app
2. **用 GitHub 登入**
3. **Deploy Wevro 倉庫**
4. **設定環境變數**（最重要！）
5. **等待部署完成**
6. **測試功能**
7. **設定 wevro.co 網域**

---

**Railway 部署超簡單，15 分鐘搞定！** 🚀

