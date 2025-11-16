/**
 * Mind Map History Hook
 * 
 * 管理心智圖的歷史記錄，提供 Undo/Redo 功能
 */

import { useState, useCallback } from "react";
import { type MindMapNode } from "@shared/schema";

export function useMindMapHistory(initialNodes: MindMapNode[] = []) {
  const [history, setHistory] = useState<MindMapNode[][]>([[...initialNodes]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  /**
   * 更新節點並記錄到歷史
   */
  const updateNodesWithHistory = useCallback((
    updater: (prev: MindMapNode[]) => MindMapNode[]
  ): MindMapNode[] => {
    let newNodes: MindMapNode[] = [];
    
    setHistory((prevHistory) => {
      const currentNodes = prevHistory[historyIndex];
      newNodes = updater(currentNodes);
      
      // 移除所有 redo 的歷史，加入新狀態
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      return [...newHistory, newNodes];
    });
    
    setHistoryIndex((prev) => prev + 1);
    return newNodes;
  }, [historyIndex]);

  /**
   * 直接設置節點（不記錄歷史）
   */
  const setNodesDirectly = useCallback((newNodes: MindMapNode[]) => {
    setHistory((prevHistory) => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      return [...newHistory, newNodes];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  /**
   * 撤銷操作
   */
  const undo = useCallback((): MindMapNode[] => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      return history[historyIndex - 1];
    }
    return history[historyIndex];
  }, [history, historyIndex]);

  /**
   * 重做操作
   */
  const redo = useCallback((): MindMapNode[] => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      return history[historyIndex + 1];
    }
    return history[historyIndex];
  }, [history, historyIndex]);

  /**
   * 重置歷史記錄
   */
  const resetHistory = useCallback((nodes: MindMapNode[]) => {
    console.log("[useMindMapHistory] resetHistory called with nodes:", nodes.length);
    // 使用函數式更新確保狀態正確設置
    setHistory(() => [[...nodes]]);
    setHistoryIndex(() => 0);
    console.log("[useMindMapHistory] resetHistory completed, new history length:", 1);
  }, []);

  /**
   * 清空歷史（保留當前狀態）
   */
  const clearHistory = useCallback(() => {
    const currentNodes = history[historyIndex];
    setHistory([currentNodes]);
    setHistoryIndex(0);
  }, [history, historyIndex]);

  return {
    // 狀態
    currentNodes: history[historyIndex],
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    historyLength: history.length,
    historyIndex,
    
    // 操作
    updateNodesWithHistory,
    setNodesDirectly,
    undo,
    redo,
    resetHistory,
    clearHistory,
  };
}



