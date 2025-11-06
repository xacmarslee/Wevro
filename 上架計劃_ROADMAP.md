# Wevro 應用上架完整路線圖

## 📍 您目前的位置

**開發進度：80% 完成** ✅

✅ **已完成：**
- 所有核心功能（心智圖、字卡、AI 功能）
- Firebase 認證系統
- 資料庫和後端 API
- Capacitor 行動應用框架
- 應用圖標和啟動畫面
- Android 和 iOS 專案基礎設置

❌ **待完成：**
- 移除開發配置
- Android 簽名
- 隱私政策
- 應用商店素材
- 打包和測試

---

## 🎯 上架策略建議

### 選項 A：快速上架（推薦）⭐
**目標：2-3 週內上架**

**優勢：**
- ✅ 快速驗證市場需求
- ✅ 開始收集用戶反饋
- ✅ 搶佔市場先機
- ✅ 先用免費模式累積用戶

**計劃：**
1. 先上架「免費版」（註冊送 30 點 + 每日 1 點）
2. 收集 1-2 個月用戶數據
3. 再添加付費功能（RevenueCat）
4. 推出更新版本

### 選項 B：完整上架
**目標：4-5 週內上架**

**優勢：**
- ✅ 一次性完成所有功能
- ✅ 從第一天就能賺錢

**計劃：**
1. 完成所有功能（包括付費）
2. 再提交審核

---

## 📅 階段 1：核心準備（2-3 天）

### 🔧 技術清理

#### 1. 移除開發配置 ⚠️ **必須**
```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.wevro.app',
  appName: 'Wevro',
  webDir: 'dist/public',
  // ❌ 移除這段（僅開發用）
  // server: {
  //   url: 'http://172.20.10.4:5000',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false,
    }
  }
};
```

#### 2. 更新版本資訊
```gradle
// android/app/build.gradle
defaultConfig {
    applicationId "com.wevro.app"
    versionCode 1         // 每次更新遞增
    versionName "1.0.0"   // 顯示版本
}
```

#### 3. 構建生產版本
```bash
npm run build:mobile
npm run cap:sync
```

### 📝 法律文件

#### 創建隱私政策頁面 ⚠️ **必須**

**選項 1：使用範本（最快）**
- 使用 [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
- 說明你收集的數據：
  - ✅ Email（Firebase 認證）
  - ✅ 使用數據（心智圖、字卡）
  - ✅ 第三方服務（Firebase、OpenAI）
  - ✅ 設備資訊（系統日誌）

**選項 2：我可以幫你生成範本**

**放置位置：**
```
/client/src/pages/PrivacyPolicy.tsx  （新建）
路由：/privacy-policy
```

#### 創建使用條款（選用）
- 可以先不做，用隱私政策就夠了

---

## 📅 階段 2：Android 準備（1-2 天）

### 🔑 生成簽名金鑰 ⚠️ **必須**

```bash
# 在 android 資料夾執行
cd android

# 生成 keystore（保留 10 年有效期）
keytool -genkey -v -keystore wevro-release.keystore -alias wevro -keyalg RSA -keysize 2048 -validity 10000

# 會詢問：
# - 密碼（請記住！）
# - 姓名
# - 組織單位
# - 組織名稱
# - 城市
# - 省份
# - 國家代碼（TW）
```

**⚠️ 超級重要：**
- 將 `wevro-release.keystore` 備份到安全位置
- 密碼要記下來
- 遺失將無法更新應用！

### 📄 配置簽名

創建 `android/key.properties`：
```properties
storePassword=你的密碼
keyPassword=你的密碼
keyAlias=wevro
storeFile=../wevro-release.keystore
```

編輯 `android/app/build.gradle`，在 `android` 區塊前添加：
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ...existing config...
    
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

### 📦 構建 Release 版本

```bash
cd android
./gradlew clean
./gradlew bundleRelease

# 輸出位置：
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📅 階段 3：應用商店素材（2-3 天）

### 📸 截圖準備

**需要的截圖：**

**Android (Google Play):**
- 手機截圖：至少 2 張，最多 8 張
- 尺寸：720x1280 或更高
- 建議：展示主要功能

**iOS (App Store):**
- 6.7" iPhone：至少 3 張（1290x2796）
- 6.5" iPhone：至少 3 張（1242x2688）
- 5.5" iPhone：至少 3 張（1242x2208）

**建議截圖內容：**
1. 登入/註冊畫面
2. 心智圖編輯器
3. 字卡練習
4. 例句查詢
5. 設定頁面

**工具：**
- 用 Android/iOS 模擬器截圖
- 使用 [Figma](https://www.figma.com/) 美化（加邊框、標題）

### ✍️ 應用商店文案

#### 應用名稱
```
Wevro - 英文學習神器
或
Wevro: Learn English
```

#### 簡短描述（80 字元）
```
AI 驅動的英文學習：心智圖、字卡、例句生成
```

#### 完整描述
```markdown
🚀 用 AI 革新你的英文學習方式

Wevro 結合心智圖記憶法和 AI 技術，讓學英文變得更有效率、更有趣！

✨ 核心功能：

📊 智慧心智圖
- 從一個單字展開完整的語意網路
- 自動生成同義詞、反義詞、搭配詞
- 視覺化記憶，效果提升 300%

🎴 AI 智慧字卡
- 自動生成定義和例句
- 間隔重複系統（SRS）
- 追蹤學習進度

💬 即時例句生成
- 任何單字立即生成例句
- 多種難度等級（A2-C1）
- 真實使用情境

🔍 深度字典
- 即時查詢
- 同義詞比較分析
- 搭配詞推薦

🎯 為什麼選擇 Wevro？

✅ 免費開始：註冊送 30 點，每日登入再送 1 點
✅ AI 驅動：使用最新 GPT 技術
✅ 視覺化學習：心智圖讓記憶更深刻
✅ 隨時隨地：手機、平板都能用
✅ 無廣告干擾

🎓 適合誰？

- 準備 TOEFL、IELTS、GRE 考試
- 提升商業英文能力
- 想要有效率學單字的人
- 喜歡視覺化學習的人

📈 Pro 會員福利（$6.99/月）：

- 每月 180 點
- 無限制使用
- 優先處理
- 進階統計分析

立即下載，開始你的 AI 英文學習之旅！
```

### 🎨 圖片素材

**高解析度圖標（Google Play）:**
- 512x512 PNG
- 透明背景或純色背景

**功能圖片（Google Play）:**
- 1024x500 PNG/JPG
- 展示應用主要功能

---

## 📅 階段 4：Google Play Console 設置（1-2 天）

### 1. 註冊開發者帳號
- 前往：https://play.google.com/console
- 支付 $25 一次性註冊費
- 填寫開發者資訊

### 2. 創建應用

**基本資訊：**
- 應用名稱：Wevro
- 預設語言：繁體中文或英文
- 應用類型：應用程式
- 免費/付費：免費

### 3. 填寫商店資訊

**主要商店資訊：**
- 簡短描述（80 字元）
- 完整描述（4000 字元）
- 應用圖標（512x512）
- 功能圖片（1024x500）
- 手機截圖（至少 2 張）

**分類：**
- 應用程式類別：教育
- 標籤：學習、語言、英文、字卡

### 4. 內容分級
- 填寫問卷
- Wevro 應該是「所有人」

### 5. 目標受眾和內容
- 目標年齡：13 歲以上
- 廣告：無（如果沒有廣告）

### 6. 資料安全表單
**需要揭露：**
- ✅ 收集使用者帳號資訊（Email）
- ✅ 收集使用數據（學習記錄）
- ✅ 資料已加密傳輸
- ✅ 用戶可以要求刪除資料

### 7. 上傳 AAB
- 前往「發布 > 生產」
- 上傳 `app-release.aab`
- 設定版本資訊

### 8. 定價和發布國家/地區
- 價格：免費
- 國家/地區：可選全球或特定地區

### 9. 提交審核
- 檢查所有資訊
- 點擊「提交審核」
- 等待 1-7 天

---

## 📅 階段 5：iOS App Store（需要 Mac）

### 前置需求
- ✅ Mac 電腦
- ✅ Xcode（從 App Store 安裝）
- ✅ Apple Developer Account ($99/年)

### 1. 註冊 Apple Developer
- 前往：https://developer.apple.com/programs/enroll/
- 選擇個人或公司帳號
- 支付 $99/年

### 2. 在 Xcode 中配置

```bash
cd ios/App
open App.xcworkspace  # 開啟 Xcode
```

在 Xcode 中：
1. 選擇專案 > 簽名與功能
2. 選擇你的開發團隊
3. 確認 Bundle Identifier：`com.wevro.app`
4. 啟用自動管理簽名

### 3. 創建 Archive

1. 在 Xcode 中：Product > Archive
2. 等待建構完成（5-10 分鐘）
3. 在 Organizer 中選擇 Archive
4. 點擊 "Distribute App"
5. 選擇 "App Store Connect"
6. 上傳

### 4. App Store Connect 設置

前往：https://appstoreconnect.apple.com

**創建新 App：**
- Bundle ID：com.wevro.app
- SKU：wevro-001
- 平台：iOS

**填寫資訊：**
- 名稱：Wevro
- 副標題：英文學習神器（30 字元）
- 類別：教育
- 年齡分級：4+
- 隱私政策網址（必需！）

**上傳素材：**
- 應用圖標（1024x1024）
- 不同裝置的截圖
- App 預覽影片（可選）

**提交審核**

---

## 📅 時間估算

### 快速上架（選項 A）- 2-3 週

| 階段 | 工作內容 | 時間 |
|------|---------|------|
| 1 | 技術清理 + 隱私政策 | 1-2 天 |
| 2 | Android 簽名 + 打包 | 1 天 |
| 3 | 應用商店素材 | 2-3 天 |
| 4 | Google Play 設置 + 提交 | 1-2 天 |
| 5 | 等待審核 | 1-7 天 |
| **總計** | | **2-3 週** |

### 完整上架（選項 B）- 4-5 週

| 階段 | 工作內容 | 時間 |
|------|---------|------|
| 1-4 | 同上 | 2-3 週 |
| 5 | RevenueCat 付費系統整合 | 1-2 週 |
| 6 | 測試 + 修正 | 3-5 天 |
| **總計** | | **4-5 週** |

---

## 💡 我的建議

### 🚀 建議採用「選項 A：快速上架」

**理由：**

1. **驗證市場需求**
   - 先讓真實用戶使用
   - 收集反饋再優化
   - 避免過度開發

2. **降低風險**
   - 付費系統複雜，容易出錯
   - 先用免費模式累積口碑
   - 有用戶基礎後再賺錢更容易

3. **時間效益**
   - 2-3 週 vs 4-5 週
   - 更早進入市場
   - 搶佔先機

4. **迭代策略**
   - 第 1 版：免費 + 基本功能
   - 第 2 版：加入付費系統（1-2 個月後）
   - 第 3 版：根據反饋優化

---

## 📋 下一步行動

### 立即開始（今天）：

1. **決定上架策略**
   - [ ] 選項 A：快速上架（推薦）
   - [ ] 選項 B：完整上架

2. **創建必要帳號**
   - [ ] Google Play Developer Account ($25)
   - [ ] Apple Developer Account ($99) - 如果要做 iOS

3. **技術準備**
   - [ ] 我幫你移除 `server.url`
   - [ ] 我幫你生成隱私政策範本
   - [ ] 你執行 Android 簽名步驟

### 明天：

4. **開始準備素材**
   - [ ] 截圖（使用模擬器）
   - [ ] 撰寫應用描述
   - [ ] 準備圖標

### 接下來 3-5 天：

5. **提交審核**
   - [ ] Google Play 設置並提交
   - [ ] iOS 設置並提交（如適用）

---

## 🤝 我可以幫你做什麼

1. ✅ **立即幫你移除開發配置**
2. ✅ **生成隱私政策範本**
3. ✅ **指導 Android 簽名步驟**
4. ✅ **幫你撰寫應用商店文案**
5. ✅ **回答任何技術問題**

---

## ❓ 常見問題

**Q: 一定要做 iOS 嗎？**
A: 不一定！可以先做 Android，等有用戶和收入再做 iOS。

**Q: 審核要多久？**
A: Google Play 通常 1-3 天，App Store 可能 3-7 天。

**Q: 如果審核被拒怎麼辦？**
A: 查看拒絕原因，修正後重新提交。常見原因是缺少隱私政策或截圖。

**Q: 可以先上架再加付費功能嗎？**
A: 可以！而且這是推薦做法。先累積用戶再monetize。

---

## 📞 準備好了嗎？

**告訴我你想要：**

1. 採用哪個策略（A 或 B）？
2. 要做 Android、iOS 還是兩個都做？
3. 我現在幫你移除開發配置並生成隱私政策？

**讓我們開始！** 🚀

