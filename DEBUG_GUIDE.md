# 字卡和心智圖無法顯示 - 除錯指南

## 問題描述

使用者回報無法建立字卡（deck）和心智圖，儲存後頁面仍然空白。

## 已添加的除錯功能

我們已經在關鍵位置添加了詳細的日誌輸出，請按照以下步驟進行診斷：

### 1. 測試資料庫連接

首先確認資料庫連接是否正常：

```bash
node test-db-connection.js
```

**預期輸出：**
- ✅ DATABASE_URL 已設定
- ✅ 資料庫連接成功
- ✅ 找到所有必要的資料表
- 顯示當前的使用者、心智圖、字卡數量

**如果失敗：**
1. 檢查 `.env` 檔案中的 `DATABASE_URL` 是否正確
2. 確認 Neon 資料庫是否正常運行
3. 執行資料庫遷移：`npm run db:push`

### 2. 重新啟動開發伺服器

```bash
npm run dev
```

### 3. 開啟瀏覽器開發者工具

1. 按 F12 或右鍵選擇「檢查」
2. 切換到「Console」(控制台) 標籤
3. 清空控制台（可選）

### 4. 嘗試建立字卡

請按照以下步驟操作並觀察控制台輸出：

#### 步驟 A：載入字卡頁面

**控制台應顯示：**
```
[Flashcards] Fetching decks list, isAuthenticated: true
[Query] Fetching /api/flashcards
[Query Response] /api/flashcards {status: 200, statusText: 'OK', ok: true}
[Query Data] /api/flashcards [...]
[Flashcards] Decks loaded: [...]
```

**如果看到錯誤：**
- 401 錯誤 → Firebase 認證問題，請重新登入
- 500 錯誤 → 伺服器錯誤，檢查伺服器控制台
- 其他錯誤 → 記錄錯誤訊息

#### 步驟 B：點擊「建立字卡組」按鈕

應該會彈出對話框。

#### 步驟 C：輸入資料並建立

1. 輸入字卡組名稱（例如：Test Deck）
2. 輸入單字（例如：
   ```
   happy
   sad
   excited
   ```
3. 點擊「建立字卡組」按鈕

**控制台應顯示：**
```
[Flashcards] Creating deck: {name: 'Test Deck', words: Array(3)}
[API Request] POST /api/flashcards/batch-create {data: {...}}
[API Response] POST /api/flashcards/batch-create {status: 200, statusText: 'OK', ok: true}
[Flashcards] Deck created successfully: {...}
[Flashcards] onSuccess triggered, invalidating queries
[Flashcards] Fetching decks list, isAuthenticated: true
[Query] Fetching /api/flashcards
...
```

**成功的標誌：**
- 看到 "Deck created successfully"
- 看到 "onSuccess triggered"
- 查詢自動重新載入
- 頁面上應該顯示新建立的字卡組
- 應該看到成功的 toast 通知

**如果失敗：**
- 記錄完整的錯誤訊息
- 檢查伺服器控制台是否有錯誤
- 檢查 API 回應的狀態碼

### 5. 嘗試建立心智圖

#### 步驟 A：載入心智圖頁面

**控制台應顯示：**
```
[MindMaps] Fetching mind maps list, isAuthenticated: true
[Query] Fetching /api/mindmaps
[Query Response] /api/mindmaps {status: 200, statusText: 'OK', ok: true}
[Query Data] /api/mindmaps [...]
[MindMaps] Mind maps loaded: [...]
```

#### 步驟 B：建立新心智圖

1. 點擊「建立心智圖」按鈕
2. 輸入單字（例如：happy）
3. 點擊「建立」
4. 在編輯器中進行操作
5. 點擊儲存按鈕

**控制台應顯示：**
```
[MindMap] Saving mind map: {mindMapId: undefined, name: 'happy', nodeCount: 1}
[API Request] POST /api/mindmaps {data: {...}}
[API Response] POST /api/mindmaps {status: 200, statusText: 'OK', ok: true}
[MindMap] Created successfully: {...}
[MindMap] onSuccess triggered, invalidating queries
```

**成功的標誌：**
- 看到 "Created successfully"
- 看到 "onSuccess triggered"
- 看到成功的 toast 通知
- 彈出詢問是否建立字卡的對話框

### 6. 檢查伺服器控制台

伺服器控制台（運行 `npm run dev` 的終端機）應該顯示：

```
POST /api/flashcards/batch-create 200
GET /api/flashcards 200
POST /api/mindmaps 200
GET /api/mindmaps 200
```

**如果看到錯誤：**
- 記錄完整的錯誤堆疊
- 檢查是否有資料庫錯誤
- 檢查 OpenAI API 是否正常（用於生成定義）

## 常見問題和解決方案

### 問題 1：API 請求返回 401

**原因：** Firebase 認證失敗

**解決方案：**
1. 確認已登入
2. 檢查 localStorage 中的 `firebaseToken`
3. 嘗試登出再重新登入

### 問題 2：API 請求返回 500

**原因：** 伺服器內部錯誤

**解決方案：**
1. 檢查伺服器控制台的詳細錯誤
2. 確認資料庫連接正常
3. 確認 OpenAI API key 已設定（字卡功能需要）

### 問題 3：資料建立成功但頁面不更新

**原因：** React Query 快取未正確失效

**檢查項目：**
1. 確認控制台顯示 "invalidating queries"
2. 確認查詢重新執行
3. 檢查查詢返回的資料是否包含新項目

### 問題 4：OpenAI API 錯誤

**原因：** OpenAI API key 未設定或額度不足

**解決方案：**
1. 檢查 `.env` 中的 `AI_INTEGRATIONS_OPENAI_API_KEY`
2. 確認 OpenAI 帳戶有可用額度
3. 測試 API key 是否有效

## 需要回報的資訊

如果問題仍然存在，請提供以下資訊：

1. **瀏覽器控制台的完整輸出**（特別是錯誤訊息）
2. **伺服器控制台的完整輸出**
3. **資料庫測試腳本的輸出**（`node test-db-connection.js`）
4. **具體的操作步驟**（在哪一步失敗）
5. **錯誤的截圖**（如果有）

## 臨時移除日誌

除錯完成後，如果想要移除詳細的日誌輸出，請告知我，我會移除這些 console.log 語句。

