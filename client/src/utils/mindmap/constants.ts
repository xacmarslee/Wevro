/**
 * Mind Map Configuration Constants
 * 
 * 集中管理心智圖相關的所有常數配置，便於調整和維護
 */

import { type WordCategory } from "@shared/schema";

// 節點佈局配置
export const NODE_LAYOUT = {
  BASE_DISTANCE: 250,        // 第一個節點距離中心的基礎距離（px）
  BOUNDARY_GAP: 80,          // 節點之間的邊界間隔（px）
  CHAR_WIDTH: 12,            // 每個字元的寬度估算（px）
  PADDING: 32,               // 節點內邊距（px-4 = 16px * 2）
  MIN_WIDTH: 100,            // 節點最小寬度（px）
} as const;

// 節點數量限制
export const LIMITS = {
  MAX_TOTAL_NODES: 60,           // 心智圖最多允許的節點總數
  MAX_NODES_PER_GENERATION: 7,   // AI 單次生成的最大節點數
} as const;

// PNG 匯出配置
export const EXPORT = {
  PADDING: 100,              // 匯出圖片的邊距（px）
  SCALE: 2,                  // 匯出圖片的解析度倍數（2x = Retina）
  NODE_WIDTH_APPROX: 120,    // 匯出時節點寬度估算（px）
  NODE_HEIGHT_APPROX: 60,    // 匯出時節點高度估算（px）
} as const;

// 單字類別列表（用於角度計算）
export const WORD_CATEGORIES: readonly WordCategory[] = [
  "derivatives",
  "synonyms",
  "antonyms",
  "collocations",
  "idioms",
  "root",
  "prefix",
  "suffix",
  "topic-related",
] as const;








