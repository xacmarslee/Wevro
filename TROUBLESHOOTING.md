# 故障排除指南

## 🚨 「無法生成例句」錯誤

如果您在使用例句生成功能時遇到「生成失敗 - 無法生成例句」錯誤，請按照以下步驟排查：

### 步驟 1: 執行配置檢查工具

```bash
npm run check-config
```

這個工具會自動檢查：
- ✅ `.env` 檔案是否存在
- ✅ OpenAI API 金鑰是否正確設定
- ✅ 資料庫連線是否配置
- ✅ OpenAI API 連線是否正常

### 步驟 2: 檢查 OpenAI API 金鑰

**常見問題：**

#### 1. API 金鑰未設定或使用範例值

**症狀：** 錯誤訊息顯示「OpenAI API 金鑰未設定」

**解決方法：**
1. 開啟 `.env` 檔案
2. 檢查 `AI_INTEGRATIONS_OPENAI_API_KEY` 是否設定
3. 確認不是範例值 `your_openai_api_key_here`

```env
# ❌ 錯誤（範例值）
AI_INTEGRATIONS_OPENAI_API_KEY=your_openai_api_key_here

# ✅ 正確（實際金鑰）
AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

**如何取得 API 金鑰：**
1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 登入或註冊帳號
3. 前往 [API Keys](https://platform.openai.com/api-keys)
4. 點擊「Create new secret key」
5. 複製金鑰並貼到 `.env` 檔案

#### 2. API 金鑰無效或過期

**症狀：** 錯誤訊息顯示「OpenAI API 金鑰無效或過期」（HTTP 401）

**解決方法：**
1. 前往 [OpenAI API Keys](https://platform.openai.com/api-keys)
2. 檢查金鑰狀態
3. 如果金鑰已刪除或過期，建立新的金鑰
4. 更新 `.env` 檔案中的金鑰
5. 重新啟動開發伺服器

#### 3. API 配額用盡

**症狀：** 錯誤訊息顯示「OpenAI API 配額用盡或請求過於頻繁」（HTTP 429）

**解決方法：**
1. 前往 [OpenAI Usage](https://platform.openai.com/usage)
2. 檢查當前用量和配額
3. 如果超過免費額度，需要：
   - 等待配額重置（每月重置）
   - 或前往 [Billing](https://platform.openai.com/settings/organization/billing) 充值

**免費額度說明：**
- 新帳號通常有 $5 美金的免費額度
- 額度有效期通常為 3 個月
- 超過後需要設定付款方式

### 步驟 3: 檢查網路連線

**症狀：** 錯誤訊息顯示「無法連線到 OpenAI API」

**可能原因：**
1. 網路連線中斷
2. 防火牆阻擋
3. 代理伺服器設定問題
4. OpenAI 服務中斷

**解決方法：**
1. 檢查網路連線是否正常
2. 嘗試訪問 https://api.openai.com
3. 檢查防火牆設定
4. 查看 [OpenAI Status](https://status.openai.com/) 確認服務狀態

### 步驟 4: 檢查伺服器日誌

**開發模式下檢查：**

1. 確保開發伺服器正在運行：
```bash
npm run dev
```

2. 查看終端機輸出，尋找錯誤訊息：
```
📝 Generating examples for "traffic"...
❌ Error in /api/examples/generate: [錯誤詳情]
```

3. 根據錯誤訊息採取相應措施

### 步驟 5: 重新啟動服務

有時候簡單的重啟就能解決問題：

```bash
# 1. 停止開發伺服器 (Ctrl+C)
# 2. 重新啟動
npm run dev
```

## 🔧 其他常見問題

### 問題：伺服器啟動失敗

**檢查清單：**
- [ ] `.env` 檔案是否存在
- [ ] `DATABASE_URL` 是否正確設定
- [ ] 資料庫是否可連線
- [ ] 埠號 5000 是否被其他程式佔用

### 問題：前端顯示「網路錯誤」

**可能原因：**
1. 後端伺服器未啟動
2. 前端與後端的埠號不匹配
3. CORS 設定問題

**解決方法：**
1. 確認後端伺服器正在運行（預設埠號 5000）
2. 檢查瀏覽器控制台的錯誤訊息
3. 確認 API 請求的 URL 是否正確

### 問題：例句生成速度很慢

**正常情況：**
- 初次生成：2-5 秒
- 快取命中：即時

**如果超過 10 秒：**
1. 檢查網路速度
2. 檢查 OpenAI API 狀態
3. 考慮使用較小的 `counts` 參數

## 📞 取得協助

如果以上步驟都無法解決問題，請：

1. 執行配置檢查並保存輸出：
```bash
npm run check-config > config-check.txt
```

2. 收集錯誤訊息：
   - 瀏覽器控制台的錯誤
   - 伺服器終端的錯誤日誌
   - 完整的錯誤堆疊

3. 提供以下資訊：
   - 作業系統版本
   - Node.js 版本 (`node --version`)
   - 問題的詳細描述
   - 重現問題的步驟

## 🎯 快速檢查清單

- [ ] `.env` 檔案存在且正確設定
- [ ] OpenAI API 金鑰有效且有額度
- [ ] 網路連線正常
- [ ] 開發伺服器正在運行
- [ ] 瀏覽器控制台無錯誤
- [ ] 已嘗試重新啟動伺服器

如果全部打勾，應該就能正常使用例句生成功能了！✨

