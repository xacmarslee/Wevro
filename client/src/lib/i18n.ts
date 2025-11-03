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
    loading: "Loading...",
    noCards: "No flashcards yet. Create a mind map first!",
    emptyMap: "Start by entering a word above.",
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
    loading: "載入中...",
    noCards: "尚未建立字卡。請先建立心智圖！",
    emptyMap: "請在上方輸入單字開始。",
  },
};

export function useTranslation(lang: Language) {
  return translations[lang];
}
