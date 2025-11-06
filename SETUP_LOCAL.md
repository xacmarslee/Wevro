# Wevro 本地開發設定指南

## 🚀 快速開始

### 步驟 1：取得 Neon Database（免費，必需）

1. 前往 [https://neon.tech](https://neon.tech)
2. 點擊 **Sign up** 註冊帳號（可用 GitHub 登入）
3. 建立新專案：
   - 點擊 **Create a project**
   - 選擇區域（建議選擇離您最近的）
   - 點擊 **Create project**
4. 複製連接字串：
   - 在專案頁面找到 **Connection string**
   - 選擇 **Pooled connection**
   - 複製完整的 URL（類似下面的格式）：
     ```
     postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

### 步驟 2：取得 OpenAI API 金鑰（付費，AI 功能必需）

1. 前往 [https://platform.openai.com](https://platform.openai.com)
2. 註冊/登入帳號
3. 前往 [Billing](https://platform.openai.com/settings/organization/billing/overview)
   - 點擊 **Add payment method**
   - 儲值至少 $5 USD
4. 前往 [API Keys](https://platform.openai.com/api-keys)
   - 點擊 **Create new secret key**
   - 給金鑰命名（例如：Wevro Local Dev）
   - 複製金鑰（以 `sk-` 開頭）
   - ⚠️ **重要**：此金鑰只會顯示一次，請妥善保存

### 步驟 3：更新 .env 檔案

編輯專案根目錄的 `.env` 檔案：

```env
# 資料庫配置（必需）
DATABASE_URL=postgresql://[您的 Neon 連接字串]

# OpenAI API 配置（AI 功能必需）
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-[您的 OpenAI API 金鑰]

# 伺服器配置
PORT=5000
NODE_ENV=development
```

### 步驟 4：初始化資料庫

```bash
npm run db:push
```

這會在您的 Neon Database 中建立必要的資料表。

### 步驟 5：啟動開發伺服器

```bash
npm run dev
```

### 步驟 6：開啟瀏覽器

訪問：http://localhost:5000

---

## 💰 費用估算

| 服務 | 費用 | 說明 |
|------|------|------|
| **Neon Database** | 免費 | 免費方案提供 500MB 儲存空間 |
| **OpenAI API** | ~$5-10/月 | 取決於使用量，最低儲值 $5 |

**預估使用量：**
- 查詢一個單字：~$0.001-0.002
- 生成心智圖（5-10個單字）：~$0.005-0.01
- 每月輕度使用（~100次查詢）：~$0.50-1.00

---

## 🆓 免費替代方案（僅基礎功能）

如果您暫時不想使用 OpenAI API，可以：

1. **只設定 DATABASE_URL**（必需）
2. **不設定 OpenAI API 金鑰**

**可用功能：**
- ✅ 查看介面
- ✅ 手動建立心智圖節點
- ✅ 檢視和管理字卡

**不可用功能：**
- ❌ AI 生成相關單字
- ❌ 自動翻譯
- ❌ 字典定義查詢

---

## ❓ 常見問題

### Q: 為什麼 Replit 上不需要這些設定？

A: Replit 為所有專案自動提供：
- Neon Database（自動配置）
- AI Integrations（免費的 OpenAI API 存取）
- 認證服務（Replit Auth）

這些服務在 Replit 環境外需要自行設定和付費。

### Q: 有其他免費的 AI API 替代方案嗎？

A: 目前這個專案使用 OpenAI API。理論上可以修改程式碼使用：
- Google Gemini API（有免費額度）
- Anthropic Claude（需付費）
- Ollama（本地運行，完全免費）

但需要修改 `server/openai.ts` 和相關程式碼。

### Q: 我可以用其他資料庫嗎？

A: 可以！只要是 PostgreSQL 相容的資料庫都可以：
- Supabase（免費方案）
- Railway（有限免費方案）
- 本地 PostgreSQL

只需更新 `DATABASE_URL` 即可。

---

## 📞 需要協助？

如果在設定過程中遇到問題，請確認：

1. ✅ Node.js 版本 >= 18
2. ✅ 已執行 `npm install`
3. ✅ `.env` 檔案在專案根目錄
4. ✅ 資料庫連接字串正確
5. ✅ OpenAI API 金鑰有效且帳戶有餘額

