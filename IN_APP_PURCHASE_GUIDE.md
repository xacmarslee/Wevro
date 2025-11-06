# App 內購系統實作指南
## Apple IAP + Google Play Billing

---

## 📱 支付系統選擇

Wevro 是純 App 應用程式，使用：
- **iOS**：Apple In-App Purchase (IAP)
- **Android**：Google Play Billing Library

❌ **不使用 Stripe**（Stripe 是給網頁版用的）

---

## 💰 手續費比較

| 平台 | 手續費 | 說明 |
|------|--------|------|
| **Apple IAP** | 30%（第一年）<br>15%（第二年起）| 自動續訂訂閱可享 15% 優惠 |
| **Google Play** | 30%（第一年）<br>15%（第二年起）| 同 Apple 政策 |

**影響：**
```
Pro 訂閱 $6.99/月：
- 第一年：您收到 $6.99 × 70% = $4.89
- 第二年起：您收到 $6.99 × 85% = $5.94
```

---

## 🛠️ 技術實作（Capacitor）

### 使用的插件

推薦使用 **RevenueCat**（最簡單的跨平台 IAP 方案）：

```bash
npm install @revenuecat/purchases-capacitor
```

**優點：**
- ✅ 統一 API 處理 iOS + Android
- ✅ 自動處理收據驗證
- ✅ 免費額度：每月 $2,500 收入內免費
- ✅ 提供分析 Dashboard

**替代方案：**
- Capacitor IAP Plugin（需分別處理兩平台）
- 直接用原生 StoreKit (iOS) + Billing Library (Android)

---

## 📦 產品設定

### 在 Apple App Store Connect 設定

**訂閱產品：**
- Product ID: `wevro_pro_monthly`
- 名稱：Wevro Pro
- 價格：$6.99/月
- 類型：自動續訂訂閱
- 訂閱群組：Wevro Subscriptions

**消耗型產品（點數包）：**
| Product ID | 名稱 | 價格 | 點數 |
|-----------|------|------|------|
| `wevro_tokens_small` | Token Pack S | $3.99 | 40 點 |
| `wevro_tokens_medium` | Token Pack M | $9.99 | 120 點 |
| `wevro_tokens_large` | Token Pack L | $24.99 | 300 點 |

### 在 Google Play Console 設定

**訂閱產品：**
- Product ID: `wevro_pro_monthly`
- 基本方案：$6.99/月
- 優惠：可設定新用戶首月 $4.99

**應用程式內產品（點數包）：**
| Product ID | 名稱 | 價格 |
|-----------|------|------|
| `wevro_tokens_small` | Token Pack S | $3.99 |
| `wevro_tokens_medium` | Token Pack M | $9.99 |
| `wevro_tokens_large` | Token Pack L | $24.99 |

---

## 💻 代碼實作範例（使用 RevenueCat）

### 1. 初始化（App 啟動時）

```typescript
// src/lib/purchases.ts
import Purchases from '@revenuecat/purchases-capacitor';

export async function initializePurchases() {
  await Purchases.configure({
    apiKey: 'your_revenuecat_api_key',
  });
}
```

### 2. 訂閱 Pro

```typescript
// Pricing.tsx
const handleSubscribe = async () => {
  try {
    // 取得產品資訊
    const offerings = await Purchases.getOfferings();
    const proPackage = offerings.current?.availablePackages.find(
      pkg => pkg.identifier === 'wevro_pro_monthly'
    );

    if (!proPackage) {
      throw new Error('Pro package not available');
    }

    // 購買
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: proPackage,
    });

    // 檢查訂閱狀態
    if (customerInfo.entitlements.active['pro']) {
      // 訂閱成功！通知後端
      await fetch('/api/billing/activate-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseToken: customerInfo.originalPurchaseDate,
        }),
      });

      toast({
        title: '訂閱成功！',
        description: '您已成為 Pro 會員',
      });
    }
  } catch (error) {
    if (error.userCancelled) {
      // 用戶取消購買
      return;
    }
    toast({
      title: '訂閱失敗',
      description: error.message,
      variant: 'destructive',
    });
  }
};
```

### 3. 購買點數包

```typescript
const handlePurchaseTokens = async (pack: 'small' | 'medium' | 'large') => {
  try {
    const offerings = await Purchases.getOfferings();
    const tokenPackage = offerings.current?.availablePackages.find(
      pkg => pkg.identifier === `wevro_tokens_${pack}`
    );

    if (!tokenPackage) {
      throw new Error('Token pack not available');
    }

    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: tokenPackage,
    });

    // 通知後端添加點數
    const tokenAmounts = { small: 40, medium: 120, large: 300 };
    await fetch('/api/billing/add-tokens', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pack,
        tokens: tokenAmounts[pack],
        purchaseToken: customerInfo.originalPurchaseDate,
      }),
    });

    toast({
      title: '購買成功！',
      description: `已添加 ${tokenAmounts[pack]} 點`,
    });
  } catch (error) {
    // 處理錯誤...
  }
};
```

### 4. 取消訂閱

```typescript
const handleCancelSubscription = async () => {
  // iOS/Android 訂閱管理是在系統設定中
  // 引導用戶前往系統設定
  
  if (Capacitor.getPlatform() === 'ios') {
    // iOS: 開啟 App Store 訂閱管理
    window.open('https://apps.apple.com/account/subscriptions');
  } else if (Capacitor.getPlatform() === 'android') {
    // Android: 開啟 Play Store 訂閱管理
    window.open('https://play.google.com/store/account/subscriptions');
  }
};
```

---

## 🔐 收據驗證（後端）

### 方案 A：使用 RevenueCat（推薦）

RevenueCat 會自動驗證收據，後端只需：

```typescript
// server/routes.ts
app.post("/api/billing/activate-subscription", firebaseAuthMiddleware, async (req, res) => {
  const userId = getUserId(req);
  
  // RevenueCat Webhook 會通知訂閱狀態
  // 或者呼叫 RevenueCat API 確認
  
  await upgradePlan(userId, 'pro');
  await replenishMonthlyTokens(userId);
  
  res.json({ success: true });
});
```

### 方案 B：自己驗證收據

需要實作：
- iOS: 呼叫 Apple App Store API 驗證收據
- Android: 呼叫 Google Play Developer API 驗證收據

（複雜，不推薦）

---

## 🎯 建議的實作步驟

### Phase 1: RevenueCat 設定（1-2 天）
1. 註冊 RevenueCat 帳號
2. 建立 App（iOS + Android）
3. 設定產品：
   - Entitlement: `pro`（訂閱）
   - Products: 4 個（1 訂閱 + 3 點數包）
4. 取得 API Key

### Phase 2: App Store / Play Console 設定（2-3 天）
1. 在 App Store Connect 建立 IAP 產品
2. 在 Google Play Console 建立應用程式內產品
3. 設定稅務和銀行資訊
4. 提交產品審核

### Phase 3: 前端整合（3-5 天）
1. 安裝 RevenueCat SDK
2. 實作購買流程
3. 實作訂閱狀態檢查
4. 實作恢復購買功能
5. 測試沙盒環境

### Phase 4: 後端整合（2-3 天）
1. 實作 RevenueCat Webhook
2. 實作訂閱啟用 API
3. 實作點數添加 API
4. 測試收據驗證

### Phase 5: 測試（3-5 天）
1. iOS 沙盒測試
2. Android 測試軌道
3. 測試所有支付流程
4. 測試取消/恢復訂閱

**總計：約 2-3 週**

---

## 📋 需要的環境變數

```env
# RevenueCat (App 內購)
REVENUECAT_API_KEY=your_revenuecat_api_key
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret

# App 資訊
IOS_BUNDLE_ID=com.yourcompany.wevro
ANDROID_PACKAGE_NAME=com.yourcompany.wevro
```

---

## ⚠️ 重要注意事項

### 1. 取消訂閱
- ❌ **不能在 App 內取消**
- ✅ 必須引導用戶到系統設定（App Store / Play Store）
- ✅ 可以檢測訂閱狀態變化

### 2. 退款政策
- Apple 和 Google 有各自的退款政策
- 用戶直接向 Apple/Google 申請退款
- 您會收到 Webhook 通知

### 3. 審核要求
- 必須提供「恢復購買」功能
- 必須顯示訂閱條款
- 必須說明訂閱會自動續訂

### 4. 稅務
- Apple/Google 會代收代繳各地稅金
- 您收到的是扣稅後金額

---

## 💰 實際收入計算（考慮手續費）

### Pro 訂閱（$6.99/月）

```
第一年（30% 手續費）:
- 用戶支付：$6.99
- Apple/Google 抽成：$2.10
- 您的收入：$4.89
- 成本：$1.50（平均）
- 利潤：$3.39
- 毛利率：69%

第二年起（15% 手續費）:
- 用戶支付：$6.99
- Apple/Google 抽成：$1.05
- 您的收入：$5.94
- 成本：$1.50
- 利潤：$4.44
- 毛利率：75%
```

### 點數包（30% 手續費）

| 點數包 | 用戶支付 | 手續費 | 您的收入 | 成本 | 利潤 | 毛利率 |
|--------|---------|--------|---------|------|------|--------|
| S | $3.99 | $1.20 | $2.79 | $0.48 | $2.31 | **83%** |
| M | $9.99 | $3.00 | $6.99 | $1.44 | $5.55 | **79%** |
| L | $24.99 | $7.50 | $17.49 | $3.60 | $13.89 | **79%** |

**即使扣掉 30% 手續費，毛利率仍然很高！**

---

## 🎯 總結

1. ✅ 使用 **RevenueCat** 最簡單（推薦）
2. ✅ 取消訂閱引導到系統設定
3. ✅ 手續費 30%，但利潤率仍健康（69-83%）
4. ✅ 第二年起手續費降至 15%，利潤更高

準備好要整合 RevenueCat 了嗎？

