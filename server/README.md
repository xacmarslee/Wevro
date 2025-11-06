# Server 目錄結構說明

## 📁 AI 服務檔案

### `ai-generators.ts` - AI 生成器
**用途：** 所有使用 AI 「生成」新內容的功能

**函數：**
1. ✨ `generateRelatedWords(word, category)` - 心智圖類別展開
   - 用於：心智圖功能，展開同義詞、反義詞、搭配詞等
   - API: `/api/generate-words`

2. ✨ `generateExampleSentences(query, sensesCount, phraseCount)` - 例句生成
   - 用於：查詢頁面的例句功能
   - 生成多個詞義的例句，包含難度、主題、長度標註
   - API: `/api/examples/generate`

3. ✨ `generateBatchDefinitions(words)` - 字卡批次生成
   - 用於：建立字卡組時批次生成中文翻譯
   - 格式：「詞性代號. 翻譯」（例如：`n. 頂端\nadj. 最高的`）
   - API: `/api/flashcards/batch-create`

4. ✨ `generateSynonymComparison(query)` - 同義字比較
   - 用於：查詢頁面的同義字功能
   - 生成 5-7 個同義字，每個包含差異說明和 2 個例句
   - 按相似度排序
   - API: `/api/synonyms/generate`

---

### `ai-translator.ts` - AI 翻譯器
**用途：** 翻譯現有內容（不創造新內容）

**函數：**
1. 🌐 `translateWordSenses(headword, senses)` - 字典義項翻譯
   - 用於：字典查詢的後台翻譯佇列
   - 只翻譯從字典 API 獲得的英文內容
   - 不杜撰新的義項或例句

---

## 📁 其他服務檔案

### 字典相關
- `dictionary-api.ts` - 外部字典 API 串接
- `dictionary-service.ts` - 字典查詢服務（快取 + 佇列）
- `translation-queue.ts` - 翻譯佇列管理

### 資料庫相關
- `db.ts` - 資料庫連線
- `storage.ts` - 資料庫操作（CRUD）

### 伺服器相關
- `index.ts` - 主程式進入點
- `routes.ts` - API 路由定義
- `vite.ts` - Vite 開發伺服器
- `replitAuth.ts` - Replit 認證

---

## 🎯 設計原則

### AI 功能分類
- **生成器（Generators）** → `ai-generators.ts`
  - 創造新內容
  - 使用者直接觸發
  - 需要較高的創造性

- **翻譯器（Translator）** → `ai-translator.ts`
  - 翻譯現有內容
  - 背景自動執行
  - 忠實翻譯，不創造

### 命名規範
- 生成類函數：`generate[功能]`
- 翻譯類函數：`translate[對象]`

---

## 📝 使用範例

```typescript
// 心智圖展開
import { generateRelatedWords } from "./ai-generators";
const synonyms = await generateRelatedWords("happy", "synonyms");

// 例句生成
import { generateExampleSentences } from "./ai-generators";
const examples = await generateExampleSentences("traffic", 3, 2);

// 字卡生成
import { generateBatchDefinitions } from "./ai-generators";
const definitions = await generateBatchDefinitions(["happy", "sad", "excited"]);

// 同義字比較
import { generateSynonymComparison } from "./ai-generators";
const synonyms = await generateSynonymComparison("happy");

// 字典翻譯
import { translateWordSenses } from "./ai-translator";
const translations = await translateWordSenses("happy", englishSenses);
```

---

## 🔄 遷移紀錄

**2024 重構：**
- ❌ 刪除 `openai.ts`（功能分散，職責不清）
- ❌ 刪除 `translator.ts`（功能分散）
- ✅ 創建 `ai-generators.ts`（生成類功能）
- ✅ 創建 `ai-translator.ts`（翻譯類功能）
- ✅ 移除重複的 `generateBatchDefinitions`（只保留一個）
- ✅ 移除未使用的 `generateChineseDefinition`

**優點：**
- 📦 職責單一，易於維護
- 🔍 快速找到特定功能的 Prompt
- 🚀 未來擴展容易（例如：同義字比較功能）

