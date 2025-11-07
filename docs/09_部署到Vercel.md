# Wevro 部署到 Vercel 指南

## 為什麼要部署網頁版？

1. ✅ 隱私政策和使用條款可以用 `https://wevro.co/privacy-policy`
2. ✅ 網頁版和行動版共用程式碼，不用維護兩份
3. ✅ 用戶可以在電腦上使用（更大螢幕）
4. ✅ 應用商店會檢查網址是否有效

---

## 🚀 部署步驟

### 步驟 1：推送到 GitHub（已完成）

你的程式碼已經在 GitHub 了 ✅

### 步驟 2：部署到 Vercel

1. **前往 Vercel**
   - 網址：https://vercel.com
   - 用 GitHub 帳號登入

2. **創建新專案**
   - 點擊 "Add New Project"
   - 選擇 "Import Git Repository"
   - 選擇你的 `Wevro` 倉庫

3. **配置專案**
   - Framework Preset：選擇 "Other" 或 "Vite"
   - Root Directory：`.` (保持預設)
   - Build Command：`npm run build`
   - Output Directory：`dist/public`
   - Install Command：`npm install`

4. **設定環境變數**
   
   在 Environment Variables 區域添加（從你的 `.env` 複製）：
   
   ```
   DATABASE_URL=你的資料庫連接字串
   AI_INTEGRATIONS_OPENAI_API_KEY=你的OpenAI金鑰
   AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
   
   VITE_FIREBASE_API_KEY=你的Firebase金鑰
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   FIREBASE_SERVICE_ACCOUNT_KEY=你的Firebase服務帳號JSON
   ```

5. **部署**
   - 點擊 "Deploy"
   - 等待 5-10 分鐘
   - 完成！

### 步驟 3：設定自訂網域

1. 在 Vercel 專案設定中
2. 前往 "Domains"
3. 點擊 "Add Domain"
4. 輸入：`wevro.co`
5. Vercel 會給你 DNS 設定指示

6. 前往你的網域提供商（例如：GoDaddy、Namecheap）
7. 添加以下 DNS 記錄：
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel IP)
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

8. 等待 DNS 生效（可能需要 10 分鐘到 24 小時）

---

## ✅ 完成後

你就有：
- ✅ `https://wevro.co` - 網頁版應用
- ✅ `https://wevro.co/privacy-policy` - 隱私政策
- ✅ `https://wevro.co/terms-of-service` - 使用條款

直接在應用商店填寫這些網址即可！

---

## ⚠️ 注意事項

### 環境變數
- 確保所有環境變數都正確設定
- Firebase 設定要包含 VITE_ 前綴的變數
- DATABASE_URL 要用生產環境的資料庫

### 自訂網域
- DNS 生效需要時間
- 建議先用 Vercel 提供的網址測試
- 確認功能正常後再設定自訂網域

---

## 🎯 建議流程

### 選項 A：完整部署（推薦）
1. 現在部署到 Vercel
2. 設定 wevro.co 網域
3. 測試網頁版功能
4. 用 wevro.co 的網址提交應用商店

**優點：** 一次搞定，網頁版和行動版都有

### 選項 B：簡單方案（更快）
1. 只部署靜態的隱私政策頁面到 GitHub Pages
2. 設定 privacy.wevro.co 子網域
3. 先上架行動版
4. 之後再部署完整網頁版

**優點：** 更快上架，但要維護兩份

---

## 📋 我的建議

**選擇選項 A：完整部署到 Vercel**

因為：
- 程式碼已經準備好了
- Vercel 部署很簡單（15 分鐘）
- 網頁版和行動版共用程式碼
- 未來維護更容易

---

**你想要：**
1. 現在就部署到 Vercel（我可以幫你準備配置）？
2. 還是先用簡單方案快速上架？

告訴我你的選擇，我會幫你準備！🚀
