/**
 * Mind Map Persistence Hook
 * 
 * 處理心智圖的載入、儲存、建立字卡等功能
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type MindMapNode } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export function useMindMapPersistence(mindMapId?: string) {
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  /**
   * 載入現有心智圖
   */
  const { data: existingMindMap, isLoading } = useQuery({
    queryKey: ["/api/mindmaps", mindMapId],
    queryFn: async () => {
      if (!mindMapId) return null;
      const response = await fetch(`/api/mindmaps/${mindMapId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load mind map");
      }
      return await response.json();
    },
    enabled: !!mindMapId,
  });

  /**
   * 儲存心智圖 mutation
   */
  const saveMutation = useMutation({
    mutationFn: async (nodes: MindMapNode[]) => {
      const centerNode = nodes.find(n => n.isCenter);
      const name = centerNode ? centerNode.word : "Untitled Mind Map";
      
      if (mindMapId) {
        // 更新現有心智圖
        const response = await apiRequest("PATCH", `/api/mindmaps/${mindMapId}`, {
          name,
          nodes,
        });
        return await response.json();
      } else {
        // 建立新心智圖
        const response = await apiRequest("POST", "/api/mindmaps", {
          name,
          nodes,
        });
        return await response.json();
      }
    },
    onSuccess: () => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ["/api/mindmaps"] });
      setShowSaveConfirmDialog(true);
    },
    onError: () => {
      toast({
        title: language === "en" ? "Save failed" : "儲存失敗",
        description: language === "en" ? "Failed to save mind map" : "儲存心智圖失敗",
        variant: "destructive",
      });
    },
  });

  /**
   * 建立字卡 mutation
   */
  const createFlashcardsMutation = useMutation({
    mutationFn: async (nodes: MindMapNode[]) => {
      const centerNode = nodes.find(n => n.isCenter);
      const deckName = centerNode 
        ? `${centerNode.word} - Mind Map` 
        : "Mind Map Flashcards";
      
      // 取得所有非中心節點的單字（去重）
      const words = nodes
        .filter(n => !n.isCenter && n.word)
        .map(n => n.word.trim())
        .filter((word, index, self) => self.indexOf(word) === index);
      
      if (words.length === 0) {
        throw new Error(
          language === "en" 
            ? "No words to create flashcards" 
            : "沒有單字可以建立字卡"
        );
      }
      
      const response = await apiRequest("POST", "/api/flashcards/batch-create", { 
        name: deckName, 
        words 
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: "Failed to create deck" 
        }));
        throw new Error(errorData.message || "Failed to create deck");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      setShowSaveConfirmDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: language === "en" ? "Error" : "錯誤",
        description: error.message || (
          language === "en" 
            ? "Failed to create flashcards" 
            : "建立字卡失敗"
        ),
        variant: "destructive",
        duration: 5000,
      });
      setShowSaveConfirmDialog(false);
    },
  });

  /**
   * 儲存心智圖
   */
  const save = (nodes: MindMapNode[]) => {
    if (nodes.length === 0) return;
    saveMutation.mutate(nodes);
  };

  /**
   * 建立字卡
   */
  const createFlashcards = (nodes: MindMapNode[]) => {
    createFlashcardsMutation.mutate(nodes);
  };

  return {
    // 載入狀態
    existingMindMap,
    isLoading,
    
    // 儲存狀態
    isSaved,
    setIsSaved,
    isSaving: saveMutation.isPending,
    
    // 字卡建立狀態
    isCreatingFlashcards: createFlashcardsMutation.isPending,
    
    // 對話框狀態
    showSaveConfirmDialog,
    setShowSaveConfirmDialog,
    
    // 操作
    save,
    createFlashcards,
  };
}

