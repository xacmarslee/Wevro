/**
 * Mind Map Nodes Hook
 * 
 * 處理節點的新增、刪除、點擊等操作
 */

import { useState } from "react";
import { type MindMapNode, type WordCategory } from "@shared/schema";
import { calculateNodePosition, recalculateNodePositions } from "@/utils/mindmap/nodeLayout";
import { LIMITS } from "@/utils/mindmap/constants";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export function useMindMapNodes() {
  const { toast } = useToast();
  const { language } = useLanguage();
  
  // 新增節點對話框狀態
  const [addNodeDialog, setAddNodeDialog] = useState<{
    open: boolean;
    parentNodeId: string | null;
    category: WordCategory | null;
  }>({ open: false, parentNodeId: null, category: null });
  const [newNodeWord, setNewNodeWord] = useState("");
  
  // 刪除節點對話框狀態
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);

  /**
   * 打開新增節點對話框
   */
  const openAddDialog = (parentNodeId: string, category: WordCategory) => {
    setAddNodeDialog({ open: true, parentNodeId, category });
    setNewNodeWord("");
  };

  /**
   * 關閉新增節點對話框
   */
  const closeAddDialog = () => {
    setAddNodeDialog({ open: false, parentNodeId: null, category: null });
    setNewNodeWord("");
  };

  /**
   * 新增節點
   */
  const addNode = (
    nodes: MindMapNode[],
    word: string,
    parentNodeId: string,
    category: WordCategory
  ): { newNodes: MindMapNode[]; newNodeId: string | null } => {
    const parentNode = nodes.find(n => n.id === parentNodeId);
    if (!parentNode) {
      return { newNodes: nodes, newNodeId: null };
    }

    // 檢查節點數量上限
    if (nodes.length >= LIMITS.MAX_TOTAL_NODES) {
      toast({
        title: language === "en" ? "Node limit reached" : "已達節點上限",
        description: language === "en" 
          ? `Maximum ${LIMITS.MAX_TOTAL_NODES} nodes allowed. Please delete some nodes to continue.`
          : `已達 ${LIMITS.MAX_TOTAL_NODES} 個節點上限。請刪除一些節點後繼續。`,
        variant: "destructive",
      });
      return { newNodes: nodes, newNodeId: null };
    }

    // 檢查重複單字
    const isDuplicate = nodes.some(
      n => n.category === category && 
           n.parentId === parentNodeId && 
           n.word.toLowerCase() === word.toLowerCase()
    );
    
    if (isDuplicate) {
      toast({
        title: language === "en" ? "Word already exists" : "單字已存在",
        description: language === "en" 
          ? "This word is already in this category."
          : "此單字已在這個類別中。",
        variant: "destructive",
      });
      return { newNodes: nodes, newNodeId: null };
    }

    // 取得同類別的現有節點
    const existingNodesInCategory = nodes.filter(
      n => n.category === category && n.parentId === parentNodeId
    );
    
    // 計算新節點位置
    const position = calculateNodePosition({
      parentNode,
      category,
      existingNodesInCategory,
      newWord: word,
    });

    // 建立新節點
    const newNodeId = crypto.randomUUID();
    const newNode: MindMapNode = {
      id: newNodeId,
      word: word.trim(),
      x: position.x,
      y: position.y,
      parentId: parentNodeId,
      category: category,
      isCenter: false,
    };

    return { 
      newNodes: [...nodes, newNode],
      newNodeId 
    };
  };

  /**
   * 打開刪除確認對話框
   */
  const openDeleteDialog = (nodeId: string) => {
    setDeletingNodeId(nodeId);
  };

  /**
   * 關閉刪除確認對話框
   */
  const closeDeleteDialog = () => {
    setDeletingNodeId(null);
  };

  /**
   * 刪除節點並重新排列同類別的其他節點
   */
  const deleteNode = (nodes: MindMapNode[], nodeId: string): MindMapNode[] => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    
    // 不能刪除中心節點
    if (!nodeToDelete || nodeToDelete.isCenter) {
      return nodes;
    }
    
    // 取得同類別的所有節點
    const sameCategory = nodes.filter(
      n => n.category === nodeToDelete.category && 
           n.parentId === nodeToDelete.parentId
    );
    
    // 先移除該節點
    const nodesAfterDelete = nodes.filter(n => n.id !== nodeId);
    
    // 如果這個類別還有其他節點，需要重新排列
    if (sameCategory.length > 1 && nodeToDelete.category && nodeToDelete.parentId) {
      const parentNode = nodes.find(n => n.id === nodeToDelete.parentId);
      if (!parentNode) return nodesAfterDelete;
      
      // 重新計算同類別節點的位置
      return recalculateNodePositions({
        nodes: nodesAfterDelete,
        category: nodeToDelete.category,
        parentNode,
      });
    }
    
    return nodesAfterDelete;
  };

  return {
    // 新增節點相關狀態
    addNodeDialog,
    newNodeWord,
    setNewNodeWord,
    
    // 刪除節點相關狀態
    deletingNodeId,
    
    // 操作函數
    openAddDialog,
    closeAddDialog,
    addNode,
    openDeleteDialog,
    closeDeleteDialog,
    deleteNode,
  };
}

