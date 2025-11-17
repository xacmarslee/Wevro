/**
 * Firebase Analytics 事件追蹤
 * 
 * 用於追蹤應用程式的使用者行為和功能使用情況
 */

import { analytics } from './firebase';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';

/**
 * 安全地記錄事件（如果 Analytics 可用）
 */
function safeLogEvent(eventName: string, params?: Record<string, any>) {
  if (!analytics) {
    // Analytics 未初始化時不記錄（開發環境或不支援的環境）
    if (import.meta.env.DEV) {
      console.log('[Analytics] Event (not tracked):', eventName, params);
    }
    return;
  }

  try {
    logEvent(analytics, eventName, params);
    if (import.meta.env.DEV) {
      console.log('[Analytics] Event tracked:', eventName, params);
    }
  } catch (error) {
    console.warn('[Analytics] Failed to log event:', error);
  }
}

/**
 * 設定使用者 ID（當使用者登入時）
 */
export function setAnalyticsUserId(userId: string | null) {
  if (!analytics || !userId) return;
  
  try {
    setUserId(analytics, userId);
    if (import.meta.env.DEV) {
      console.log('[Analytics] User ID set:', userId);
    }
  } catch (error) {
    console.warn('[Analytics] Failed to set user ID:', error);
  }
}

/**
 * 設定使用者屬性
 */
export function setAnalyticsUserProperties(properties: { plan?: string; language?: string }) {
  if (!analytics) return;
  
  try {
    setUserProperties(analytics, properties);
    if (import.meta.env.DEV) {
      console.log('[Analytics] User properties set:', properties);
    }
  } catch (error) {
    console.warn('[Analytics] Failed to set user properties:', error);
  }
}

// ============================================
// 事件定義
// ============================================

/**
 * 使用者註冊
 */
export function trackSignUp(method: 'email' | 'google') {
  safeLogEvent('sign_up', {
    method,
  });
}

/**
 * 使用者登入
 */
export function trackLogin(method: 'email' | 'google') {
  safeLogEvent('login', {
    method,
  });
}

/**
 * 例句生成
 */
export function trackExampleGeneration(query: string, resultCount: { senses?: number; idioms?: number; collocations?: number }) {
  safeLogEvent('generate_example_sentences', {
    query: query.toLowerCase(), // 只記錄小寫，保護隱私
    senses_count: resultCount.senses || 0,
    idioms_count: resultCount.idioms || 0,
    collocations_count: resultCount.collocations || 0,
  });
}

/**
 * 同義詞比較生成
 */
export function trackSynonymComparison(query: string, synonymCount: number) {
  safeLogEvent('generate_synonym_comparison', {
    query: query.toLowerCase(),
    synonym_count: synonymCount,
  });
}

/**
 * 字卡組建立
 */
export function trackFlashcardDeckCreated(deckName: string, cardCount: number, tokenCost: number) {
  safeLogEvent('create_flashcard_deck', {
    deck_name_length: deckName.length, // 只記錄長度，不記錄實際名稱
    card_count: cardCount,
    token_cost: tokenCost,
  });
}

/**
 * 心智圖擴展
 */
export function trackMindMapExpansion(category: string, wordCount: number, tokenCost: number) {
  safeLogEvent('expand_mindmap', {
    category,
    word_count: wordCount,
    token_cost: tokenCost,
  });
}

/**
 * 心智圖建立
 */
export function trackMindMapCreated() {
  safeLogEvent('create_mindmap');
}

/**
 * 頁面瀏覽
 */
export function trackPageView(pageName: string) {
  safeLogEvent('page_view', {
    page_name: pageName,
  });
}

/**
 * 查看定價頁面
 */
export function trackViewPricing() {
  safeLogEvent('view_pricing');
}

/**
 * 查看帳號設定
 */
export function trackViewAccount() {
  safeLogEvent('view_account');
}

/**
 * 字卡練習開始
 */
export function trackFlashcardPracticeStart(mode: 'flip' | 'spelling', cardCount: number) {
  safeLogEvent('start_flashcard_practice', {
    mode,
    card_count: cardCount,
  });
}

/**
 * 字卡練習完成
 */
export function trackFlashcardPracticeComplete(mode: 'flip' | 'spelling', cardCount: number, duration: number) {
  safeLogEvent('complete_flashcard_practice', {
    mode,
    card_count: cardCount,
    duration_seconds: Math.round(duration),
  });
}

