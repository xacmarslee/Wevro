/**
 * Mind Map Persistence Hook
 * 
 * 處理心智圖的載入、儲存、建立字卡等功能
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type MindMapNode, type MindMap, type FlashcardDeck } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithAuth } from "@/lib/queryClient";
import { trackMindMapCreated } from "@/lib/analytics";

export function useMindMapPersistence(mindMapId?: string) {
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();
  const { authReady, isAuthenticated } = useAuth();

  /**
   * 載入現有心智圖
   */
  const { data: existingMindMap, isLoading } = useQuery({
    queryKey: ["/api/mindmaps", mindMapId],
    queryFn: async () => {
      if (!mindMapId) return null;

      console.log("[MindMap] Loading mind map:", mindMapId);
      const data = await fetchJsonWithAuth<MindMap>(`/api/mindmaps/${mindMapId}`);
      console.log("[MindMap] Mind map loaded:", data);
      return data;
    },
    enabled: !!mindMapId && isAuthenticated && authReady,
  });

  /**
   * 儲存心智圖 mutation
   */
  const saveMutation = useMutation({
    mutationFn: async ({ nodes, silent = false }: { nodes: MindMapNode[], silent?: boolean }) => {
      const centerNode = nodes.find(n => n.isCenter);
      const name = centerNode ? centerNode.word : "Untitled Mind Map";
      
      console.log("[MindMap] Saving mind map:", { mindMapId, name, nodeCount: nodes.length, silent });

      if (mindMapId) {
        // 更新現有心智圖
        const response = await apiRequest("PATCH", `/api/mindmaps/${mindMapId}`, {
          name,
          nodes,
        });
        const data = await response.json();
        console.log("[MindMap] Updated successfully:", data);
        return { data, silent };
      } else {
        // 建立新心智圖
        const response = await apiRequest("POST", "/api/mindmaps", {
          name,
          nodes,
        });
        const data = await response.json();
        console.log("[MindMap] Created successfully:", data);
        
        // Track Analytics event (only for new mind maps)
        trackMindMapCreated();
        
        return { data, silent };
      }
    },
    onSuccess: ({ data, silent }) => {
      if (!data) {
        return;
      }

      setIsSaved(true);

      if (data.id) {
        queryClient.setQueryData<MindMap[]>(["/api/mindmaps"], (previous = []) => {
          const index = previous.findIndex((map) => map.id === data.id);
          if (index === -1) {
            return [data, ...previous];
          }
          const updated = [...previous];
          updated[index] = data;
          return updated;
        });

        queryClient.setQueryData(["/api/mindmaps", data.id], data);
      }

      if (!silent) {
        setShowSaveConfirmDialog(true);
      } else {
        // Silent save still shows a small toast to confirm it happened? 
        // Or maybe strictly silent. Let's do strictly silent for auto-save to avoid spam.
        // But maybe a small "Saved" indicator in UI is better. 
        // For now, just strictly silent or maybe a non-intrusive toast?
        // User said "Auto save (avoid data loss)", usually implies background save.
        // I'll add a small toast for feedback.
        toast({
           title: language === "en" ? "Auto-saved" : "已自動儲存",
           duration: 1500,
        });
      }
    },
    onError: (error: Error) => {
      console.error("[MindMap] Save failed:", error);
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
  const FLASHCARDS_CREATING_KEY = ["/api/flashcards", "creating"] as const;

  const createFlashcardsMutation = useMutation<FlashcardDeck, Error, MindMapNode[]>({
    mutationFn: async (nodes: MindMapNode[]) => {
      const centerNode = nodes.find(n => n.isCenter);
      const deckName = centerNode 
        ? `${centerNode.word} - Mind Map` 
        : "Mind Map Flashcards";
      
      // 取得所有非中心節點的單字（去重）
      const words = nodes
        .filter(n => n.word)
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
      
      return await response.json() as FlashcardDeck;
    },
    onMutate: () => {
      queryClient.setQueryData(FLASHCARDS_CREATING_KEY, true);
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      if (data?.tokenInfo) {
        await queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
        toast({
          title: language === "en" ? "Tokens deducted" : "點數已扣除",
          description:
            language === "en"
              ? `Used ${data.tokenInfo.tokensCharged} token${data.tokenInfo.tokensCharged > 1 ? "s" : ""}.`
              : `已扣除 ${data.tokenInfo.tokensCharged} 點。`,
        });
      } else {
        toast({
          title: language === "en" ? "Flashcards created" : "字卡建立成功",
        });
      }
      queryClient.setQueryData(FLASHCARDS_CREATING_KEY, false);
      setShowSaveConfirmDialog(false);
    },
    onError: (error: Error) => {
      queryClient.setQueryData(FLASHCARDS_CREATING_KEY, false);
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
  const save = (nodes: MindMapNode[], silent: boolean = false) => {
    if (nodes.length === 0) return;
    saveMutation.mutate({ nodes, silent });
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
    setIsCreatingFlashcards: createFlashcardsMutation.reset,
    
    // 對話框狀態
    showSaveConfirmDialog,
    setShowSaveConfirmDialog,
    
    // 操作
    save,
    createFlashcards,
  };
}

