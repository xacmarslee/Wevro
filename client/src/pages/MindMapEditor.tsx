/**
 * Mind Map Editor Page
 * 
 * 心智圖編輯器主頁面 - 協調所有 hooks 和元件
 */

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { type MindMapNode, type WordCategory, type MindMap } from "@shared/schema";
import { CategoryButtons } from "@/components/CategoryButtons";
import { MindMapCanvas } from "@/components/MindMapCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { Loader2, Undo2, Redo2, Save, Download, Sparkles, Plus, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 導入重構後的 hooks
import { useMindMapHistory } from "@/hooks/mindmap/useMindMapHistory";
import { useMindMapNodes } from "@/hooks/mindmap/useMindMapNodes";
import { useMindMapGeneration } from "@/hooks/mindmap/useMindMapGeneration";
import { useMindMapPersistence } from "@/hooks/mindmap/useMindMapPersistence";
import { useMindMapExport } from "@/hooks/mindmap/useMindMapExport";
import { LIMITS } from "@/utils/mindmap/constants";
import TokenDisplay from "@/components/TokenDisplay";

export default function MindMapEditor() {
  // 路由參數
  const [, params] = useRoute("/mindmap/:id");
  const [, setLocation] = useLocation();
  const mindMapId = params?.id !== "new" ? params?.id : undefined;
  
  console.log("[MindMapEditor] Mounted/Updated:", {
    paramsId: params?.id,
    mindMapId,
    url: window.location.href,
  });
  
  // 語言和翻譯
  const { language } = useLanguage();
  const t = useTranslation(language);
  
  // 中心節點和聚焦節點
  const [centerNodeId, setCenterNodeId] = useState<string | undefined>();
  const [focusNodeId, setFocusNodeId] = useState<string | undefined>();
  const [initialWord, setInitialWord] = useState("");

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editNodeWord, setEditNodeWord] = useState("");

  // 使用重構後的 hooks
  const history = useMindMapHistory();
  const nodeOps = useMindMapNodes();
  const generation = useMindMapGeneration();
  const persistence = useMindMapPersistence(mindMapId);
  const exportPNG = useMindMapExport();
  const queryClient = useQueryClient();

  // Removed cachedMindMap usage because list API no longer returns nodes
  // const cachedMindMaps = queryClient.getQueryData<MindMap[]>(["/api/mindmaps"]) || [];
  // const cachedMindMap = mindMapId ? cachedMindMaps.find((map) => map.id === mindMapId) : undefined;

  const hydrationGuardRef = useRef(false);
  const hydratedFromCacheRef = useRef(false);

  const nodes = history.currentNodes ?? [];
  const hasNodes = nodes.length > 0;
  // 新心智圖不需要 hydration，所以初始值應該是 false（如果沒有 mindMapId）
  const [isHydrating, setIsHydrating] = useState(() => !!mindMapId);
  
  // 確保節點已正確設置（用於調試）
  console.log("[MindMapEditor] Current nodes from history:", {
    nodesCount: nodes.length,
    historyLength: history.historyLength,
    historyIndex: history.historyIndex,
    currentNodes: nodes.map(n => ({ id: n.id, word: n.word })),
  });

  // 調試日誌：節點和狀態
  useEffect(() => {
    console.log("[MindMapEditor] State update:", {
      mindMapId,
      nodesCount: nodes.length,
      hasNodes,
      isHydrating,
      centerNodeId,
      focusNodeId,
      initialWord,
      nodes: nodes.map(n => ({ id: n.id, word: n.word, isCenter: n.isCenter })),
    });
  }, [mindMapId, nodes.length, hasNodes, isHydrating, centerNodeId, focusNodeId, initialWord, nodes]);

  // 從 URL 參數獲取初始單字（建立新心智圖時）
  useEffect(() => {
    console.log("[MindMapEditor] URL param effect:", { mindMapId, url: window.location.href, nodesCount: nodes.length });
    if (mindMapId) {
      console.log("[MindMapEditor] Has mindMapId, skipping URL param handling");
      return;
    }

    // 如果已經有節點，不需要重新創建
    if (nodes.length > 0) {
      console.log("[MindMapEditor] Already has nodes, skipping URL param handling");
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const wordParam = urlParams.get("word")?.trim();
    console.log("[MindMapEditor] URL word param:", wordParam);

    if (wordParam) {
      console.log("[MindMapEditor] Creating new node from word param:", wordParam);
      setInitialWord(wordParam);
      const newNode: MindMapNode = {
        id: crypto.randomUUID(),
        word: wordParam,
        x: 0,
        y: 0,
        isCenter: true,
      };
      // 使用 setState 的回調形式確保狀態更新
      history.resetHistory([newNode]);
      setCenterNodeId(newNode.id);
      setFocusNodeId(newNode.id);
      setIsHydrating(false); // 新心智圖不需要 hydration，直接設置為 false
      console.log("[MindMapEditor] Node created, isHydrating set to false, nodes:", [newNode]);
      console.log("[MindMapEditor] After resetHistory, history.currentNodes:", history.currentNodes);
      window.dispatchEvent(new CustomEvent("mindmap-nodes-ready", { detail: { nodes: [newNode] } }));
      return;
    }

    console.log("[MindMapEditor] No word param, redirecting to /mindmaps");
    setLocation("/mindmaps");
  }, [mindMapId, setLocation, history.resetHistory, nodes.length]);
  
  // 載入現有心智圖
  useEffect(() => {
    console.log("[MindMapEditor] mindMapId changed:", { mindMapId, isNew: !mindMapId });
    if (!mindMapId) {
      // 新心智圖不需要 hydration
      setIsHydrating(false);
      return;
    }
    hydrationGuardRef.current = false;
    setIsHydrating(true);
  }, [mindMapId]);

  useEffect(() => {
    if (!mindMapId) {
      return;
    }
    if (persistence.isLoading) {
      return;
    }

    const sourceMindMap = persistence.existingMindMap;
    const isServerData = Boolean(persistence.existingMindMap);

    const shouldHydrate =
      !hydrationGuardRef.current ||
      (hydratedFromCacheRef.current && isServerData);

    if (!shouldHydrate) {
      setIsHydrating(false);
      return;
    }

    hydrationGuardRef.current = true;
    hydratedFromCacheRef.current = !isServerData;

    if (!sourceMindMap) {
      return;
    }

    const rawNodes = Array.isArray(sourceMindMap.nodes)
      ? (sourceMindMap.nodes as MindMapNode[])
      : [];

    let normalizedNodes: MindMapNode[];

    if (rawNodes.length === 0) {
      const fallbackWord =
        sourceMindMap.name?.trim() || initialWord || "Mind Map";
      const centerNode: MindMapNode = {
        id: crypto.randomUUID(),
        word: fallbackWord,
        x: 0,
        y: 0,
        isCenter: true,
      };
      normalizedNodes = [centerNode];
      setInitialWord(fallbackWord);
      window.dispatchEvent(new CustomEvent("mindmap-nodes-ready", { detail: { nodes: [centerNode] } }));
    } else {
      normalizedNodes = rawNodes.map((node) => {
        const parsedNode: MindMapNode = {
          ...node,
          id: String(node.id),
          word: String(node.word),
          x: typeof node.x === "number" ? node.x : Number(node.x) || 0,
          y: typeof node.y === "number" ? node.y : Number(node.y) || 0,
          parentId: node.parentId ? String(node.parentId) : undefined,
          isCenter: Boolean(node.isCenter),
        };
        return parsedNode;
      });

      let centerNode = normalizedNodes.find((n) => n.isCenter);

      if (!centerNode) {
        centerNode = { ...normalizedNodes[0], isCenter: true };
        normalizedNodes[0] = centerNode;
      }

      setInitialWord(centerNode.word);
    }

    const nextCenter = normalizedNodes.find((n) => n.isCenter) ?? normalizedNodes[0];

    window.dispatchEvent(new CustomEvent("mindmap-nodes-ready", { detail: { nodes: normalizedNodes } }));
    history.resetHistory(normalizedNodes);
    setCenterNodeId(nextCenter.id);
    setFocusNodeId(nextCenter.id);
      persistence.setIsSaved(true);
    setIsHydrating(false);
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("mindmap-nodes-ready"));
    });
  }, [
    mindMapId,
    persistence.existingMindMap,
    persistence.isLoading,
    persistence.setIsSaved,
    history.resetHistory,
  ]);

  // 在節點資料更新時，確保中心節點狀態始終存在
  useEffect(() => {
    if (!hasNodes) {
      if (centerNodeId) {
        setCenterNodeId(undefined);
      }
      if (focusNodeId) {
        setFocusNodeId(undefined);
      }
      return;
    }

    const centerNode = nodes.find((n) => n.isCenter) ?? nodes[0];

    if (centerNode && centerNodeId !== centerNode.id) {
      setCenterNodeId(centerNode.id);
    }

    if (!focusNodeId || !nodes.some((n) => n.id === focusNodeId)) {
      setFocusNodeId(centerNode.id);
    }
  }, [nodes, hasNodes, centerNodeId, focusNodeId]);

  // 這個 useEffect 已經被移除，因為 URL param effect 已經處理了新心智圖的創建
  // 保留這個註釋以說明邏輯已被合併到上面的 useEffect 中


  // Auto-save effect
  useEffect(() => {
    if (!mindMapId || isHydrating || history.historyLength === 0 || nodes.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      console.log("[MindMapEditor] Auto-saving...");
      persistence.save(nodes, true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [nodes, mindMapId, isHydrating]);

  // Undo
  const handleUndo = () => {
    const prevNodes = history.undo();
    // Undo 不會影響 centerNodeId 和 focusNodeId
  };

  // Redo
  const handleRedo = () => {
    const nextNodes = history.redo();
    // Redo 不會影響 centerNodeId 和 focusNodeId
  };

  // 選擇類別生成單字
  const handleCategorySelect = async (category: WordCategory) => {
    const centerNode = history.currentNodes.find((n) => n.id === centerNodeId);
    if (!centerNode) return;

    // 檢查節點數量上限
    if (history.currentNodes.length >= LIMITS.MAX_TOTAL_NODES) {
      return;
    }

    const newNodes = await generation.generateNodes(
      centerNode,
      category,
      history.currentNodes
    );
    
    history.updateNodesWithHistory(() => newNodes);
  };

  // 點擊節點
  const handleNodeClick = (nodeId: string) => {
    const node = history.currentNodes.find((n) => n.id === nodeId);
    if (!node) return;

    setCenterNodeId(nodeId);
    setFocusNodeId(nodeId);

    if (!node.isCenter) {
      history.updateNodesWithHistory((nodes) =>
        nodes.map((n) => ({
          ...n,
          isCenter: n.id === nodeId,
        })),
      );
    }
  };

  // 確認新增節點
  const handleConfirmAddNode = () => {
    const { addNodeDialog, newNodeWord } = nodeOps;
    if (!addNodeDialog.parentNodeId || !addNodeDialog.category || !newNodeWord.trim()) {
      return;
    }

    const { newNodes, newNodeId } = nodeOps.addNode(
      history.currentNodes,
      newNodeWord,
      addNodeDialog.parentNodeId,
      addNodeDialog.category
    );
    
    if (newNodeId) {
      history.updateNodesWithHistory(() => newNodes);
      setFocusNodeId(newNodeId);
      nodeOps.closeAddDialog();
    }
  };

  // 刪除節點（直接執行，不需要確認）
  const handleDeleteNode = (nodeId: string) => {
    const newNodes = nodeOps.deleteNode(history.currentNodes, nodeId);
    history.updateNodesWithHistory(() => newNodes);
  };

  // 節點拖曳結束
  const handleNodeDragEnd = (nodeId: string, x: number, y: number) => {
    const newNodes = nodeOps.updateNodePosition(history.currentNodes, nodeId, x, y);
    history.updateNodesWithHistory(() => newNodes);
  };

  // 編輯節點
  const handleNodeEdit = (nodeId: string) => {
    const node = history.currentNodes.find((n) => n.id === nodeId);
    if (node) {
      setEditingNodeId(nodeId);
      setEditNodeWord(node.word);
    }
  };

  // 確認編輯節點
  const handleConfirmEditNode = () => {
    if (!editingNodeId || !editNodeWord.trim()) return;
    
    const newNodes = nodeOps.updateNodeWord(history.currentNodes, editingNodeId, editNodeWord);
    history.updateNodesWithHistory(() => newNodes);
    setEditingNodeId(null);
    setEditNodeWord("");
  };

  // 儲存心智圖
  const handleSave = () => {
    if (history.currentNodes.length === 0) return;
    persistence.save(history.currentNodes);
    history.clearHistory(); // 清空歷史記錄（保留當前狀態）
  };


  // 建立字卡
  const handleCreateFlashcards = () => {
    persistence.createFlashcards(history.currentNodes);
  };

  // 匯出 PNG
  const handleExportPNG = () => {
    exportPNG.exportToPNG(history.currentNodes);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 工具列 */}
      {(history.currentNodes.length > 0 || history.historyLength > 1) && (
        <div className="sticky top-0 z-40 border-b px-6 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/mindmaps")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleUndo}
              disabled={history.currentNodes.length === 0 || !history.canUndo}
              data-testid="button-undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRedo}
              disabled={!history.canRedo}
              data-testid="button-redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="icon"
              onClick={handleSave}
              disabled={history.currentNodes.length === 0 || persistence.isSaving}
              data-testid="button-save"
            >
              {persistence.isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportPNG}
              disabled={history.currentNodes.length === 0}
              data-testid="button-download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <TokenDisplay variant="header" />
          </div>
        </div>
      )}
      
      {/* 心智圖編輯區 */}
      <CategoryButtons
        onSelectCategory={handleCategorySelect}
        disabled={!centerNodeId}
        loading={generation.isGenerating}
      />

      <div className="relative grow h-[calc(100vh-160px)]">
        {mindMapId && (persistence.isLoading || isHydrating) && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">
              {language === "en" ? "Loading mind map..." : "載入心智圖中..."}
            </p>
          </div>
        )}

        {generation.isGenerating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">{t.generating}</p>
              <p className="text-sm text-muted-foreground">{t.generatingHint}</p>
            </div>
          </div>
        )}


        <MindMapCanvas
          nodes={nodes}
          onNodeClick={handleNodeClick}
          onNodeDelete={handleDeleteNode}
          onNodeAdd={nodeOps.openAddDialog}
          onNodeDragEnd={handleNodeDragEnd}
          onNodeEdit={handleNodeEdit}
          centerNodeId={centerNodeId}
          focusNodeId={focusNodeId}
          maxNodes={LIMITS.MAX_TOTAL_NODES}
        />
      </div>

      {/* 編輯節點對話框 */}
      <Dialog open={!!editingNodeId} onOpenChange={(open) => !open && setEditingNodeId(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-center">
              {language === "en" ? "Edit Node" : "編輯節點"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={editNodeWord}
              onChange={(e) => setEditNodeWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editNodeWord.trim()) handleConfirmEditNode();
                if (e.key === "Escape") setEditingNodeId(null);
              }}
              autoFocus
              className="flex-1"
            />
            <Button
              onClick={handleConfirmEditNode}
              disabled={!editNodeWord.trim()}
              size="icon"
              className="shrink-0"
            >
              <Save className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新增節點對話框 */}
      <Dialog 
        open={nodeOps.addNodeDialog.open} 
        onOpenChange={(open) => !open && nodeOps.closeAddDialog()}
      >
        <DialogContent className="max-w-sm rounded-2xl p-6" data-testid="dialog-add-node">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-center">
              {language === "en" ? "Add New Node" : "新增節點"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-2">
            <Input
              value={nodeOps.newNodeWord}
              onChange={(e) => nodeOps.setNewNodeWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nodeOps.newNodeWord.trim()) handleConfirmAddNode();
                if (e.key === "Escape") nodeOps.closeAddDialog();
              }}
              placeholder={language === "en" ? "Enter a word..." : "輸入單字..."}
              autoFocus
              data-testid="input-add-node-word"
              className="flex-1"
            />
            <Button
              onClick={handleConfirmAddNode}
              disabled={!nodeOps.newNodeWord.trim()}
              data-testid="button-confirm-add-node"
              size="icon"
              className="shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 儲存成功確認對話框 */}
      <AlertDialog open={persistence.showSaveConfirmDialog} onOpenChange={persistence.setShowSaveConfirmDialog}>
        <AlertDialogContent data-testid="dialog-save-confirm" className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "en" ? "Saved successfully!" : "儲存成功！"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "en" 
                ? "Your mind map has been saved. Would you also like to save these words as flashcards?" 
                : "您的心智圖已儲存。是否也要將這些單字儲存為字卡？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-flashcards">
              {language === "en" ? "No, thanks" : "不用了"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateFlashcards}
              disabled={persistence.isCreatingFlashcards}
              data-testid="button-confirm-flashcards"
            >
              {persistence.isCreatingFlashcards ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {language === "en" ? "Creating..." : "建立中..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === "en" ? "Yes, create flashcards" : "是的，建立字卡"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

