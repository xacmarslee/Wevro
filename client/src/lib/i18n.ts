export type Language = "en" | "zh";

export const translations = {
  en: {
    appName: "Wevro",
    tagline: "AI-Powered Mind-Map Vocabulary",
    
    // Mind map
    enterWord: "Enter a word...",
    startLearning: "Start Learning",
    categories: {
      derivatives: "Derivatives",
      synonyms: "Synonyms",
      antonyms: "Antonyms",
      collocations: "Collocations",
      idioms: "Idioms",
      root: "Root",
      prefix: "Prefix",
      suffix: "Suffix",
      "topic-related": "Topic-related",
    },
    
    // Actions
    save: "Save",
    load: "Load",
    clear: "Clear",
    newMap: "New Mind Map",
    createFlashcards: "Create Flashcards",
    backToMap: "Back to Map",
    practice: "Practice",
    
    // Flashcards
    flashcards: "Flashcards",
    swipeMode: "Swipe Mode",
    spellingMode: "Spelling Mode",
    swipeLeft: "Don't Know",
    swipeRight: "I Know",
    flip: "Tap to Flip",
    typeWord: "Type the word...",
    submit: "Submit",
    next: "Next",
    finish: "Finish",
    
    // Stats
    progress: "Progress",
    known: "Known",
    unknown: "Unknown",
    
    // Messages
    generating: "Generating...",
    generatingHint: "This may take a few seconds.",
    loading: "Loading...",
    noCards: "No flashcards yet. Create a mind map first!",
    emptyMap: "Start by entering a word above.",
    
    // IAP / Purchase Messages
    iap: {
      billingNotSupported: "Billing Not Supported",
      billingNotSupportedDesc: "In-App Purchases are not supported on this device or emulator. Please use a real device or Google Play test environment.",
      initializationFailed: "IAP Initialization Failed",
      initializationFailedDesc: "Failed to initialize In-App Purchases. Please check your device and try again.",
      verificationError: "Verification Error",
      cannotDetermineProductId: "Cannot determine product ID from purchase. Please contact support with your transaction ID.",
      productIdMissing: "Product ID is missing. Please contact support with your transaction ID.",
      purchaseError: "Purchase Error",
      invalidProductIdentifier: "Invalid product identifier detected. The purchase cannot be verified.",
      purchaseSuccessful: "Purchase Successful",
      purchaseSuccessfulDesc: (tokens: number) => tokens > 0 
        ? `Your purchase has been processed. ${tokens} tokens added.`
        : "Your purchase has been processed. Please check your balance.",
      verificationFailed: "Verification Failed",
      networkError: "Network error during verification. Please check your connection and try again.",
      invalidProductId: "Invalid product ID. Please try again or contact support.",
      storeNotAvailable: "Store not available",
      storeNotAvailableDesc: "In-App Purchases are only available on mobile devices.",
      productNotFound: "Product not found",
      productNotFoundDesc: (productId: string) => `Could not find product: ${productId}. Please check Google Play Console configuration.`,
      productNotAvailable: "Product not available",
      productNotAvailableDesc: (productId: string, available: string) => `Product ${productId} is not available. Available: ${available || 'none'}`,
      purchasePending: "Purchase Pending",
      purchasePendingDesc: "Your purchase is being processed. Please wait for confirmation.",
      purchaseStatusUnknown: "Purchase Status Unknown",
      purchaseStatusUnknownDesc: (state: string) => `Purchase state: ${state || 'unknown'}. Please check your purchase history.`,
      purchaseCancelled: "Purchase Cancelled",
      purchaseCancelledDesc: "Purchase was cancelled. No charges were made.",
      productNotAvailableForPurchase: "Product Not Available",
      productNotAvailableForPurchaseDesc: "This product is not available for purchase. Please check Google Play Console configuration or try again later.",
      purchaseNotCompleted: "Purchase Not Completed",
      purchaseNotCompletedDesc: "The purchase was not completed. If you were charged, the transaction will be processed shortly.",
      purchaseFailed: "Purchase Failed",
      purchaseFailedDesc: (error: string) => error || "An error occurred during purchase. Please try again.",
      purchasesRestored: "Purchases Restored",
      purchasesRestoredDesc: "Your previous purchases have been restored.",
      restoreFailed: "Restore Failed",
      restoreFailedDesc: "Failed to restore purchases.",
      contactSupport: "Please contact support with this information.",
      transactionId: "Transaction ID",
    },
    
    // Common Toast Messages
    toast: {
      error: "Error",
      success: "Success",
      failedToRenameMindMap: "Failed to rename mind map",
      failedToDeleteMindMap: "Failed to delete mind map",
      failedToDeleteDeck: "Failed to delete deck",
      deckCreatedSuccessfully: "Deck created successfully",
      failedToCreateDeck: "Failed to create deck",
      tooManyWords: "Too many words",
      tooManyWordsDesc: "Maximum 10 words per batch. Please remove some words.",
      generationFailed: "Generation failed",
      failedToGenerateExamples: "Failed to generate example sentences. Please check your connection and try again.",
      failedToGenerateSynonyms: "Failed to generate synonyms. Please check your connection and try again.",
    },
  },
  zh: {
    appName: "Wevro",
    tagline: "AI 驅動的心智圖詞彙學習",
    
    // Mind map
    enterWord: "輸入單字...",
    startLearning: "開始學習",
    categories: {
      derivatives: "衍生詞",
      synonyms: "同義詞",
      antonyms: "反義詞",
      collocations: "搭配詞",
      idioms: "慣用語",
      root: "字根",
      prefix: "字首",
      suffix: "字尾",
      "topic-related": "相關主題",
    },
    
    // Actions
    save: "儲存",
    load: "載入",
    clear: "清除",
    newMap: "新建心智圖",
    createFlashcards: "製作字卡",
    backToMap: "返回心智圖",
    practice: "練習",
    
    // Flashcards
    flashcards: "字卡",
    swipeMode: "滑動模式",
    spellingMode: "拼字模式",
    swipeLeft: "不知道",
    swipeRight: "我知道",
    flip: "點擊翻轉",
    typeWord: "輸入單字...",
    submit: "提交",
    next: "下一個",
    finish: "完成",
    
    // Stats
    progress: "進度",
    known: "已知",
    unknown: "未知",
    
    // Messages
    generating: "生成中...",
    generatingHint: "這可能會需要幾秒鐘時間。",
    loading: "載入中...",
    noCards: "尚未建立字卡。請先建立心智圖！",
    emptyMap: "請在上方輸入單字開始。",
    
    // IAP / Purchase Messages
    iap: {
      billingNotSupported: "付費功能不支援",
      billingNotSupportedDesc: "此裝置或模擬器不支援應用程式內購買。請使用真實裝置或 Google Play 測試環境。",
      initializationFailed: "IAP 初始化失敗",
      initializationFailedDesc: "無法初始化應用程式內購買。請檢查您的裝置並重試。",
      verificationError: "驗證錯誤",
      cannotDetermineProductId: "無法從購買中確定產品 ID。請聯繫客服並提供交易 ID。",
      productIdMissing: "產品 ID 缺失。請聯繫客服並提供交易 ID。",
      purchaseError: "購買錯誤",
      invalidProductIdentifier: "檢測到無效的產品識別碼。無法驗證購買。",
      purchaseSuccessful: "購買成功",
      purchaseSuccessfulDesc: (tokens: number) => tokens > 0 
        ? `您的購買已處理。已新增 ${tokens} 點數。`
        : "您的購買已處理。請檢查您的餘額。",
      verificationFailed: "驗證失敗",
      networkError: "驗證過程中發生網路錯誤。請檢查您的連線並重試。",
      invalidProductId: "無效的產品 ID。請重試或聯繫客服。",
      storeNotAvailable: "商店不可用",
      storeNotAvailableDesc: "應用程式內購買僅在行動裝置上可用。",
      productNotFound: "找不到產品",
      productNotFoundDesc: (productId: string) => `找不到產品：${productId}。請檢查 Google Play Console 設定。`,
      productNotAvailable: "產品不可用",
      productNotAvailableDesc: (productId: string, available: string) => `產品 ${productId} 不可用。可用產品：${available || '無'}`,
      purchasePending: "購買處理中",
      purchasePendingDesc: "您的購買正在處理中。請等待確認。",
      purchaseStatusUnknown: "購買狀態未知",
      purchaseStatusUnknownDesc: (state: string) => `購買狀態：${state || '未知'}。請檢查您的購買記錄。`,
      purchaseCancelled: "購買已取消",
      purchaseCancelledDesc: "購買已取消。未收取任何費用。",
      productNotAvailableForPurchase: "產品不可購買",
      productNotAvailableForPurchaseDesc: "此產品目前無法購買。請檢查 Google Play Console 設定或稍後再試。",
      purchaseNotCompleted: "購買未完成",
      purchaseNotCompletedDesc: "購買未完成。如果您已被扣款，交易將在稍後處理。",
      purchaseFailed: "購買失敗",
      purchaseFailedDesc: (error: string) => error || "購買過程中發生錯誤。請重試。",
      purchasesRestored: "購買已恢復",
      purchasesRestoredDesc: "您之前的購買已恢復。",
      restoreFailed: "恢復失敗",
      restoreFailedDesc: "無法恢復購買。",
      contactSupport: "請聯繫客服並提供此資訊。",
      transactionId: "交易 ID",
    },
    
    // Common Toast Messages
    toast: {
      error: "錯誤",
      success: "成功",
      failedToRenameMindMap: "重新命名心智圖失敗",
      failedToDeleteMindMap: "刪除心智圖失敗",
      failedToDeleteDeck: "刪除字卡組失敗",
      deckCreatedSuccessfully: "字卡組建立成功",
      failedToCreateDeck: "建立字卡組失敗",
      tooManyWords: "單字過多",
      tooManyWordsDesc: "每次最多 10 個單字，請減少單字數量。",
      generationFailed: "生成失敗",
      failedToGenerateExamples: "無法生成例句，請檢查網路連線後重試",
      failedToGenerateSynonyms: "無法生成同義字，請檢查網路連線後重試",
    },
  },
};

export function useTranslation(lang: Language) {
  return translations[lang];
}
