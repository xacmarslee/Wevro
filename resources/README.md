# 應用資源文件

此資料夾用於存放應用的圖標和啟動畫面原始圖片。

## 需要的文件

### 1. icon.png
- **尺寸：** 1024x1024 像素
- **格式：** PNG，帶透明背景
- **用途：** 應用圖標，將自動生成所有需要的尺寸

**設計建議：**
- 使用簡潔的設計
- 避免細小的文字（在小尺寸下難以辨識）
- 確保在白色和深色背景下都清晰可見
- 圖標內容應在中心 80% 的區域內（避免被裁切）

### 2. splash.png
- **尺寸：** 2732x2732 像素
- **格式：** PNG
- **用途：** 應用啟動畫面，將自動生成所有需要的尺寸

**設計建議：**
- 將主要內容放在中心區域
- 考慮不同螢幕比例（可能會被裁切）
- 使用與應用主題一致的背景色
- 可以包含應用 Logo 和名稱

## 使用現有 Logo

您可以使用專案中的 `client/public/wevro transparent logo.png` 作為基礎：

1. 使用圖片編輯軟體（如 Photoshop、GIMP、Figma）
2. 調整大小並優化設計
3. 匯出為指定尺寸的 PNG 文件
4. 放置在此資料夾中

## 自動生成圖標和啟動畫面

準備好 `icon.png` 和 `splash.png` 後，執行：

```bash
# 安裝工具（僅需一次）
npm install -g @capacitor/assets

# 生成所有尺寸的圖標和啟動畫面
npx @capacitor/assets generate
```

這將自動生成：
- Android 所有密度的圖標
- iOS 所有尺寸的圖標
- Android 啟動畫面
- iOS 啟動畫面

## 線上工具

如果沒有圖片編輯軟體，可以使用這些免費線上工具：

### 圖標生成器
- https://www.appicon.co/ - 上傳一張圖片，自動生成所有尺寸
- https://icon.kitchen/ - Google 官方工具

### 啟動畫面生成器
- https://www.appicon.co/#splash-screen
- https://apetools.webprofusion.com/app/#/tools/imagegorilla

### 圖片編輯
- https://www.photopea.com/ - 線上 Photoshop 替代品
- https://www.canva.com/ - 易用的設計工具

## 檢查清單

在生成和部署前，確保：

- [ ] `icon.png` 尺寸正確 (1024x1024)
- [ ] `splash.png` 尺寸正確 (2732x2732)
- [ ] 圖標在不同背景下都清晰可見
- [ ] 圖標沒有細小難辨的元素
- [ ] 啟動畫面主要內容在安全區域內
- [ ] PNG 檔案已優化（檔案大小合理）
- [ ] 已執行 `npx @capacitor/assets generate`
- [ ] 在實體裝置上測試外觀

## 需要幫助？

參考主要文檔：`MOBILE_APP_SETUP.md` 中的「應用圖標和啟動畫面」章節。

