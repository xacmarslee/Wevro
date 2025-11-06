/**
 * Mind Map Node Layout Utilities
 * 
 * 節點位置計算、寬度估算、角度計算等工具函數
 */

import { type MindMapNode, type WordCategory } from "@shared/schema";
import { NODE_LAYOUT, WORD_CATEGORIES } from "./constants";

/**
 * 計算類別在圓周上的角度（放射狀排列）
 * @param category 單字類別
 * @returns 角度（弧度）
 */
export function getCategoryAngle(category: WordCategory): number {
  const index = WORD_CATEGORIES.indexOf(category);
  return (index * 2 * Math.PI) / WORD_CATEGORIES.length;
}

/**
 * 估算節點寬度（根據文字長度）
 * @param text 節點文字內容
 * @returns 估算的寬度（px）
 */
export function estimateNodeWidth(text: string): number {
  const { CHAR_WIDTH, PADDING, MIN_WIDTH } = NODE_LAYOUT;
  return Math.max(MIN_WIDTH, text.length * CHAR_WIDTH + PADDING);
}

/**
 * 計算兩個節點之間的距離
 * @param node1 第一個節點
 * @param node2 第二個節點
 * @returns 距離（px）
 */
export function calculateDistance(node1: MindMapNode, node2: MindMapNode): number {
  return Math.sqrt(
    Math.pow(node1.x - node2.x, 2) + 
    Math.pow(node1.y - node2.y, 2)
  );
}

/**
 * 找出節點陣列中距離中心最遠的節點
 * @param nodes 節點陣列
 * @param centerNode 中心節點
 * @returns 最遠的節點
 */
export function findFurthestNode(
  nodes: MindMapNode[], 
  centerNode: MindMapNode
): MindMapNode {
  return nodes.reduce((furthest, node) => {
    const dist = calculateDistance(node, centerNode);
    const furthestDist = calculateDistance(furthest, centerNode);
    return dist > furthestDist ? node : furthest;
  });
}

/**
 * 計算新節點的位置
 * @param params 計算參數
 * @returns 新節點的座標和距離
 */
export function calculateNodePosition(params: {
  parentNode: MindMapNode;
  category: WordCategory;
  existingNodesInCategory: MindMapNode[];
  newWord: string;
}): { x: number; y: number; distance: number } {
  const { parentNode, category, existingNodesInCategory, newWord } = params;
  const { BASE_DISTANCE, BOUNDARY_GAP } = NODE_LAYOUT;
  
  const angle = getCategoryAngle(category);
  let distance: number;
  
  if (existingNodesInCategory.length === 0) {
    // 如果這個類別還沒有節點，使用基礎距離
    distance = BASE_DISTANCE;
  } else {
    // 找到最遠的節點，新節點接在後面
    const furthestNode = findFurthestNode(existingNodesInCategory, parentNode);
    const furthestDistance = calculateDistance(furthestNode, parentNode);
    const furthestWidth = estimateNodeWidth(furthestNode.word);
    const newWidth = estimateNodeWidth(newWord);
    
    // 距離 = 最遠節點距離 + 最遠節點寬度的一半 + 間隔 + 新節點寬度的一半
    distance = furthestDistance + furthestWidth / 2 + BOUNDARY_GAP + newWidth / 2;
  }
  
  return {
    x: parentNode.x + distance * Math.cos(angle),
    y: parentNode.y + distance * Math.sin(angle),
    distance,
  };
}

/**
 * 批次計算多個新節點的位置（用於 AI 生成）
 * @param params 計算參數
 * @returns 帶有位置的節點陣列
 */
export function calculateBatchNodePositions(params: {
  parentNode: MindMapNode;
  category: WordCategory;
  words: string[];
}): Array<{ word: string; x: number; y: number }> {
  const { parentNode, category, words } = params;
  const { BASE_DISTANCE, BOUNDARY_GAP } = NODE_LAYOUT;
  
  const angle = getCategoryAngle(category);
  let currentDistance = BASE_DISTANCE;
  
  return words.map((word, index) => {
    const nodeWidth = estimateNodeWidth(word);
    
    const position = {
      word,
      x: parentNode.x + currentDistance * Math.cos(angle),
      y: parentNode.y + currentDistance * Math.sin(angle),
    };
    
    // 計算下一個節點的距離
    if (index < words.length - 1) {
      const nextWord = words[index + 1];
      const nextNodeWidth = estimateNodeWidth(nextWord);
      currentDistance += nodeWidth / 2 + BOUNDARY_GAP + nextNodeWidth / 2;
    }
    
    return position;
  });
}

/**
 * 重新計算同類別節點的位置（用於刪除節點後重新排列）
 * @param params 計算參數
 * @returns 更新位置後的節點陣列
 */
export function recalculateNodePositions(params: {
  nodes: MindMapNode[];
  category: WordCategory;
  parentNode: MindMapNode;
}): MindMapNode[] {
  const { nodes, category, parentNode } = params;
  const { BASE_DISTANCE, BOUNDARY_GAP } = NODE_LAYOUT;
  
  // 找出同類別的節點並按距離排序
  const categoryNodes = nodes
    .filter(n => n.category === category && n.parentId === parentNode.id)
    .sort((a, b) => {
      const distA = calculateDistance(a, parentNode);
      const distB = calculateDistance(b, parentNode);
      return distA - distB;
    });
  
  if (categoryNodes.length === 0) return nodes;
  
  const angle = getCategoryAngle(category);
  let currentDistance = BASE_DISTANCE;
  
  // 重新計算每個節點的位置
  const updatedPositions = new Map<string, { x: number; y: number }>();
  
  categoryNodes.forEach((node, index) => {
    const nodeWidth = estimateNodeWidth(node.word);
    
    updatedPositions.set(node.id, {
      x: parentNode.x + currentDistance * Math.cos(angle),
      y: parentNode.y + currentDistance * Math.sin(angle),
    });
    
    if (index < categoryNodes.length - 1) {
      const nextNode = categoryNodes[index + 1];
      const nextNodeWidth = estimateNodeWidth(nextNode.word);
      currentDistance += nodeWidth / 2 + BOUNDARY_GAP + nextNodeWidth / 2;
    }
  });
  
  // 更新所有節點的位置
  return nodes.map(node => {
    const newPosition = updatedPositions.get(node.id);
    if (newPosition) {
      return { ...node, ...newPosition };
    }
    return node;
  });
}

