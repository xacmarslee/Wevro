/**
 * Mind Map Editor Page
 * 
 * 心智圖編輯器主頁面 - 協調所有 hooks 和元件
 */

import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { type MindMapNode, type WordCategory } from "@shared/schema";
import { CategoryButtons } from "@/components/CategoryButtons";
import { MindMapCanvas } from "@/components/MindMapCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { Loader2, Undo2, Redo2, Save, Download, Sparkles, Plus } from "lucide-react";
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

export default function MindMapEditor() {
  // 路由參數
  const [, params] = useRoute("/mindmap/:id");
  const [, setLocation] = useLocation();
  const mindMapId = params?.id !== "new" ? params?.id : undefined;
  
  // 語言和翻譯
  const { language } = useLanguage();
  const t = useTranslation(language);
  
  // 中心節點和聚焦節點
  const [centerNodeId, setCenterNodeId] = useState<string | undefined>();
  const [focusNodeId, setFocusNodeId] = useState<string | undefined>();
  const [initialWord, setInitialWord] = useState("");

  // 使用重構後的 hooks
  const history = useMindMapHistory();
  const nodeOps = useMindMapNodes();
  const generation = useMindMapGeneration();
  const persistence = useMindMapPersistence(mindMapId);
  const exportPNG = useMindMapExport();

  // 從 URL 參數獲取初始單字（建立新心智圖時）
  useEffect(() => {
    if (!mindMapId) {
      const urlParams = new URLSearchParams(window.location.search);
      const wordParam = urlParams.get('word');
      if (wordParam) {
        setInitialWord(wordParam);
        // 自動開始
        setTimeout(() => {
          const newNode: MindMapNode = {
            id: crypto.randomUUID(),
            word: wordParam.trim(),
            x: 0,
            y: 0,
            isCenter: true,
          };
          history.updateNodesWithHistory(() => [newNode]);
          setCenterNodeId(newNode.id);
        }, 100);
      } else {
        // 沒有初始單字，返回心智圖列表
        setLocation('/mindmaps');
      }
    }
  }, [mindMapId, setLocation]);
  
  // 載入現有心智圖
  useEffect(() => {
    if (persistence.existingMindMap?.nodes && Array.isArray(persistence.existingMindMap.nodes)) {
      const loadedNodes = persistence.existingMindMap.nodes as MindMapNode[];
      history.resetHistory(loadedNodes);
      const centerNode = loadedNodes.find((n) => n.isCenter);
      if (centerNode) {
        setCenterNodeId(centerNode.id);
      }
      persistence.setIsSaved(true);
    }
  }, [persistence.existingMindMap]);


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
    setCenterNodeId(nodeId);
    setFocusNodeId(nodeId);
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
    <div className="flex flex-col h-full">
      {/* 工具列 */}
      {(history.currentNodes.length > 0 || history.historyLength > 1) && (
        <div className="border-b px-6 py-3 flex items-center justify-between bg-card/50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleUndo}
              disabled={!history.canUndo}
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
          </div>
        </div>
      )}
      
      {/* 心智圖編輯區 */}
      <CategoryButtons
        onSelectCategory={handleCategorySelect}
        disabled={!centerNodeId}
        loading={generation.isGenerating}
      />

      <div className="flex-1 relative">
        {generation.isGenerating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">{t.generating}</p>
            </div>
          </div>
        )}

        <MindMapCanvas
          nodes={history.currentNodes}
          onNodeClick={handleNodeClick}
          onNodeDelete={handleDeleteNode}
          onNodeAdd={nodeOps.openAddDialog}
          centerNodeId={centerNodeId}
          focusNodeId={focusNodeId}
          maxNodes={LIMITS.MAX_TOTAL_NODES}
        />
      </div>

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

