/**
 * Mind Map Generation Hook
 * 
 * 整合 AI 生成功能，處理單字生成請求、loading 狀態、節點位置計算
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type MindMapNode, type WordCategory } from "@shared/schema";
import { calculateBatchNodePositions } from "@/utils/mindmap/nodeLayout";
import { LIMITS } from "@/utils/mindmap/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";

export function useMindMapGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslation(language);

  /**
   * AI 生成單字的 mutation
   */
  const generateWordsMutation = useMutation({
    mutationFn: async ({ word, category, existingWords = [] }: { 
      word: string; 
      category: WordCategory; 
      existingWords?: string[];
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/generate-words",
        { word, category, existingWords }
      );
      const data = await response.json();
      return data as {
        words: string[];
        tokenInfo?: {
          tokenBalance: number;
          usedMindmapExpansions: number;
          tokensCharged: number;
        };
      };
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      if (data?.tokenInfo) {
        queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
      }
    },
    onError: (error: unknown) => {
      setIsGenerating(false);

      const defaultMessage =
        language === "en"
          ? "Failed to generate words. Please try again."
          : "生成單字失敗，請重試。";

      let description = defaultMessage;

      if (error instanceof Error && error.message.startsWith("402")) {
        const fallback =
          language === "en"
            ? "Not enough tokens. Each mind map expansion costs 0.5 token (billed every two expansions). Please top up on the pricing page."
            : "點數不足。心智圖每次成功展開扣 0.5 點（累積兩次扣 1 點）。請前往計費頁面儲值。";
        const payload = error.message.split(":").slice(1).join(":").trim();
        try {
          const parsed = JSON.parse(payload);
          description = parsed?.message ?? fallback;
        } catch {
          description = fallback;
        }
      }

      toast({
        title: language === "en" ? "Error" : "錯誤",
        description,
        variant: "destructive",
      });
    },
  });

  /**
   * 生成並添加新節點
   */
  const generateNodes = async (
    centerNode: MindMapNode,
    category: WordCategory,
    currentNodes: MindMapNode[]
  ): Promise<MindMapNode[]> => {
    // 檢查節點上限
    if (currentNodes.length >= LIMITS.MAX_TOTAL_NODES) {
      toast({
        title: language === "en" ? "Node limit reached" : "已達節點上限",
        description: language === "en" 
          ? `Maximum ${LIMITS.MAX_TOTAL_NODES} nodes allowed. Please delete some nodes to continue.`
          : `已達 ${LIMITS.MAX_TOTAL_NODES} 個節點上限。請刪除一些節點後繼續。`,
        variant: "destructive",
      });
      return currentNodes;
    }

    setIsGenerating(true);
    
    try {
      // 呼叫後端 API 生成單字
      const existingWords = currentNodes
        .filter(
          (node) =>
            node.parentId === centerNode.id && node.category === category
        )
        .map((node) => node.word);

      const result = await generateWordsMutation.mutateAsync({
        word: centerNode.word,
        category,
        existingWords,
      });

      // 檢查回傳結果
      if (!result || !result.words || !Array.isArray(result.words)) {
        console.error("Invalid response format:", result);
        toast({
          title: language === "en" ? "Error" : "錯誤",
          description: language === "en"
            ? "Invalid response from server"
            : "伺服器回應格式錯誤",
          variant: "destructive",
        });
        return currentNodes;
      }

      if (result.words.length === 0) {
        console.warn("No words generated for category:", category);
        toast({
          title: language === "en" ? "All words added" : "已無更多單字",
          description: language === "en"
            ? `No additional ${category} words are available.`
            : `沒有更多${t.categories[category]}可加入。`,
          variant: "default",
        });
        return currentNodes;
      }

      // 使用工具函數批次計算所有新節點的位置
      const positions = calculateBatchNodePositions({
        parentNode: centerNode,
        category,
        words: result.words,
      });

      // 建立新節點陣列
      const newNodes: MindMapNode[] = positions.map(({ word, x, y }) => ({
        id: crypto.randomUUID(),
        word,
        x,
        y,
        parentId: centerNode.id,
        category,
        isCenter: false,
      }));

      return [...currentNodes, ...newNodes];
      
    } catch (error) {
      console.error("Error generating nodes:", error);
      return currentNodes;
    }
  };

  return {
    isGenerating,
    generateNodes,
  };
}


